import { supabase, supabaseEnabled } from '../lib/supabase/client';

function assertSupabase() {
  if (!supabaseEnabled || !supabase) {
    throw new Error('Supabase is not configured.');
  }
}

function isOptionalBlueprintError(error) {
  const code = String(error?.code || '').toUpperCase();
  const text = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
  return (
    ['42P01', '42703', 'PGRST204', 'PGRST205'].includes(code)
    || text.includes('does not exist')
    || text.includes('schema cache')
    || text.includes('could not find')
  );
}

async function resolveOptionalQuery(queryPromise, fallbackValue) {
  const { data, error } = await queryPromise;
  if (error) {
    if (isOptionalBlueprintError(error)) return fallbackValue;
    throw error;
  }
  return data ?? fallbackValue;
}

export async function ensureBotInstances(workspaceId) {
  assertSupabase();
  const { data, error } = await supabase.rpc('ensure_workspace_bot_instances', { p_workspace_id: workspaceId });
  if (error) throw error;
  return data || [];
}

export async function clearExpiredTradeJobs({ workspaceId, slot, listDate, marketCode, asset }) {
  assertSupabase();
  const payload = {
    p_workspace_id: workspaceId,
    p_slot: Number(slot),
    p_list_date: listDate || null,
    p_market_code: marketCode || null,
    p_asset: asset || null
  };
  const { data, error } = await supabase.rpc('clear_expired_trade_jobs', payload);
  if (error) throw error;
  return Number(data || 0);
}

export async function requeueFailedTradeJobs({ workspaceId, slot, listDate, marketCode, asset, reason = 'retry_manual', minMinutesLeft = 0 }) {
  assertSupabase();
  const payload = {
    p_workspace_id: workspaceId,
    p_slot: Number(slot),
    p_list_date: listDate || null,
    p_market_code: marketCode || null,
    p_asset: asset || null,
    p_reason: reason,
    p_min_minutes_left: Math.max(Number(minMinutesLeft || 0) || 0, 0)
  };
  const tryV2 = await supabase.rpc('requeue_failed_trade_jobs_with_reason_v2', payload);
  if (!tryV2.error) return Number(tryV2.data || 0);

  const legacyWithReason = {
    p_workspace_id: payload.p_workspace_id,
    p_slot: payload.p_slot,
    p_list_date: payload.p_list_date,
    p_market_code: payload.p_market_code,
    p_asset: payload.p_asset,
    p_reason: payload.p_reason
  };
  const tryV1 = await supabase.rpc('requeue_failed_trade_jobs_with_reason', legacyWithReason);
  if (!tryV1.error) return Number(tryV1.data || 0);

  const legacyPayload = {
    p_workspace_id: payload.p_workspace_id,
    p_slot: payload.p_slot,
    p_list_date: payload.p_list_date,
    p_market_code: payload.p_market_code,
    p_asset: payload.p_asset
  };
  const legacy = await supabase.rpc('requeue_failed_trade_jobs', legacyPayload);
  if (legacy.error) throw legacy.error;
  return Number(legacy.data || 0);
}

