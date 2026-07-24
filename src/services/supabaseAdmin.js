import { supabase, supabaseEnabled } from '../lib/supabase/client';
import { DEFAULT_SETTINGS_CONFIG } from '../constants/defaultWorkspace';
import { mapLicenseRow } from './supabaseLicense';

function assertSupabase() {
  if (!supabaseEnabled || !supabase) {
    throw new Error('Supabase is not configured.');
  }
}

function isMissingColumnError(error, columnName) {
  const message = String(error?.message || error?.details || '');
  return message.toLowerCase().includes(columnName.toLowerCase());
}

function isEntitlementActive(entitlement) {
  if (!entitlement || entitlement.status !== 'active') return false;
  if (!entitlement.expires_at) return true;
  return new Date(entitlement.expires_at).getTime() > Date.now();
}

function resolveWorkspacePackage(entitlements = {}) {
  const hasCopyTrading = isEntitlementActive(entitlements.copyTrading);
  const hasSignalsDailyList = isEntitlementActive(entitlements.signalsDailyList);
  const hasSignalsAutomator = isEntitlementActive(entitlements.signalsAutomator);

  if (hasCopyTrading && hasSignalsDailyList && hasSignalsAutomator) {
    return {
      code: 'full_access_package',
      label: 'Full Access',
      status: 'active'
    };
  }

  if (!hasCopyTrading && hasSignalsDailyList && hasSignalsAutomator) {
    return {
      code: 'automator_lists_package',
      label: 'Automatizador + 3 Listas',
      status: 'active'
    };
  }

  if (hasCopyTrading && !hasSignalsDailyList && !hasSignalsAutomator) {
    return {
      code: 'copy_trading_package',
      label: 'Copy Trading',
      status: 'active'
    };
  }

  if (!hasCopyTrading && !hasSignalsDailyList && !hasSignalsAutomator) {
    return {
      code: '',
      label: 'Nenhum pacote ativo',
      status: 'inactive'
    };
  }

  return {
    code: 'custom',
    label: 'Pacote customizado',
    status: 'partial'
  };
}

async function listAdminProfiles() {
  const withTestFlag = await supabase
    .from('profiles')
    .select('id, email, role, created_at, is_test_account')
    .order('created_at', { ascending: false });

  if (!withTestFlag.error) {
    return withTestFlag;
  }

  if (!isMissingColumnError(withTestFlag.error, 'is_test_account')) {
    return withTestFlag;
  }

  const fallback = await supabase
    .from('profiles')
    .select('id, email, role, created_at')
    .order('created_at', { ascending: false });

  if (!fallback.error) {
    fallback.data = (fallback.data || []).map((profile) => ({ ...profile, is_test_account: false }));
  }

  return fallback;
}

async function getAdminProfileById(profileId) {
  const withTestFlag = await supabase
    .from('profiles')
    .select('id, email, role, created_at, is_test_account')
    .eq('id', profileId)
    .maybeSingle();

  if (!withTestFlag.error) {
    return withTestFlag;
  }

  if (!isMissingColumnError(withTestFlag.error, 'is_test_account')) {
    return withTestFlag;
  }

  const fallback = await supabase
    .from('profiles')
    .select('id, email, role, created_at')
    .eq('id', profileId)
    .maybeSingle();

  if (!fallback.error && fallback.data) {
    fallback.data = { ...fallback.data, is_test_account: false };
  }

  return fallback;
}

