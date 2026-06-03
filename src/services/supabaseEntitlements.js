import { supabase, supabaseEnabled } from '../lib/supabase/client';

function assertSupabase() {
  if (!supabaseEnabled || !supabase) {
    throw new Error('Supabase is not configured.');
  }
}

function mapEntitlement(row) {
  if (!row) {
    return {
      status: 'inactive',
      expiresAt: null,
      remainingDays: 0
    };
  }

  const expiresAt = row.expires_at ? new Date(row.expires_at) : null;
  const diffMs = expiresAt ? expiresAt.getTime() - Date.now() : 0;
  const remainingDays = expiresAt && diffMs > 0 ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : 0;

  return {
    status: row.status || 'inactive',
    expiresAt: row.expires_at || null,
    remainingDays
  };
}

export async function getWorkspaceSignalsEntitlement(workspaceId) {
  assertSupabase();
  if (!workspaceId) return mapEntitlement(null);

  const { data, error } = await supabase
    .from('workspace_entitlements')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('product_code', 'signals_list')
    .maybeSingle();

  if (error) throw error;
  return mapEntitlement(data);
}

export async function adminGrantSignalsEntitlement(workspaceId, days, note) {
  assertSupabase();
  const result = await supabase.rpc('grant_signals_list_access', {
    p_workspace_id: workspaceId,
    p_days: days,
    p_note: note || ''
  });

  if (result.error) throw result.error;
  return result.data;
}

export async function adminRevokeSignalsEntitlement(workspaceId, note) {
  assertSupabase();
  const result = await supabase.rpc('revoke_signals_list_access', {
    p_workspace_id: workspaceId,
    p_note: note || ''
  });

  if (result.error) throw result.error;
  return result.data;
}

