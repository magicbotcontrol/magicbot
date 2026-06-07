import { DEFAULT_SETTINGS_CONFIG } from '../constants/defaultWorkspace';
import { supabase, supabaseEnabled, getWorkspaceSlug } from '../lib/supabase/client';

function assertSupabase() {
  if (!supabaseEnabled || !supabase) {
    throw new Error('Supabase is not configured.');
  }
}

function mapBrokerRow(row) {
  return {
    id: row.broker_key,
    name: row.broker_name,
    logoColor: row.logo_color,
    status: row.status,
    email: row.email || '',
    balance: Number(row.balance || 0),
    baseCurrency: row.base_currency || 'USD',
    accountType: row.account_type || 'Demo'
  };
}

function normalizeSettingsConfig(settings) {
  const normalized = { ...settings };
  if (normalized.accountType === 'Practice') {
    normalized.accountType = 'Demo';
  }
  if (normalized.accountType !== 'Demo' && normalized.accountType !== 'Real') {
    normalized.accountType = DEFAULT_SETTINGS_CONFIG.accountType;
  }
  return normalized;
}

export async function ensureWorkspace() {
  assertSupabase();

  const slug = getWorkspaceSlug();
  const ensured = await supabase.rpc('ensure_my_workspace');
  if (ensured.error) {
    throw ensured.error;
  }

  const { data: workspace, error } = await supabase
    .from('app_workspaces')
    .select('id, slug, name')
    .eq('owner_user_id', (await supabase.auth.getUser()).data.user?.id)
    .eq('slug', slug)
    .single();

  if (error) {
    throw error;
  }
  return workspace;
}

export async function getWorkspaceBootstrap(workspaceId) {
  assertSupabase();

  const [preferencesResult, runtimeResult, brokersResult, settingsResult] = await Promise.all([
    supabase.from('workspace_preferences').select('*').eq('workspace_id', workspaceId).maybeSingle(),
    supabase.from('workspace_runtime').select('*').eq('workspace_id', workspaceId).maybeSingle(),
    supabase.from('broker_connections').select('*').eq('workspace_id', workspaceId),
    supabase.from('app_settings').select('config').eq('workspace_id', workspaceId).maybeSingle()
  ]);

  if (preferencesResult.error) throw preferencesResult.error;
  if (runtimeResult.error) throw runtimeResult.error;
  if (brokersResult.error) throw brokersResult.error;
  if (settingsResult.error) throw settingsResult.error;

  // #region debug-point D:workspace-bootstrap
  fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "broker-balance-signals", runId: "pre", hypothesisId: "D", location: "supabaseWorkspace.js:getWorkspaceBootstrap", msg: "[DEBUG] workspace bootstrap loaded", data: { workspaceId, runtime: runtimeResult.data?.bot_status || null, preferences: { selectedTimezone: preferencesResult.data?.selected_timezone || null }, brokers: (brokersResult.data || []).map((b) => ({ brokerKey: b.broker_key, status: b.status, balance: Number(b.balance || 0), accountType: b.account_type || null, baseCurrency: b.base_currency || null, hasEmail: Boolean(b.email) })), settingsKeys: Object.keys(settingsResult.data?.config || {}), settingsAccountType: (settingsResult.data?.config || {})?.accountType || null }, ts: Date.now() }) }).catch(() => {});
  // #endregion

  return {
    preferences: preferencesResult.data,
    runtime: runtimeResult.data,
    brokers: (brokersResult.data || []).map(mapBrokerRow),
    settings: {
      ...normalizeSettingsConfig({
        ...DEFAULT_SETTINGS_CONFIG,
        ...(settingsResult.data?.config || {})
      })
    }
  };
}

export async function updateSelectedTimezone(workspaceId, selectedTimezone) {
  assertSupabase();
  const { error } = await supabase
    .from('workspace_preferences')
    .upsert({ workspace_id: workspaceId, selected_timezone: selectedTimezone }, { onConflict: 'workspace_id' });

  if (error) throw error;
}

export async function saveSettingsConfig(workspaceId, config) {
  assertSupabase();
  const { error } = await supabase
    .from('app_settings')
    .upsert({ workspace_id: workspaceId, config }, { onConflict: 'workspace_id' });

  if (error) throw error;
}

export async function linkBrokerConnection(workspaceId, broker, email, accountType = 'Demo') {
  assertSupabase();
  const { error } = await supabase.from('broker_connections').upsert({
    workspace_id: workspaceId,
    broker_key: broker.id,
    broker_name: broker.name,
    logo_color: broker.logoColor,
    status: 'Linked',
    email,
    balance: Number(broker.balance || 0),
    base_currency: broker.baseCurrency || 'USD',
    account_type: accountType
  }, { onConflict: 'workspace_id,broker_key' });

  if (error) throw error;
}

export async function unlinkBrokerConnection(workspaceId, broker) {
  assertSupabase();
  const { error } = await supabase
    .from('broker_connections')
    .upsert({
      workspace_id: workspaceId,
      broker_key: broker.id,
      broker_name: broker.name,
      logo_color: broker.logoColor,
      status: 'Unlinked',
      email: '',
      balance: 0,
      base_currency: broker.baseCurrency || 'USD',
      account_type: broker.accountType || 'Demo'
    }, { onConflict: 'workspace_id,broker_key' });

  if (error) throw error;
}

export async function updateWorkspaceRuntime(workspaceId, botStatus) {
  assertSupabase();
  const { error } = await supabase
    .from('workspace_runtime')
    .upsert({ workspace_id: workspaceId, bot_status: botStatus }, { onConflict: 'workspace_id' });

  if (error) throw error;
}

export async function invokeSecureBrokerLink(payload) {
  assertSupabase();
  // #region debug-point A:secure-broker-link
  fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "broker-balance-signals", runId: "pre", hypothesisId: "A", location: "supabaseWorkspace.js:invokeSecureBrokerLink", msg: "[DEBUG] invoking secure broker link", data: { action: payload?.action, brokerKey: payload?.brokerKey, provider: payload?.provider, accountType: payload?.accountType, hasEmail: Boolean(payload?.email), passwordLength: String(payload?.password || "").length }, ts: Date.now() }) }).catch(() => {});
  // #endregion
  const { data, error } = await supabase.functions.invoke('secure-broker-link', {
    body: payload
  });

  // #region debug-point A:secure-broker-link-result
  fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "broker-balance-signals", runId: "pre", hypothesisId: "A", location: "supabaseWorkspace.js:invokeSecureBrokerLink", msg: "[DEBUG] secure broker link result", data: { action: payload?.action, brokerKey: payload?.brokerKey, ok: !error, errorMessage: error?.message || null, errorName: error?.name || null }, ts: Date.now() }) }).catch(() => {});
  // #endregion

  if (error) throw error;
  return data;
}
