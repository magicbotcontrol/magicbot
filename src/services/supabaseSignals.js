import { supabase, supabaseEnabled } from '../lib/supabase/client';
import { buildLiveOperationsFromSignals } from '../utils/signalParser';

function assertSupabase() {
  if (!supabaseEnabled || !supabase) {
    throw new Error('Supabase is not configured.');
  }
}

function mapLiveOperation(row) {
  return {
    time: row.operation_time,
    asset: row.asset,
    tf: row.tf,
    dir: row.dir,
    prob: row.prob,
    status: row.status,
    recovery: row.recovery,
    entry: Number(row.entry_amount || 0),
    option: row.option_kind,
    pl: Number(row.profit_loss || 0),
    cancelled: row.cancelled
  };
}

export async function getSignalsByDate(workspaceId, listDate) {
  assertSupabase();

  const { data: signalList, error: listError } = await supabase
    .from('signal_lists')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('list_date', listDate)
    .maybeSingle();

  if (listError) throw listError;

  if (!signalList) {
    return { signalList: null, liveOperations: [] };
  }

  const { data: liveOperations, error: liveError } = await supabase
    .from('live_operations')
    .select('*')
    .eq('signal_list_id', signalList.id)
    .order('created_at', { ascending: true });

  if (liveError) throw liveError;

  return {
    signalList,
    liveOperations: (liveOperations || []).map(mapLiveOperation)
  };
}

export async function saveSignalList({ workspaceId, listDate, signalsText, parsedSignals, entryValue }) {
  assertSupabase();

  const totalCount = parsedSignals.length;
  const validSignals = parsedSignals.filter((signal) => signal.isValid && !signal.isIgnored);
  const validCount = validSignals.length;

  // #region debug-point B:save-signal-list-start
  fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "broker-balance-signals", runId: "pre", hypothesisId: "B", location: "supabaseSignals.js:saveSignalList", msg: "[DEBUG] saveSignalList start", data: { workspaceId, listDate, totalCount, validCount, entryValue: Number(entryValue || 0) || 0, rawLength: String(signalsText || "").length }, ts: Date.now() }) }).catch(() => {});
  // #endregion

  const listResult = await supabase
    .from('signal_lists')
    .upsert({
      workspace_id: workspaceId,
      list_date: listDate,
      raw_text: signalsText.trim(),
      total_count: totalCount,
      valid_count: validCount
    }, { onConflict: 'workspace_id,list_date' })
    .select('*')
    .single();

  if (listResult.error) {
    // #region debug-point B:save-signal-list-error
    fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "broker-balance-signals", runId: "pre", hypothesisId: "B", location: "supabaseSignals.js:signal_lists", msg: "[DEBUG] signal_lists upsert failed", data: { workspaceId, listDate, errorMessage: listResult.error?.message || null, errorCode: listResult.error?.code || null, errorDetails: listResult.error?.details || null, errorHint: listResult.error?.hint || null }, ts: Date.now() }) }).catch(() => {});
    // #endregion
    throw listResult.error;
  }

  const signalList = listResult.data;

  const { error: deleteItemsError } = await supabase.from('signal_items').delete().eq('signal_list_id', signalList.id);
  if (deleteItemsError) {
    // #region debug-point B:delete-items-error
    fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "broker-balance-signals", runId: "pre", hypothesisId: "B", location: "supabaseSignals.js:signal_items_delete", msg: "[DEBUG] signal_items delete failed", data: { signalListId: signalList.id, errorMessage: deleteItemsError?.message || null, errorCode: deleteItemsError?.code || null }, ts: Date.now() }) }).catch(() => {});
    // #endregion
    throw deleteItemsError;
  }

  const itemsPayload = parsedSignals.map((signal, index) => ({
    signal_list_id: signalList.id,
    line_number: index + 1,
    raw: signal.raw,
    timeframe: signal.timeframe,
    asset: signal.asset,
    time_or_rate: signal.timeOrRate,
    action: signal.action,
    is_valid: signal.isValid,
    error_message: signal.error
  }));

  const itemsResult = itemsPayload.length
    ? await supabase.from('signal_items').insert(itemsPayload).select('id, line_number')
    : { data: [], error: null };

  if (itemsResult.error) {
    // #region debug-point B:insert-items-error
    fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "broker-balance-signals", runId: "pre", hypothesisId: "B", location: "supabaseSignals.js:signal_items_insert", msg: "[DEBUG] signal_items insert failed", data: { signalListId: signalList.id, itemsCount: itemsPayload.length, errorMessage: itemsResult.error?.message || null, errorCode: itemsResult.error?.code || null, errorDetails: itemsResult.error?.details || null }, ts: Date.now() }) }).catch(() => {});
    // #endregion
    throw itemsResult.error;
  }

  const signalItemMap = new Map((itemsResult.data || []).map((item) => [item.line_number, item.id]));

  const { error: deleteLiveError } = await supabase.from('live_operations').delete().eq('signal_list_id', signalList.id);
  if (deleteLiveError) {
    // #region debug-point B:delete-live-error
    fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "broker-balance-signals", runId: "pre", hypothesisId: "B", location: "supabaseSignals.js:live_operations_delete", msg: "[DEBUG] live_operations delete failed", data: { signalListId: signalList.id, errorMessage: deleteLiveError?.message || null, errorCode: deleteLiveError?.code || null }, ts: Date.now() }) }).catch(() => {});
    // #endregion
    throw deleteLiveError;
  }

  const operationsPayload = buildLiveOperationsFromSignals(parsedSignals, entryValue).map((operation) => ({
    workspace_id: workspaceId,
    signal_list_id: signalList.id,
    signal_item_id: signalItemMap.get(operation.line_number) || null,
    ...operation
  }));

  const liveResult = operationsPayload.length
    ? await supabase.from('live_operations').insert(operationsPayload).select('*')
    : { data: [], error: null };

  if (liveResult.error) {
    // #region debug-point B:insert-live-error
    fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "broker-balance-signals", runId: "pre", hypothesisId: "B", location: "supabaseSignals.js:live_operations_insert", msg: "[DEBUG] live_operations insert failed", data: { signalListId: signalList.id, operationsCount: operationsPayload.length, errorMessage: liveResult.error?.message || null, errorCode: liveResult.error?.code || null, errorDetails: liveResult.error?.details || null }, ts: Date.now() }) }).catch(() => {});
    // #endregion
    throw liveResult.error;
  }

  // #region debug-point B:save-signal-list-ok
  fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "broker-balance-signals", runId: "pre", hypothesisId: "B", location: "supabaseSignals.js:saveSignalList", msg: "[DEBUG] saveSignalList ok", data: { signalListId: signalList.id, itemsCount: itemsPayload.length, operationsCount: operationsPayload.length }, ts: Date.now() }) }).catch(() => {});
  // #endregion

  return {
    signalList,
    liveOperations: (liveResult.data || []).map(mapLiveOperation)
  };
}
