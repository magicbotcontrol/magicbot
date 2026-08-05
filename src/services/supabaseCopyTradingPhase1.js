import { supabase, supabaseEnabled } from '../lib/supabase/client';

function assertSupabase() {
  if (!supabaseEnabled || !supabase) {
    throw new Error('Supabase is not configured.');
  }
}

export async function getCopyTradingIqAccount(workspaceId) {
  assertSupabase();
  if (!workspaceId) return null;

  const { data, error } = await supabase
    .from('copy_trading_iq_accounts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export async function submitMyCopyTradingIqId(iqId) {
  assertSupabase();
  const { data, error } = await supabase.rpc('submit_my_copy_trading_iq_id', {
    p_iq_id: iqId
  });
  if (error) throw error;
  return data || null;
}

export async function getCopyTradingAccess() {
  assertSupabase();

  const [content, operational] = await Promise.all([
    supabase.rpc('has_copy_trading_content_access'),
    supabase.rpc('has_copy_trading_operational_access')
  ]);

  if (content.error) throw content.error;
  if (operational.error) throw operational.error;

  return {
    canViewContent: Boolean(content.data),
    canOperateCopy: Boolean(operational.data)
  };
}

export async function getCopyTradingVideos(segment) {
  assertSupabase();
  if (!segment) return [];

  const { data, error } = await supabase
    .from('copy_trading_video_items')
    .select('*')
    .eq('segment', segment)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function getCopyTradingVideosAdmin() {
  assertSupabase();

  const { data, error } = await supabase
    .from('copy_trading_video_items')
    .select('*')
    .order('segment', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function createCopyTradingVideoItem(payload) {
  assertSupabase();
  const { data, error } = await supabase
    .from('copy_trading_video_items')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateCopyTradingVideoItem(id, patch) {
  assertSupabase();
  if (!id) throw new Error('Missing video item id.');

  const { data, error } = await supabase
    .from('copy_trading_video_items')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

