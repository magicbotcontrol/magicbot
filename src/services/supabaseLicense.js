import { supabase, supabaseEnabled } from '../lib/supabase/client';

function assertSupabase() {
  if (!supabaseEnabled || !supabase) {
    throw new Error('Supabase is not configured.');
  }
}

function getRemainingDays(expiresAt) {
  if (!expiresAt) return 0;
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function resolveLicenseStatus(row) {
  if (!row?.expires_at) return 'expired';
  if (getRemainingDays(row.expires_at) <= 0) return 'expired';
  return row.status || 'trial';
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

export async function extendWorkspaceLicense(workspaceId, { days, planName }) {
  assertSupabase();

  const { data: existing, error: existingError } = await supabase
    .from('workspace_licenses')
    .select('*')
    .eq('workspace_id', workspaceId)
    .single();

  if (existingError) throw existingError;

  const now = new Date();
  const currentExpiry = existing?.expires_at ? new Date(existing.expires_at) : now;
  const baseDate = currentExpiry > now ? currentExpiry : now;
  const nextExpiry = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('workspace_licenses')
    .upsert({
      workspace_id: workspaceId,
      status: 'active',
      access_type: 'subscription',
      plan_name: planName,
      granted_days: Number(existing?.granted_days || 0) + days,
      started_at: existing?.started_at || now.toISOString(),
      expires_at: nextExpiry.toISOString(),
      last_payment_at: now.toISOString()
    }, { onConflict: 'workspace_id' })
    .select('*')
    .single();

  if (error) throw error;

  const userResult = await supabase.auth.getUser();
  const ownerUserId = userResult.data.user?.id;
  const eventPayload = {
    workspace_id: workspaceId,
    owner_user_id: ownerUserId,
    created_by: ownerUserId,
    event_type: 'renewal',
    access_type: 'subscription',
    status_after: 'active',
    plan_name: planName,
    days_delta: days,
    expires_at: data.expires_at,
    note: 'Renovacao realizada pela area de pagamento'
  };

  const eventResult = await supabase
    .from('workspace_license_events')
    .insert(eventPayload);

  if (eventResult.error) throw eventResult.error;

  return mapLicenseRow(data);
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