async function listWorkspaceLicenseEvents(workspaceId) {
  const extendedSelect = 'id, event_type, access_type, status_after, plan_name, days_delta, expires_at, note, created_at, charged_amount_usd, bankroll_usd, pricing_tier_id, pricing_tier_label, manual_override';
  const baseSelect = 'id, event_type, access_type, status_after, plan_name, days_delta, expires_at, note, created_at';

  const withChargeFields = await supabase
    .from('workspace_license_events')
    .select(extendedSelect)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(8);

  if (!withChargeFields.error) {
    return withChargeFields;
  }

  if (!isMissingColumnError(withChargeFields.error, 'charged_amount_usd')) {
    return withChargeFields;
  }

  const fallback = await supabase
    .from('workspace_license_events')
    .select(baseSelect)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(8);

  if (!fallback.error) {
    fallback.data = (fallback.data || []).map((event) => ({
      ...event,
      charged_amount_usd: null,
      bankroll_usd: null,
      pricing_tier_id: null,
      pricing_tier_label: null,
      manual_override: false
    }));
  }

  return fallback;
}

export async function getAdminOverview() {
  assertSupabase();

  const [profilesResult, workspacesResult, licensesResult, runtimeResult, brokersResult, signalListsResult, liveOperationsResult, entitlementsResult] = await Promise.all([
    listAdminProfiles(),
    supabase
      .from('app_workspaces')
      .select('id, slug, name, owner_user_id, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('workspace_licenses')
      .select('workspace_id, status, plan_name, granted_days, started_at, expires_at, last_payment_at'),
    supabase
      .from('workspace_runtime')
      .select('workspace_id, bot_status'),
    supabase
      .from('broker_connections')
      .select('workspace_id, status'),
    supabase
      .from('signal_lists')
      .select('workspace_id, total_count, valid_count'),
    supabase
      .from('live_operations')
      .select('workspace_id, profit_loss, status'),
    supabase
      .from('workspace_entitlements')
      .select('workspace_id, product_code, status, expires_at')
  ]);

  if (profilesResult.error) throw profilesResult.error;
  if (workspacesResult.error) throw workspacesResult.error;
  if (licensesResult.error) throw licensesResult.error;
  if (runtimeResult.error) throw runtimeResult.error;
  if (brokersResult.error) throw brokersResult.error;
  if (signalListsResult.error) throw signalListsResult.error;
  if (liveOperationsResult.error) throw liveOperationsResult.error;
  if (entitlementsResult.error) throw entitlementsResult.error;

  const profiles = profilesResult.data || [];
  const workspaces = workspacesResult.data || [];
  const licenses = licensesResult.data || [];
  const runtimes = runtimeResult.data || [];
  const brokers = brokersResult.data || [];
  const signalLists = signalListsResult.data || [];
  const liveOperations = liveOperationsResult.data || [];
  const entitlements = entitlementsResult.data || [];

  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const licenseMap = new Map(licenses.map((license) => [license.workspace_id, mapLicenseRow(license)]));
  const runtimeMap = new Map(runtimes.map((runtime) => [runtime.workspace_id, runtime.bot_status || 'offline']));
  const workspacesByOwner = workspaces.reduce((acc, workspace) => {
    acc[workspace.owner_user_id] = (acc[workspace.owner_user_id] || 0) + 1;
    return acc;
  }, {});
  const brokerMetricsByWorkspace = brokers.reduce((acc, broker) => {
    const current = acc[broker.workspace_id] || { total: 0, linked: 0 };
    current.total += 1;
    if (broker.status === 'Linked') {
      current.linked += 1;
    }
    acc[broker.workspace_id] = current;
    return acc;
  }, {});
  const signalMetricsByWorkspace = signalLists.reduce((acc, signalList) => {
    const current = acc[signalList.workspace_id] || { lists: 0, totalSignals: 0, validSignals: 0 };
    current.lists += 1;
    current.totalSignals += Number(signalList.total_count || 0);
    current.validSignals += Number(signalList.valid_count || 0);
    acc[signalList.workspace_id] = current;
    return acc;
  }, {});
  const operationsMetricsByWorkspace = liveOperations.reduce((acc, operation) => {
    const current = acc[operation.workspace_id] || { wins: 0, losses: 0, operations: 0 };
    current.operations += 1;
    if (Number(operation.profit_loss || 0) > 0) {
      current.wins += 1;
    } else if (Number(operation.profit_loss || 0) < 0) {
      current.losses += 1;
    }
    acc[operation.workspace_id] = current;
    return acc;
  }, {});
  const entitlementsByWorkspace = entitlements.reduce((acc, row) => {
    const current = acc[row.workspace_id] || {
      copyTrading: null,
      signalsDailyList: null,
      signalsAutomator: null
    };

    if (row.product_code === 'copy_trading') current.copyTrading = row;
    if (row.product_code === 'signals_daily_list') current.signalsDailyList = row;
    if (row.product_code === 'signals_automator') current.signalsAutomator = row;

    acc[row.workspace_id] = current;
    return acc;
  }, {});

  const workspaceMetrics = workspaces.map((workspace) => {
    const brokerMetrics = brokerMetricsByWorkspace[workspace.id] || { total: 0, linked: 0 };
    const signalMetrics = signalMetricsByWorkspace[workspace.id] || { lists: 0, totalSignals: 0, validSignals: 0 };
    const operationsMetrics = operationsMetricsByWorkspace[workspace.id] || { wins: 0, losses: 0, operations: 0 };
    const totalFinished = operationsMetrics.wins + operationsMetrics.losses;
    const accuracy = totalFinished ? Math.round((operationsMetrics.wins / totalFinished) * 1000) / 10 : 0;
    const license = licenseMap.get(workspace.id) || mapLicenseRow(null);
    const entitlementGroup = entitlementsByWorkspace[workspace.id] || {
      copyTrading: null,
      signalsDailyList: null,
      signalsAutomator: null
    };
    const packageInfo = resolveWorkspacePackage(entitlementGroup);

    return {
      workspaceId: workspace.id,
      license,
      packageInfo,
      subscriptionLabel: `${license.accessType}:${license.status}`,
      runtimeStatus: runtimeMap.get(workspace.id) || 'offline',
      totalBrokersCount: brokerMetrics.total,
      linkedBrokersCount: brokerMetrics.linked,
      hasZeroLinkedBrokers: brokerMetrics.linked === 0,
      signalListsCount: signalMetrics.lists,
      totalSignals: signalMetrics.totalSignals,
      validSignals: signalMetrics.validSignals,
      wins: operationsMetrics.wins,
      losses: operationsMetrics.losses,
      operationsCount: operationsMetrics.operations,
      accuracy
    };
  });

  const metricsByWorkspaceId = new Map(workspaceMetrics.map((metric) => [metric.workspaceId, metric]));
  const primaryMetricsByOwner = workspaces.reduce((acc, workspace) => {
    if (!acc[workspace.owner_user_id]) {
      acc[workspace.owner_user_id] = metricsByWorkspaceId.get(workspace.id);
    }
    return acc;
  }, {});

  return {
    summary: {
      usersCount: profiles.length,
      adminsCount: profiles.filter((profile) => profile.role === 'admin').length,
      testAccountsCount: profiles.filter((profile) => profile.is_test_account).length,
      testWorkspacesCount: workspaces.filter((workspace) => profileMap.get(workspace.owner_user_id)?.is_test_account).length,
      workspacesCount: workspaces.length
    },
    users: profiles.map((profile) => ({
      id: profile.id,
      email: profile.email || 'sem-email',
      role: profile.role || 'user',
      createdAt: profile.created_at,
      isTestAccount: Boolean(profile.is_test_account),
      workspacesCount: workspacesByOwner[profile.id] || 0,
      remainingDays: primaryMetricsByOwner[profile.id]?.license.remainingDays || 0,
      licenseStatus: primaryMetricsByOwner[profile.id]?.license.status || 'expired',
      licenseAccessType: primaryMetricsByOwner[profile.id]?.license.accessType || 'trial',
      signalListsCount: primaryMetricsByOwner[profile.id]?.signalListsCount || 0,
      wins: primaryMetricsByOwner[profile.id]?.wins || 0,
      losses: primaryMetricsByOwner[profile.id]?.losses || 0
    })),
    workspaces: workspaces.map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      ownerUserId: workspace.owner_user_id,
      ownerEmail: profileMap.get(workspace.owner_user_id)?.email || 'sem-email',
      ownerIsTestAccount: Boolean(profileMap.get(workspace.owner_user_id)?.is_test_account),
      createdAt: workspace.created_at,
      runtimeStatus: metricsByWorkspaceId.get(workspace.id)?.runtimeStatus || 'offline',
      linkedBrokersCount: metricsByWorkspaceId.get(workspace.id)?.linkedBrokersCount || 0,
      totalBrokersCount: metricsByWorkspaceId.get(workspace.id)?.totalBrokersCount || 0,
      hasZeroLinkedBrokers: metricsByWorkspaceId.get(workspace.id)?.hasZeroLinkedBrokers ?? true,
      remainingDays: metricsByWorkspaceId.get(workspace.id)?.license.remainingDays || 0,
      licenseStatus: metricsByWorkspaceId.get(workspace.id)?.license.status || 'expired',
      licenseAccessType: metricsByWorkspaceId.get(workspace.id)?.license.accessType || 'trial',
      packageCode: metricsByWorkspaceId.get(workspace.id)?.packageInfo?.code || '',
      packageLabel: metricsByWorkspaceId.get(workspace.id)?.packageInfo?.label || 'Nenhum pacote ativo',
      packageStatus: metricsByWorkspaceId.get(workspace.id)?.packageInfo?.status || 'inactive',
      signalListsCount: metricsByWorkspaceId.get(workspace.id)?.signalListsCount || 0,
      wins: metricsByWorkspaceId.get(workspace.id)?.wins || 0,
      losses: metricsByWorkspaceId.get(workspace.id)?.losses || 0,
      accuracy: metricsByWorkspaceId.get(workspace.id)?.accuracy || 0
    }))
  };
}

