import { supabase, supabaseEnabled } from '../lib/supabase/client';

function assertSupabase() {
  if (!supabaseEnabled || !supabase) {
    throw new Error('Supabase is not configured.');
  }
}

function parseSignalLines(rawText) {
  return String(rawText || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const parts = line.split(';').map((part) => part.trim());
      if (parts.length < 4) {
        throw new Error(`Linha ${index + 1} inválida.`);
      }

      const [timeframe, asset, timeOrRate, action] = parts;
      if (!/^M[1-9][0-5]?$/i.test(timeframe)) {
        throw new Error(`Timeframe inválido na linha ${index + 1}.`);
      }
      if (asset.length < 6) {
        throw new Error(`Ativo inválido na linha ${index + 1}.`);
      }
      if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeOrRate) && Number.isNaN(Number.parseFloat(timeOrRate))) {
        throw new Error(`Hora/Taxa inválida na linha ${index + 1}.`);
      }
      if (!/^(CALL|PUT)$/i.test(action)) {
        throw new Error(`Ação inválida na linha ${index + 1}.`);
      }

      return {
        line_number: index + 1,
        raw: line,
        timeframe: timeframe.toUpperCase(),
        asset: asset.toUpperCase(),
        time_or_rate: timeOrRate,
        action: action.toUpperCase()
      };
    });
}

export async function getAdminDailySignalFeed(listDate) {
  assertSupabase();

  const { data: feed, error: feedError } = await supabase
    .from('daily_signal_feeds')
    .select('*')
    .eq('list_date', listDate)
    .maybeSingle();

  if (feedError) throw feedError;
  if (!feed) {
    return {
      feed: null,
      items: [],
      rawText: ''
    };
  }

  const { data: items, error: itemsError } = await supabase
    .from('daily_signal_feed_items')
    .select('*')
    .eq('feed_id', feed.id)
    .order('line_number', { ascending: true });

  if (itemsError) throw itemsError;

  return {
    feed,
    items: items || [],
    rawText: (items || []).map((item) => item.raw).join('\n')
  };
}

export async function saveAdminDailySignalFeed(listDate, rawText, note = '') {
  assertSupabase();
  const items = parseSignalLines(rawText);

  const { data: feed, error: feedError } = await supabase
    .from('daily_signal_feeds')
    .upsert({
      list_date: listDate,
      note
    }, { onConflict: 'list_date' })
    .select()
    .single();

  if (feedError) throw feedError;

  const { error: deleteError } = await supabase
    .from('daily_signal_feed_items')
    .delete()
    .eq('feed_id', feed.id);

  if (deleteError) throw deleteError;

  const rows = items.map((item) => ({
    feed_id: feed.id,
    ...item
  }));

  if (rows.length) {
    const { error: insertError } = await supabase
      .from('daily_signal_feed_items')
      .insert(rows);

    if (insertError) throw insertError;
  }

  return {
    feed,
    items
  };
}