export async function listBotInstances(workspaceId) {
  assertSupabase();
  const { data, error } = await supabase
    .from('workspace_bot_instances')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('slot', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function updateBotInstanceTolerance({ workspaceId, slot, executionToleranceSeconds }) {
  assertSupabase();
  const bots = await listBotInstances(workspaceId);
  const bot = bots.find((b) => Number(b.slot) === Number(slot));
  if (!bot?.id) {
    throw new Error('Bot slot not found.');
  }

  const nextSeconds = Math.max(Math.min(Number(executionToleranceSeconds || 0) || 0, 30), 0);
  const { data, error } = await supabase
    .from('workspace_bot_instances')
    .update({ execution_tolerance_seconds: nextSeconds })
    .eq('id', bot.id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateBotInstanceExecutionConfig({
  workspaceId,
  slot,
  accountType,
  defaultOrderAmount
}) {
  assertSupabase();
  const bots = await listBotInstances(workspaceId);
  const bot = bots.find((b) => Number(b.slot) === Number(slot));
  if (!bot?.id) {
    throw new Error('Bot slot not found.');
  }

  const normalizedAccountType = String(accountType || '').trim() === 'Real' ? 'Real' : 'Demo';
  const parsedAmount = Number(defaultOrderAmount);
  const normalizedDefaultOrderAmount = Number.isFinite(parsedAmount) && parsedAmount > 0
    ? Number(parsedAmount.toFixed(2))
    : null;

  const { data, error } = await supabase
    .from('workspace_bot_instances')
    .update({
      account_type: normalizedAccountType,
      default_order_amount: normalizedDefaultOrderAmount
    })
    .eq('id', bot.id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function confirmBotInstanceOperationalAccount({ workspaceId, slot, accountType }) {
  assertSupabase();
  const normalizedAccountType = String(accountType || '').trim() === 'Real' ? 'Real' : 'Demo';
  const { data, error } = await supabase.rpc('confirm_workspace_bot_account', {
    p_workspace_id: workspaceId,
    p_slot: Number(slot),
    p_account_type: normalizedAccountType
  });
  if (error) throw error;
  return data;
}

export async function clearBotInstanceOperationalAccountConfirmation({ workspaceId, slot }) {
  assertSupabase();
  const { data, error } = await supabase.rpc('clear_workspace_bot_account_confirmation', {
    p_workspace_id: workspaceId,
    p_slot: Number(slot)
  });
  if (error) throw error;
  return data;
}

export async function enqueueTradeJobs({ workspaceId, slot, sourceMode, listDate, marketCode, asset, jobs }) {
  assertSupabase();
  const payload = {
    p_workspace_id: workspaceId,
    p_slot: Number(slot),
    p_source_mode: sourceMode,
    p_list_date: listDate,
    p_market_code: marketCode,
    p_asset: String(asset || '').trim().toUpperCase(),
    p_jobs: jobs || []
  };
  const { data, error } = await supabase.rpc('enqueue_trade_jobs', payload);
  if (error) throw error;
  return data || [];
}

export async function stopWorkspaceBot({ workspaceId, slot }) {
  assertSupabase();
  const { data, error } = await supabase.rpc('stop_workspace_bot', {
    p_workspace_id: workspaceId,
    p_slot: Number(slot)
  });
  if (error) throw error;
  return data;
}

export async function listQueuedTradeJobs({ workspaceId, slot, fromIso, toIso }) {
  assertSupabase();
  const bots = await listBotInstances(workspaceId);
  const bot = bots.find((b) => Number(b.slot) === Number(slot));
  if (!bot?.id) return [];

  let query = supabase
    .from('trade_jobs')
    .select('*')
    .eq('bot_instance_id', bot.id)
    .in('status', ['queued', 'executing'])
    .order('scheduled_at', { ascending: true });

  if (fromIso) query = query.gte('scheduled_at', fromIso);
  if (toIso) query = query.lte('scheduled_at', toIso);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getTradeJobsSummary({ workspaceId, slot, listDate, marketCode, asset }) {
  assertSupabase();
  const bots = await listBotInstances(workspaceId);
  const bot = bots.find((b) => Number(b.slot) === Number(slot));
  if (!bot?.id) {
    return {
      botId: null,
      queued: 0,
      executing: 0,
      executed: 0,
      failed: 0,
      expired: 0,
      cancelled: 0
    };
  }

  const normalizedAsset = String(asset || '').trim().toUpperCase();
  const statuses = ['queued', 'executing', 'executed', 'failed', 'expired', 'cancelled'];
  const counts = {};

  await Promise.all(statuses.map(async (status) => {
    let q = supabase
      .from('trade_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('bot_instance_id', bot.id)
      .is('cleared_at', null)
      .eq('status', status);

    if (listDate) q = q.eq('list_date', listDate);
    if (marketCode) q = q.eq('market_code', marketCode);
    if (normalizedAsset) q = q.eq('asset', normalizedAsset);

    const { count, error } = await q;
    if (error) throw error;
    counts[status] = Number(count || 0);
  }));

  return {
    botId: bot.id,
    queued: counts.queued || 0,
    executing: counts.executing || 0,
    executed: counts.executed || 0,
    failed: counts.failed || 0,
    expired: counts.expired || 0,
    cancelled: counts.cancelled || 0
  };
}

export async function listTradeJobs({ workspaceId, slot, listDate, marketCode, asset, limit = 25 }) {
  assertSupabase();
  const bots = await listBotInstances(workspaceId);
  const bot = bots.find((b) => Number(b.slot) === Number(slot));
  if (!bot?.id) return [];

  const normalizedAsset = String(asset || '').trim().toUpperCase();

  let q = supabase
    .from('trade_jobs')
    .select('*')
    .eq('bot_instance_id', bot.id)
    .is('cleared_at', null)
    .order('scheduled_at', { ascending: true })
    .limit(Number(limit) || 25);

  if (listDate) q = q.eq('list_date', listDate);
  if (marketCode) q = q.eq('market_code', marketCode);
  if (normalizedAsset) q = q.eq('asset', normalizedAsset);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function listTradeJobEvents({ workspaceId, slot, limit = 20 }) {
  assertSupabase();
  const bots = await listBotInstances(workspaceId);
  const bot = bots.find((b) => Number(b.slot) === Number(slot));
  if (!bot?.id) return [];

  const { data, error } = await supabase
    .from('trade_job_events')
    .select('*')
    .eq('bot_instance_id', bot.id)
    .order('created_at', { ascending: false })
    .limit(Number(limit) || 20);

  if (error) throw error;
  return data || [];
}

export async function createAutomationCommand({
  workspaceId,
  botInstanceId,
  commandType,
  payload = {}
}) {
  assertSupabase();
  if (!workspaceId || !commandType) {
    throw new Error('Workspace and command type are required.');
  }

  const { data, error } = await supabase
    .from('automation_commands')
    .insert({
      workspace_id: workspaceId,
      bot_instance_id: botInstanceId || null,
      command_type: commandType,
      payload: payload || {}
    })
    .select('*')
    .single();

  if (error) {
    if (isOptionalBlueprintError(error)) return null;
    throw error;
  }

  return data || null;
}

export async function getAutomationWorkerNode(workerId) {
  assertSupabase();
  if (!workerId) return null;
  return resolveOptionalQuery(
    supabase
      .from('automation_worker_nodes')
      .select('*')
      .eq('id', workerId)
      .maybeSingle(),
    null
  );
}

export async function listAutomationCommands({ workspaceId, botInstanceId, limit = 10 }) {
  assertSupabase();
  if (!workspaceId) return [];

  let query = supabase
    .from('automation_commands')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(Number(limit) || 10);

  if (botInstanceId) {
    query = query.eq('bot_instance_id', botInstanceId);
  }

  return resolveOptionalQuery(query, []);
}

export async function listTradeJobAttempts({ workspaceId, botInstanceId, limit = 12 }) {
  assertSupabase();
  if (!workspaceId || !botInstanceId) return [];

  return resolveOptionalQuery(
    supabase
      .from('trade_job_attempts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('bot_instance_id', botInstanceId)
      .order('started_at', { ascending: false })
      .limit(Number(limit) || 12),
    []
  );
}