export async function updateAdminProfileTestAccount(userId, isTestAccount) {
  assertSupabase();

  const { data, error } = await supabase
    .from('profiles')
    .update({ is_test_account: Boolean(isTestAccount) })
    .eq('id', userId)
    .select('id, email, is_test_account')
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getAdminWorkspaceDetails(workspaceId) {
  assertSupabase();

  const [workspaceResult, preferencesResult, runtimeResult, brokersResult, settingsResult, licenseResult, signalListsResult, liveOperationsResult, licenseEventsResult, dailyEntitlementsResult, automatorEntitlementsResult, copyEntitlementResult] = await Promise.all([
    supabase
      .from('app_workspaces')
      .select('id, slug, name, owner_user_id, created_at')
      .eq('id', workspaceId)
      .single(),
    supabase
      .from('workspace_preferences')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle(),
    supabase
      .from('workspace_runtime')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle(),
    supabase
      .from('broker_connections')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('broker_name', { ascending: true }),
    supabase
      .from('app_settings')
      .select('config')
      .eq('workspace_id', workspaceId)
      .maybeSingle(),
    supabase
      .from('workspace_licenses')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle(),
    supabase
      .from('signal_lists')
      .select('workspace_id, total_count, valid_count')
      .eq('workspace_id', workspaceId),
    supabase
      .from('live_operations')
      .select('workspace_id, profit_loss, status')
      .eq('workspace_id', workspaceId),
    listWorkspaceLicenseEvents(workspaceId),
    supabase
      .from('workspace_entitlements')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('product_code', 'signals_daily_list')
      .maybeSingle(),
    supabase
      .from('workspace_entitlements')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('product_code', 'signals_automator')
      .maybeSingle(),
    supabase
      .from('workspace_entitlements')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('product_code', 'copy_trading')
      .maybeSingle()
  ]);

  if (workspaceResult.error) throw workspaceResult.error;
  if (preferencesResult.error) throw preferencesResult.error;
  if (runtimeResult.error) throw runtimeResult.error;
  if (brokersResult.error) throw brokersResult.error;
  if (settingsResult.error) throw settingsResult.error;
  if (licenseResult.error) throw licenseResult.error;
  if (signalListsResult.error) throw signalListsResult.error;
  if (liveOperationsResult.error) throw liveOperationsResult.error;
  if (licenseEventsResult.error) throw licenseEventsResult.error;
  if (dailyEntitlementsResult.error) throw dailyEntitlementsResult.error;
  if (automatorEntitlementsResult.error) throw automatorEntitlementsResult.error;
  if (copyEntitlementResult.error) throw copyEntitlementResult.error;

  const ownerResult = await getAdminProfileById(workspaceResult.data.owner_user_id);

  if (ownerResult.error) throw ownerResult.error;

  const signalMetrics = (signalListsResult.data || []).reduce((acc, signalList) => {
    acc.lists += 1;
    acc.totalSignals += Number(signalList.total_count || 0);
    acc.validSignals += Number(signalList.valid_count || 0);
    return acc;
  }, { lists: 0, totalSignals: 0, validSignals: 0 });

  const operationsMetrics = (liveOperationsResult.data || []).reduce((acc, operation) => {
    acc.operations += 1;
    if (Number(operation.profit_loss || 0) > 0) {
      acc.wins += 1;
    } else if (Number(operation.profit_loss || 0) < 0) {
      acc.losses += 1;
    }
    return acc;
  }, { operations: 0, wins: 0, losses: 0 });

  const totalFinished = operationsMetrics.wins + operationsMetrics.losses;
  const entitlementGroup = {
    copyTrading: copyEntitlementResult.data || null,
    signalsDailyList: dailyEntitlementsResult.data || null,
    signalsAutomator: automatorEntitlementsResult.data || null
  };
  const packageInfo = resolveWorkspacePackage(entitlementGroup);
  const license = mapLicenseRow(licenseResult.data);

  return {
    workspace: {
      id: workspaceResult.data.id,
      name: workspaceResult.data.name,
      slug: workspaceResult.data.slug,
      createdAt: workspaceResult.data.created_at
    },
    owner: {
      id: ownerResult.data?.id || workspaceResult.data.owner_user_id,
      email: ownerResult.data?.email || 'sem-email',
      role: ownerResult.data?.role || 'user',
      isTestAccount: Boolean(ownerResult.data?.is_test_account),
      createdAt: ownerResult.data?.created_at || null
    },
    preferences: preferencesResult.data || null,
    runtime: runtimeResult.data || null,
    brokers: brokersResult.data || [],
    license,
    membership: {
      isActive: license.status === 'active' && license.remainingDays > 0,
      label: license.status === 'active' && license.remainingDays > 0 ? 'Mensalidade ativa' : 'Mensalidade inativa',
      remainingDays: license.remainingDays,
      expirationDate: license.expirationDate,
      planName: license.planName
    },
    licenseHistory: licenseEventsResult.data || [],
    entitlements: {
      copyTrading: copyEntitlementResult.data || null,
      signalsDailyList: dailyEntitlementsResult.data || null,
      signalsAutomator: automatorEntitlementsResult.data || null
    },
    packageInfo,
    performance: {
      signalListsCount: signalMetrics.lists,
      totalSignals: signalMetrics.totalSignals,
      validSignals: signalMetrics.validSignals,
      operationsCount: operationsMetrics.operations,
      wins: operationsMetrics.wins,
      losses: operationsMetrics.losses,
      accuracy: totalFinished ? Math.round((operationsMetrics.wins / totalFinished) * 1000) / 10 : 0
    },
    settings: {
      ...DEFAULT_SETTINGS_CONFIG,
      ...(settingsResult.data?.config || {})
    }
  };
}
