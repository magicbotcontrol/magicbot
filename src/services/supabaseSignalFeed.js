import { supabase, supabaseEnabled } from '../lib/supabase/client';

function assertSupabase() {
  if (!supabaseEnabled || !supabase) {
    throw new Error('Supabase is not configured.');
  }
}

export async function getDailySignalFeedByDate(listDate) {
  assertSupabase();

  const { data: feed, error: feedError } = await supabase
    .from('daily_signal_feeds')
    .select('*')
    .eq('list_date', listDate)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (feedError) throw feedError;
  if (!feed) return { feed: null, items: [] };

  const { data: items, error: itemsError } = await supabase
    .from('daily_signal_feed_items')
    .select('*')
    .eq('feed_id', feed.id)
    .order('line_number', { ascending: true });

  if (itemsError) throw itemsError;
  return { feed, items: items || [] };
}

export async function listDailySignalFeedsByDate(listDate, marketCode) {
  assertSupabase();
  if (!listDate || !marketCode) return [];

  const { data, error } = await supabase
    .from('daily_signal_feeds')
    .select('id, list_date, market_code, asset, updated_at')
    .eq('list_date', listDate)
    .eq('market_code', marketCode)
    .order('asset', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getDailySignalFeed(listDate, marketCode, asset) {
  assertSupabase();
  if (!listDate || !marketCode || !asset) return { feed: null, items: [] };

  const { data: feed, error: feedError } = await supabase
    .from('daily_signal_feeds')
    .select('*')
    .eq('list_date', listDate)
    .eq('market_code', marketCode)
    .eq('asset', asset)
    .maybeSingle();

  if (feedError) throw feedError;
  if (!feed) return { feed: null, items: [] };

  const { data: items, error: itemsError } = await supabase
    .from('daily_signal_feed_items')
    .select('*')
    .eq('feed_id', feed.id)
    .order('line_number', { ascending: true });

  if (itemsError) throw itemsError;
  return { feed, items: items || [] };
}
