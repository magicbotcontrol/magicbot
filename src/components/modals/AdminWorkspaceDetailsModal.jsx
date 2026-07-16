import { useState } from 'react';

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR');
}

function getSubscriptionLabel(t, accessType) {
  const labels = {
    trial: t.adminSubscriptionTrial,
    subscription: t.adminSubscriptionSubscription,
    waiver: t.adminSubscriptionWaiver,
    admin: t.adminSubscriptionAdmin
  };

  return labels[accessType] || accessType || '-';
}

function formatSettingsValue(value) {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
}

function getRuntimeBadgeClass(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'online' || normalized === 'running') {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300';
  }

  if (normalized === 'paused') {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300';
  }

  return 'bg-gray-100 text-gray-600 dark:bg-[#1E293B] dark:text-[#CBD5E1]';
}

function getStatusPillClass(active, warning = false) {
  if (active) {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300';
  }

  if (warning) {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300';
  }

  return 'bg-gray-100 text-gray-600 dark:bg-[#1E293B] dark:text-[#CBD5E1]';
}

function formatEntitlementDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('pt-BR');
}

const TRIAL_OPTIONS = [3, 7, 17, 30];

export function AdminWorkspaceDetailsModal({
  isOpen,
  onClose,
  details,
  isLoading,
  t,
  grantDailyListAccess,
  revokeDailyListAccess,
  grantAutomatorAccess,
  revokeAutomatorAccess,
  grantSignalsBundleAccess,
  revokeSignalsBundleAccess,
  isGrantingSignalsAccess
}) {
  if (!isOpen) {
    return null;
  }

  const linkedBrokersCount = details?.brokers?.filter((broker) => broker.status === 'Linked').length || 0;
  const totalBrokersCount = details?.brokers?.length || 0;
  const currentTimezone = details?.preferences?.selected_timezone || '-';
  const runtimeStatus = details?.runtime?.bot_status || 'offline';
  const licenseDays = details?.license?.remainingDays || 0;
  const membership = details?.membership || null;
  const packageInfo = details?.packageInfo || null;
  const copyEntitlement = details?.entitlements?.copyTrading || null;
  const dailyEntitlement = details?.entitlements?.signalsDailyList || null;
  const automatorEntitlement = details?.entitlements?.signalsAutomator || null;

  const membershipActive = Boolean(membership?.isActive);
  const dailyEntitlementActive = dailyEntitlement?.status === 'active' && (!dailyEntitlement?.expires_at || new Date(dailyEntitlement.expires_at).getTime() > Date.now());
  const automatorEntitlementActive = automatorEntitlement?.status === 'active' && (!automatorEntitlement?.expires_at || new Date(automatorEntitlement.expires_at).getTime() > Date.now());
  const copyEntitlementActive = copyEntitlement?.status === 'active' && (!copyEntitlement?.expires_at || new Date(copyEntitlement.expires_at).getTime() > Date.now());

  const copyEntitlementLabel = copyEntitlementActive ? 'Ativo' : 'Inativo';
  const dailyEntitlementLabel = dailyEntitlementActive ? 'Ativo' : 'Inativo';
  const automatorEntitlementLabel = automatorEntitlementActive ? 'Ativo' : 'Inativo';

  const [trialDays, setTrialDays] = useState(7);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-5xl rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-[#334155] dark:bg-[#0B1220]">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 text-lg font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          ✕
        </button>

        <div className="space-y-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD7B5] bg-[#FFF7F0] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#B45309] dark:border-[#7C2D12] dark:bg-[#3A1E12] dark:text-[#FDBA74]">
              <span>{t.adminWorkspaceDetails}</span>
            </div>
            <h3 className="mt-3 text-lg font-bold text-gray-900 dark:text-white">
              {details?.workspace?.name || t.loadingSignals}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-[#94A3B8]">{t.adminWorkspaceDetailsSubtitle}</p>
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm font-semibold text-gray-500 dark:border-[#334155] dark:bg-[#111827] dark:text-[#94A3B8]">
              {t.loadingSignals}
            </div>
          ) : details ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-[#334155] dark:bg-[#111827]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t.adminWorkspaceName}</p>
                  <p className="mt-2 text-base font-bold text-gray-900 dark:text-white">{details.workspace.name}</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-[#94A3B8]">{details.workspace.slug}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-[#334155] dark:bg-[#111827]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t.adminWorkspaceOwner}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <p className="text-base font-bold text-gray-900 dark:text-white">{details.owner.email}</p>
                    {details.owner.isTestAccount ? (
                      <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                        {t.adminTestBadge}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-[#94A3B8]">{details.owner.role === 'admin' ? t.adminRoleAdmin : t.adminRoleUser}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-[#334155] dark:bg-[#111827]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t.adminCreatedAt}</p>
                  <p className="mt-2 text-base font-bold text-gray-900 dark:text-white">{formatDate(details.workspace.createdAt)}</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-[#94A3B8]">{details.runtime?.bot_status || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#334155] dark:bg-[#111827]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t.adminHealthBrokers}</p>
                  <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{linkedBrokersCount}</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-[#94A3B8]">
                    {t.adminHealthBrokersSubtitle.replace('{linked}', linkedBrokersCount).replace('{total}', totalBrokersCount)}
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#334155] dark:bg-[#111827]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t.adminHealthTimezone}</p>
                  <p className="mt-2 text-base font-bold text-gray-900 dark:text-white break-words">{currentTimezone}</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-[#94A3B8]">{t.adminHealthTimezoneSubtitle}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#334155] dark:bg-[#111827]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t.adminHealthRuntime}</p>
                  <div className="mt-2">
                    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${getRuntimeBadgeClass(runtimeStatus)}`}>
                      {runtimeStatus}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-[#94A3B8]">{t.adminHealthRuntimeSubtitle}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#334155] dark:bg-[#111827]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t.adminTimeLeft}</p>
                  <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{licenseDays}</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-[#94A3B8]">{getSubscriptionLabel(t, details.license?.accessType)} • {t.adminExpiresAtLabel}: {details.license?.expirationDate || '-'}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#334155] dark:bg-[#111827]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t.adminLists}</p>
                  <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{details.performance?.signalListsCount || 0}</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-[#94A3B8]">{details.performance?.validSignals || 0}/{details.performance?.totalSignals || 0} {t.valid.toLowerCase()}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#334155] dark:bg-[#111827]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t.adminResult}</p>
                  <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{details.performance?.wins || 0}W / {details.performance?.losses || 0}L</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-[#94A3B8]">{details.performance?.accuracy || 0}% {t.accuracyLabel}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#334155] dark:bg-[#111827]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t.operation}</p>
                  <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{details.performance?.operationsCount || 0}</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-[#94A3B8]">{details.license?.planName || 'trial'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#334155] dark:bg-[#111827]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">Mensalidade base</h4>
                      <p className="mt-1 text-xs text-gray-500 dark:text-[#94A3B8]">
                        A base do workspace precisa estar ativa para qualquer pacote operacional funcionar.
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${getStatusPillClass(membershipActive)}`}>
                      {membership?.label || 'Sem mensalidade'}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 dark:border-[#1F2A3A] dark:bg-[#0B1220]">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">Plano</p>
                      <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{membership?.planName || '-'}</p>
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 dark:border-[#1F2A3A] dark:bg-[#0B1220]">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">Dias restantes</p>
                      <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{membership?.remainingDays ?? 0}</p>
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 dark:border-[#1F2A3A] dark:bg-[#0B1220]">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">Expira em</p>
                      <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{membership?.expirationDate || '-'}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#334155] dark:bg-[#111827]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">Pacote atual</h4>
                      <p className="mt-1 text-xs text-gray-500 dark:text-[#94A3B8]">
                        Pacote operacional derivado dos entitlements ativos do workspace.
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${getStatusPillClass(packageInfo?.status === 'active', packageInfo?.status === 'partial')}`}>
                      {packageInfo?.label || 'Nenhum pacote ativo'}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 dark:border-[#1F2A3A] dark:bg-[#0B1220]">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">Copy Trading</p>
                      <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{copyEntitlementLabel}</p>
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 dark:border-[#1F2A3A] dark:bg-[#0B1220]">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">AutoTrader</p>
                      <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{automatorEntitlementLabel}</p>
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 dark:border-[#1F2A3A] dark:bg-[#0B1220]">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">Listas</p>
                      <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{dailyEntitlementLabel}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#334155] dark:bg-[#111827]">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">{t.adminPreferences}</h4>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">{t.accountTimezone}</p>
                      <p className="mt-1 text-gray-800 dark:text-[#E2E8F0]">{details.preferences?.selected_timezone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">{t.currency}</p>
                      <p className="mt-1 text-gray-800 dark:text-[#E2E8F0]">{details.preferences?.selected_currency || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">{t.changeLanguage}</p>
                      <p className="mt-1 text-gray-800 dark:text-[#E2E8F0]">{details.preferences?.language || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">{t.toggleTheme}</p>
                      <p className="mt-1 text-gray-800 dark:text-[#E2E8F0]">{details.preferences?.theme || '-'}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#334155] dark:bg-[#111827]">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">{t.adminBrokers}</h4>
                  <div className="mt-4 space-y-3 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                    {details.brokers.length ? details.brokers.map((broker) => (
                      <div key={broker.id} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 dark:border-[#1F2A3A] dark:bg-[#0B1220]">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white">{broker.broker_name}</p>
                            <p className="text-xs text-gray-500 dark:text-[#94A3B8]">{broker.email || '-'}</p>
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${broker.status === 'Linked' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-[#1E293B] dark:text-[#CBD5E1]'}`}>
                            {broker.status}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-500 dark:text-[#94A3B8]">
                          <span>{broker.base_currency || 'USD'}</span>
                          <span>{broker.account_type || 'Demo'}</span>
                          <span>{broker.provider || '-'}</span>
                          <span>{broker.balance ?? 0}</span>
                        </div>
                      </div>
                    )) : (
                      <p className="text-sm text-gray-500 dark:text-[#94A3B8]">{t.adminNoBrokers}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#334155] dark:bg-[#111827]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">Produtos (Entitlements)</h4>
                    <p className="mt-1 text-xs text-gray-500 dark:text-[#94A3B8]">
                      Defina testes de acesso por 3, 7, 17 ou 30 dias (individual ou pacote).
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">Dias</span>
                    <div className="flex flex-wrap gap-2">
                      {TRIAL_OPTIONS.map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setTrialDays(days)}
                          className={`rounded-xl px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors ${
                            trialDays === days
                              ? 'bg-[#FF6B00] text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-[#0B1220] dark:text-[#E2E8F0] dark:hover:bg-[#111827]'
                          }`}
                        >
                          {days}d
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={Boolean(isGrantingSignalsAccess)}
                      onClick={() => grantSignalsBundleAccess?.(trialDays)}
                      className="rounded-xl bg-[#FF6B00] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#FF7F1F] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Liberar pacote
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(isGrantingSignalsAccess)}
                      onClick={() => revokeSignalsBundleAccess?.()}
                      className="rounded-xl bg-gray-100 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-800 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-[#0B1220] dark:text-white dark:hover:bg-[#111827]"
                    >
                      Revogar pacote
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-[#334155] dark:bg-[#0B1220]">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">Copy Trading</p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-[#94A3B8]">
                          Status: <span className={`font-bold ${copyEntitlementActive ? 'text-emerald-600' : 'text-gray-500 dark:text-[#94A3B8]'}`}>{copyEntitlementLabel}</span>
                          {' '}• Expira em: {formatEntitlementDate(copyEntitlement?.expires_at)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-[#334155] dark:bg-[#0B1220]">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">AutoTrader (Lista)</p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-[#94A3B8]">
                          Status: <span className={`font-bold ${automatorEntitlementActive ? 'text-emerald-600' : 'text-gray-500 dark:text-[#94A3B8]'}`}>{automatorEntitlementLabel}</span>
                          {' '}• Expira em: {formatEntitlementDate(automatorEntitlement?.expires_at)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={Boolean(isGrantingSignalsAccess)}
                          onClick={() => grantAutomatorAccess?.(trialDays)}
                          className="rounded-xl bg-[#FFF7F0] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#B45309] transition-colors hover:bg-[#FFE6D2] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-[#3A1E12] dark:text-[#FDBA74] dark:hover:bg-[#4A2514]"
                        >
                          Liberar
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(isGrantingSignalsAccess) || !automatorEntitlement}
                          onClick={() => revokeAutomatorAccess?.()}
                          className="rounded-xl bg-red-50 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-red-950/20 dark:text-red-300 dark:hover:bg-red-900/40"
                        >
                          Revogar
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-[#334155] dark:bg-[#0B1220]">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">Sinais Diários OB</p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-[#94A3B8]">
                          Status: <span className={`font-bold ${dailyEntitlementActive ? 'text-emerald-600' : 'text-gray-500 dark:text-[#94A3B8]'}`}>{dailyEntitlementLabel}</span>
                          {' '}• Expira em: {formatEntitlementDate(dailyEntitlement?.expires_at)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={Boolean(isGrantingSignalsAccess)}
                          onClick={() => grantDailyListAccess?.(trialDays)}
                          className="rounded-xl bg-[#FFF7F0] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#B45309] transition-colors hover:bg-[#FFE6D2] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-[#3A1E12] dark:text-[#FDBA74] dark:hover:bg-[#4A2514]"
                        >
                          Liberar
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(isGrantingSignalsAccess) || !dailyEntitlement}
                          onClick={() => revokeDailyListAccess?.()}
                          className="rounded-xl bg-red-50 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-red-950/20 dark:text-red-300 dark:hover:bg-red-900/40"
                        >
                          Revogar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#334155] dark:bg-[#111827]">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">{t.adminSettings}</h4>
                  <span className="text-[11px] font-semibold text-gray-400">{Object.keys(details.settings || {}).length} {t.adminConfigItems}</span>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {Object.entries(details.settings || {}).map(([key, value]) => (
                    <div key={key} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 dark:border-[#1F2A3A] dark:bg-[#0B1220]">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">{key}</p>
                      <p className="mt-1 text-sm text-gray-800 dark:text-[#E2E8F0] break-words">{formatSettingsValue(value)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#334155] dark:bg-[#111827]">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">{t.adminSubscriptionHistory}</h4>
                  <span className="text-[11px] font-semibold text-gray-400">{details.licenseHistory?.length || 0} {t.adminHistoryItems}</span>
                </div>
                <div className="mt-4 space-y-3">
                  {details.licenseHistory?.length ? details.licenseHistory.map((event) => (
                    <div key={event.id} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 dark:border-[#1F2A3A] dark:bg-[#0B1220]">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white">{t[`adminEvent${event.event_type.replace(/(^|_)(\w)/g, (_m, _p1, p2) => p2.toUpperCase())}`] || event.event_type}</p>
                          <p className="text-xs text-gray-500 dark:text-[#94A3B8]">
                            {getSubscriptionLabel(t, event.access_type)} • {event.days_delta}d • {t.adminExpiresAtLabel}: {event.expires_at ? new Date(event.expires_at).toLocaleDateString('pt-BR') : '-'}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-gray-400">{formatDate(event.created_at)}</span>
                      </div>
                      <p className="mt-2 text-sm text-gray-600 dark:text-[#CBD5E1]">{event.note || '-'}</p>
                    </div>
                  )) : (
                    <p className="text-sm text-gray-500 dark:text-[#94A3B8]">{t.adminNoSubscriptionHistory}</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm font-semibold text-gray-500 dark:border-[#334155] dark:bg-[#111827] dark:text-[#94A3B8]">
              {t.adminWorkspaceDetailsUnavailable}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
