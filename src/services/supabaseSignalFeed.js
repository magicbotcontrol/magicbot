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

  if (error) {
    // #region debug-point B:list-daily-feeds-error
    fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "broker-balance-signals", runId: "pre", hypothesisId: "B", location: "supabaseSignalFeed.js:listDailySignalFeedsByDate", msg: "[DEBUG] daily_signal_feeds list failed", data: { listDate, marketCode, errorMessage: error?.message || null, errorCode: error?.code || null, errorDetails: error?.details || null }, ts: Date.now() }) }).catch(() => {});
    // #endregion
    throw error;
  }

  // #region debug-point C:list-daily-feeds-ok
  fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "broker-balance-signals", runId: "pre", hypothesisId: "C", location: "supabaseSignalFeed.js:listDailySignalFeedsByDate", msg: "[DEBUG] daily_signal_feeds list ok", data: { listDate, marketCode, count: (data || []).length, assets: (data || []).slice(0, 6).map((f) => f.asset) }, ts: Date.now() }) }).catch(() => {});
  // #endregion
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

  if (feedError) {
    // #region debug-point B:get-daily-feed-error
    fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "broker-balance-signals", runId: "pre", hypothesisId: "B", location: "supabaseSignalFeed.js:getDailySignalFeed", msg: "[DEBUG] daily_signal_feeds get failed", data: { listDate, marketCode, asset, errorMessage: feedError?.message || null, errorCode: feedError?.code || null, errorDetails: feedError?.details || null }, ts: Date.now() }) }).catch(() => {});
    // #endregion
    throw feedError;
  }
  if (!feed) return { feed: null, items: [] };

  const { data: items, error: itemsError } = await supabase
    .from('daily_signal_feed_items')
    .select('*')
    .eq('feed_id', feed.id)
    .order('line_number', { ascending: true });

  if (itemsError) {
    // #region debug-point B:get-daily-items-error
    fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "broker-balance-signals", runId: "pre", hypothesisId: "B", location: "supabaseSignalFeed.js:getDailySignalFeedItems", msg: "[DEBUG] daily_signal_feed_items get failed", data: { feedId: feed.id, listDate, marketCode, asset, errorMessage: itemsError?.message || null, errorCode: itemsError?.code || null, errorDetails: itemsError?.details || null }, ts: Date.now() }) }).catch(() => {});
    // #endregion
    throw itemsError;
  }

  // #region debug-point C:get-daily-feed-ok
  fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "broker-balance-signals", runId: "pre", hypothesisId: "C", location: "supabaseSignalFeed.js:getDailySignalFeed", msg: "[DEBUG] daily_signal_feed loaded", data: { feedId: feed.id, listDate, marketCode, asset, itemsCount: (items || []).length }, ts: Date.now() }) }).catch(() => {});
  // #endregion
  return { feed, items: items || [] };
}
