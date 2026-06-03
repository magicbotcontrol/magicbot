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

