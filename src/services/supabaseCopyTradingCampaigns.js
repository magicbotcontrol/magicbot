import { supabase, supabaseEnabled } from '../lib/supabase/client';

export async function listCopyTradingCampaigns() {
  if (!supabaseEnabled || !supabase) return { data: [], error: null };
  return supabase
    .from('copy_trading_campaigns')
    .select('code, trial_days, is_active, note, created_at, updated_at')
    .order('created_at', { ascending: false });
}

export async function upsertCopyTradingCampaign(payload) {
  if (!supabaseEnabled || !supabase) return { data: null, error: new Error('Supabase unavailable') };
  return supabase
    .from('copy_trading_campaigns')
    .upsert(payload, { onConflict: 'code' })
    .select()
    .maybeSingle();
}

export async function deleteCopyTradingCampaign(code) {
  if (!supabaseEnabled || !supabase) return { error: new Error('Supabase unavailable') };
  return supabase
    .from('copy_trading_campaigns')
    .delete()
    .eq('code', code);
}
