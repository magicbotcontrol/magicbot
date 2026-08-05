import { supabase, supabaseEnabled } from '../lib/supabase/client';

const MEMBERSHIP_GRACE_DAYS = 3;

function assertSupabase() {
  if (!supabaseEnabled || !supabase) {
    throw new Error('Supabase is not configured.');
  }
}

function getRemainingDays(expiresAt) {
  if (!expiresAt) return 0;
  const base = new Date(expiresAt).getTime();
  const diffMs = base + MEMBERSHIP_GRACE_DAYS * 24 * 60 * 60 * 1000 - Date.now();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function resolveLicenseStatus(row) {
  if (!row?.expires_at) return 'expired';
  if (getRemainingDays(row.expires_at) <= 0) return 'expired';
  return row.status || 'active';
}

function formatUsd(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(Number(value || 0));
}

async function getWorkspaceLicenseRecord(workspaceId) {
  const { data, error } = await supabase
    .from('workspace_licenses')
    .select('*')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function renewWorkspaceLicense(workspaceId, existing, { days, planName, accessType = 'subscription', status = 'active' }) {
  const now = new Date();
  const currentExpiry = existing?.expires_at ? new Date(existing.expires_at) : now;
  const baseDate = currentExpiry > now ? currentExpiry : now;
  const nextExpiry = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('workspace_licenses')
    .upsert({
      workspace_id: workspaceId,
      status,
      access_type: accessType,
      plan_name: planName,
      granted_days: Number(existing?.granted_days || 0) + days,
      started_at: existing?.started_at || now.toISOString(),
      expires_at: nextExpiry.toISOString(),
      last_payment_at: now.toISOString()
    }, { onConflict: 'workspace_id' })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

async function insertWorkspaceLicenseEvent(eventPayload) {
  const eventResult = await supabase
    .from('workspace_license_events')
    .insert(eventPayload);

  if (eventResult.error) throw eventResult.error;
}

function buildChargeFields({ amountUsd, bankrollUsd, tierId, tierLabel, manualOverride }) {
  return {
    charged_amount_usd: Number.isFinite(Number(amountUsd)) && Number(amountUsd) > 0 ? Number(amountUsd) : null,
    bankroll_usd: Number.isFinite(Number(bankrollUsd)) && Number(bankrollUsd) > 0 ? Number(bankrollUsd) : null,
    pricing_tier_id: tierId || null,
    pricing_tier_label: tierLabel || null,
    manual_override: Boolean(manualOverride)
  };
}

export function mapLicenseRow(row) {
  const remainingDays = getRemainingDays(row?.expires_at);

  return {
    status: resolveLicenseStatus(row),
    accessType: row?.access_type || (row?.plan_name === 'trial' ? 'trial' : 'subscription'),
    planName: row?.plan_name || 'trial',
    grantedDays: Number(row?.granted_days || 0),
    remainingDays,
    expiresAt: row?.expires_at || null,
    expirationDate: row?.expires_at ? new Date(row.expires_at).toLocaleDateString('pt-BR') : '-',
    startedAt: row?.started_at || null,
    lastPaymentAt: row?.last_payment_at || null
  };
}

export async function getWorkspaceLicense(workspaceId) {
  assertSupabase();

  const { data, error } = await supabase
    .from('workspace_licenses')
    .select('*')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (error) throw error;

  return mapLicenseRow(data);
}

export async function extendWorkspaceLicense(workspaceId, {
  days,
  planName,
  amountUsd,
  bankrollUsd,
  tierId,
  tierLabel,
  manualOverride = false
}) {
  assertSupabase();

  const existing = await getWorkspaceLicenseRecord(workspaceId);
  const data = await renewWorkspaceLicense(workspaceId, existing, { days, planName });

  const userResult = await supabase.auth.getUser();
  const ownerUserId = userResult.data.user?.id;
  await insertWorkspaceLicenseEvent({
    workspace_id: workspaceId,
    owner_user_id: ownerUserId,
    created_by: ownerUserId,
    event_type: 'renewal',
    access_type: 'subscription',
    status_after: 'active',
    plan_name: planName,
    days_delta: days,
    expires_at: data.expires_at,
    note: 'Renovacao realizada pela area de pagamento',
    ...buildChargeFields({ amountUsd, bankrollUsd, tierId, tierLabel, manualOverride })
  });

  return mapLicenseRow(data);
}

export async function adminChargeUserMonthlyMembership(ownerUserId, {
  amount,
  note,
  days = 30,
  bankrollUsd,
  suggestedAmount,
  tierId,
  tierLabel
}) {
  assertSupabase();

  const normalizedAmount = Number(amount);
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    throw new Error('Informe um valor de cobranca valido.');
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from('app_workspaces')
    .select('id, name')
    .eq('owner_user_id', ownerUserId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (workspaceError) throw workspaceError;
  if (!workspace?.id) {
    throw new Error('Nenhum workspace encontrado para este participante.');
  }

  const existing = await getWorkspaceLicenseRecord(workspace.id);
  const normalizedSuggested = Number(suggestedAmount);
  const hasSuggestedAmount = Number.isFinite(normalizedSuggested) && normalizedSuggested > 0;
  const hasManualOverride = !hasSuggestedAmount || Math.abs(normalizedAmount - normalizedSuggested) > 0.009;
  const planName = hasManualOverride
    ? 'membership-monthly-admin-custom'
    : `membership-monthly-${tierId || 'starter'}`;
  const data = await renewWorkspaceLicense(workspace.id, existing, { days, planName });
  const userResult = await supabase.auth.getUser();
  const adminUserId = userResult.data.user?.id || null;

  const noteParts = [
    `Cobranca administrativa registrada em ${formatUsd(normalizedAmount)} para ${days} dias.`
  ];

  if (Number.isFinite(Number(bankrollUsd)) && Number(bankrollUsd) > 0) {
    noteParts.push(`Banca considerada: ${formatUsd(bankrollUsd)}${tierLabel ? ` (${tierLabel})` : ''}.`);
  } else if (hasSuggestedAmount) {
    noteParts.push(`Sem banca detectada. Faixa inicial sugerida: ${formatUsd(normalizedSuggested)}.`);
  }

  noteParts.push(hasManualOverride ? 'Override manual aplicado pelo admin.' : 'Valor seguindo a tabela mensal.');

  if (note) {
    noteParts.push(`Obs: ${note}`);
  }

  await insertWorkspaceLicenseEvent({
    workspace_id: workspace.id,
    owner_user_id: ownerUserId,
    created_by: adminUserId,
    event_type: 'renewal',
    access_type: 'subscription',
    status_after: 'active',
    plan_name: planName,
    days_delta: days,
    expires_at: data.expires_at,
    note: noteParts.join(' '),
    ...buildChargeFields({
      amountUsd: normalizedAmount,
      bankrollUsd,
      tierId,
      tierLabel,
      manualOverride: hasManualOverride
    })
  });

  return {
    workspace_id: workspace.id,
    workspace_name: workspace.name || '',
    charged_amount: normalizedAmount,
    license: mapLicenseRow(data)
  };
}

export async function grantUserMonthlyWaiver(ownerUserId, note) {
  assertSupabase();

  const result = await supabase.rpc('grant_user_monthly_waiver', {
    p_owner_user_id: ownerUserId,
    p_note: note || 'Isencao mensal liberada pelo admin'
  });

  if (result.error) throw result.error;
  return result.data;
}
