import { ScrollableTableShell } from '../ScrollableTableShell';
import { Icons } from '../../constants/icons';
import { AdminWorkspaceDetailsModal } from '../modals/AdminWorkspaceDetailsModal';
import { AdminChargeMembershipModal } from '../modals/AdminChargeMembershipModal';
import { AdminGrantWaiverModal } from '../modals/AdminGrantWaiverModal';
import { AdminCopyTradingCampaigns } from '../admin/AdminCopyTradingCampaigns';

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR');
}

function RuntimeBadge({ status }) {
  const tone = status === 'running'
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
    : 'bg-gray-100 text-gray-600 dark:bg-[#1E293B] dark:text-[#CBD5E1]';

  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${tone}`}>{status}</span>;
}

function getMembershipBadgeClass(active) {
  return active
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
    : 'bg-gray-100 text-gray-600 dark:bg-[#1E293B] dark:text-[#CBD5E1]';
}

function getPackageBadgeClass(status) {
  if (status === 'active') {
    return 'bg-[#FFF7F0] text-[#B45309] dark:bg-[#3A1E12] dark:text-[#FDBA74]';
  }

  if (status === 'partial') {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300';
  }

  return 'bg-gray-100 text-gray-600 dark:bg-[#1E293B] dark:text-[#CBD5E1]';
}

function MembershipSummary({ remainingDays, licenseStatus }) {
  const active = licenseStatus === 'active' && remainingDays > 0;

  return (
    <div className="space-y-1">
      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${getMembershipBadgeClass(active)}`}>
        {active ? 'Mensalidade ativa' : 'Mensalidade inativa'}
      </span>
      <p className="text-xs text-gray-500 dark:text-[#94A3B8]">
        {active ? `${remainingDays} dias restantes` : 'Base expirada'}
      </p>
    </div>
  );
}

function PackageSummary({ label, status }) {
  return (
    <div className="space-y-1">
      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${getPackageBadgeClass(status)}`}>
        {label || 'Nenhum pacote ativo'}
      </span>
      <p className="text-xs text-gray-500 dark:text-[#94A3B8]">
        {status === 'active' ? 'Pacote pronto para uso' : status === 'partial' ? 'Entitlements parciais ativos' : 'Sem pacote operacional'}
      </p>
    </div>
  );
}

function TestAccountBadge({ isTestAccount, t }) {
  if (!isTestAccount) return null;

  return (
    <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
      {t.adminTestBadge}
    </span>
  );
}

function PaginationBar({ label, currentPage, totalPages, onPrevious, onNext, totalItems, t }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs font-semibold text-gray-500 dark:border-[#334155] dark:bg-[#111827] dark:text-[#94A3B8] sm:flex-row sm:items-center sm:justify-between">
      <span>{label}: {totalItems}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={currentPage <= 1}
          className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#334155] dark:text-[#E2E8F0] dark:hover:bg-[#0B1220]"
        >
          {t.adminPrevious}
        </button>
        <span>{t.adminPageLabel.replace('{current}', currentPage).replace('{total}', totalPages)}</span>
        <button
          type="button"
          onClick={onNext}
          disabled={currentPage >= totalPages}
          className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#334155] dark:text-[#E2E8F0] dark:hover:bg-[#0B1220]"
        >
          {t.adminNext}
        </button>
      </div>
    </div>
  );
}

export function AdminTab({
  t,
  showToast,
  summary,
  users,
  workspaces,
  filters,
  setFilter,
  sortOrders,
  setSortOrder,
  userPage,
  workspacePage,
  workspacePackageCounters,
  userTotalPages,
  workspaceTotalPages,
  setUserPage,
  setWorkspacePage,
  usersTotalFiltered,
  workspacesTotalFiltered,
  selectedWorkspaceId,
  workspaceDetails,
  selectedWaiverUser,
  selectedChargeUser,
  chargePreview,
  isAdminLoading,
  isWorkspaceDetailsLoading,
  isGrantingWaiver,
  isChargePreviewLoading,
  isChargingMembership,
  isUpdatingTestAccount,
  openWorkspaceDetails,
  closeWorkspaceDetails,
  openWaiverModal,
  closeWaiverModal,
  openChargeModal,
  closeChargeModal,
  confirmMonthlyWaiver,
  confirmMonthlyCharge,
  toggleTestAccount
}) {
  const quickCounters = [
    { label: 'Base ativa', value: workspacePackageCounters?.baseActive || 0, tone: 'emerald' },
    { label: 'Base inativa', value: workspacePackageCounters?.baseInactive || 0, tone: 'slate' },
    { label: 'Copy', value: workspacePackageCounters?.copy || 0, tone: 'orange' },
    { label: 'Nenhum pacote', value: workspacePackageCounters?.none || 0, tone: 'slate' }
  ];

  const counterToneClass = (tone) => {
    if (tone === 'emerald') return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/15 dark:text-emerald-300';
    if (tone === 'amber') return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/15 dark:text-amber-300';
    if (tone === 'orange') return 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/40 dark:bg-orange-950/15 dark:text-orange-300';
    return 'border-gray-200 bg-gray-50 text-gray-700 dark:border-[#334155] dark:bg-[#111827] dark:text-[#CBD5E1]';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 border border-gray-200 dark:border-[#334155] shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD7B5] bg-[#FFF7F0] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#B45309] dark:border-[#7C2D12] dark:bg-[#3A1E12] dark:text-[#FDBA74]">
              <Icons.Shield />
              <span>{t.adminBadge}</span>
            </div>
            <h2 className="mt-3 text-lg font-bold text-gray-900 dark:text-white">{t.admin}</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t.adminSubtitle}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-500 dark:border-[#334155] dark:bg-[#0B1220] dark:text-[#94A3B8]">
            {t.adminReadOnly}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <div className="bg-white dark:bg-[#1E293B] rounded-xl p-4 border border-gray-200 dark:border-[#334155] shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t.adminUsers}</p>
          <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{summary.usersCount}</p>
        </div>
        <div className="bg-white dark:bg-[#1E293B] rounded-xl p-4 border border-gray-200 dark:border-[#334155] shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t.adminAdmins}</p>
          <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{summary.adminsCount}</p>
        </div>
        <div className="bg-white dark:bg-[#1E293B] rounded-xl p-4 border border-gray-200 dark:border-[#334155] shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t.adminWorkspaces}</p>
          <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{summary.workspacesCount}</p>
        </div>
        <div className="bg-white dark:bg-[#1E293B] rounded-xl p-4 border border-gray-200 dark:border-[#334155] shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t.adminTestAccounts}</p>
          <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{summary.testAccountsCount || 0}</p>
        </div>
        <div className="bg-white dark:bg-[#1E293B] rounded-xl p-4 border border-gray-200 dark:border-[#334155] shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t.adminTestWorkspaces}</p>
          <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{summary.testWorkspacesCount || 0}</p>
        </div>
      </div>

      <AdminCopyTradingCampaigns t={t} showToast={showToast} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#334155] dark:bg-[#1E293B]">
          <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t.email}</label>
          <input
            value={filters.email}
            onChange={(event) => setFilter('email', event.target.value)}
            placeholder={t.adminFilterEmail}
            className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#FF6B00] dark:border-[#334155] dark:bg-[#0B1220] dark:text-white"
          />
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#334155] dark:bg-[#1E293B]">
          <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t.adminWorkspaceSlug}</label>
          <input
            value={filters.slug}
            onChange={(event) => setFilter('slug', event.target.value)}
            placeholder={t.adminFilterSlug}
            className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#FF6B00] dark:border-[#334155] dark:bg-[#0B1220] dark:text-white"
          />
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#334155] dark:bg-[#1E293B]">
          <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t.adminRole}</label>
          <select
            value={filters.role}
            onChange={(event) => setFilter('role', event.target.value)}
            className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#FF6B00] dark:border-[#334155] dark:bg-[#0B1220] dark:text-white"
          >
            <option value="all">{t.adminRoleAll}</option>
            <option value="admin">{t.adminRoleAdmin}</option>
            <option value="user">{t.adminRoleUser}</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#334155] dark:bg-[#1E293B]">
          <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t.adminHealthRuntime}</label>
          <select
            value={filters.runtime}
            onChange={(event) => setFilter('runtime', event.target.value)}
            className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#FF6B00] dark:border-[#334155] dark:bg-[#0B1220] dark:text-white"
          >
            <option value="all">{t.adminRuntimeAll}</option>
            <option value="running">{t.adminRuntimeRunning}</option>
            <option value="offline">{t.adminRuntimeOffline}</option>
          </select>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#334155] dark:bg-[#1E293B]">
          <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t.adminHealthBrokers}</label>
          <select
            value={filters.brokers}
            onChange={(event) => setFilter('brokers', event.target.value)}
            className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#FF6B00] dark:border-[#334155] dark:bg-[#0B1220] dark:text-white"
          >
            <option value="all">{t.adminBrokerFilterAll}</option>
            <option value="zero">{t.adminBrokerFilterZero}</option>
            <option value="linked">{t.adminBrokerFilterLinked}</option>
          </select>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#334155] dark:bg-[#1E293B]">
          <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">Mensalidade base</label>
          <select
            value={filters.membership}
            onChange={(event) => setFilter('membership', event.target.value)}
            className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#FF6B00] dark:border-[#334155] dark:bg-[#0B1220] dark:text-white"
          >
            <option value="all">Todas</option>
            <option value="active">Ativa</option>
            <option value="inactive">Inativa</option>
          </select>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#334155] dark:bg-[#1E293B]">
          <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">Pacote atual</label>
          <select
            value={filters.packageType}
            onChange={(event) => setFilter('packageType', event.target.value)}
            className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#FF6B00] dark:border-[#334155] dark:bg-[#0B1220] dark:text-white"
          >
            <option value="all">Todos</option>
            <option value="copy_trading_package">Copy</option>
            <option value="none">Nenhum</option>
          </select>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#334155] dark:bg-[#1E293B]">
          <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t.adminTestAccounts}</label>
          <select
            value={filters.testAccounts}
            onChange={(event) => setFilter('testAccounts', event.target.value)}
            className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#FF6B00] dark:border-[#334155] dark:bg-[#0B1220] dark:text-white"
          >
            <option value="all">{t.adminTestAccountsAll}</option>
            <option value="test">{t.adminTestAccountsOnly}</option>
            <option value="real">{t.adminRealAccountsOnly}</option>
          </select>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">{t.adminUsers}</h3>
          <div className="flex items-center gap-3">
            <select
              value={sortOrders.users}
              onChange={(event) => setSortOrder('users', event.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#FF6B00] dark:border-[#334155] dark:bg-[#111827] dark:text-[#E2E8F0]"
            >
              <option value="desc">{t.adminSortNewest}</option>
              <option value="asc">{t.adminSortOldest}</option>
            </select>
            {isAdminLoading ? <span className="text-xs font-semibold text-gray-400">{t.loadingSignals}</span> : null}
          </div>
        </div>
        <ScrollableTableShell minWidthClass="min-w-[1160px]" hintLabel={t.swipeHint}>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-[#0F172A] text-gray-500 dark:text-[#94A3B8]">
              <tr>
                <th className="px-4 py-3 text-left font-bold">{t.email}</th>
                <th className="px-4 py-3 text-left font-bold">{t.adminRole}</th>
                <th className="px-4 py-3 text-left font-bold">{t.adminSubscription}</th>
                <th className="px-4 py-3 text-left font-bold">{t.adminTimeLeft}</th>
                <th className="px-4 py-3 text-left font-bold">{t.adminWorkspaceCount}</th>
                <th className="px-4 py-3 text-left font-bold">{t.adminCreatedAt}</th>
                <th className="px-4 py-3 text-left font-bold">{t.action}</th>
              </tr>
            </thead>
            <tbody>
              {users.length ? users.map((user) => (
                <tr key={user.id} className="border-t border-gray-100 dark:border-[#1F2A3A]">
                  <td className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-200">
                    <div className="flex items-center gap-2">
                      <span>{user.email}</span>
                      <TestAccountBadge isTestAccount={user.isTestAccount} t={t} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${user.role === 'admin' ? 'bg-[#FFF7F0] text-[#B45309] dark:bg-[#3A1E12] dark:text-[#FDBA74]' : 'bg-gray-100 text-gray-600 dark:bg-[#1E293B] dark:text-[#CBD5E1]'}`}>
                      {user.role === 'admin' ? t.adminRoleAdmin : t.adminRoleUser}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-[#CBD5E1]">{t[`adminSubscription${user.licenseAccessType.charAt(0).toUpperCase()}${user.licenseAccessType.slice(1)}`] || user.licenseAccessType}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-[#CBD5E1]">{t.adminDaysLeftCompact.replace('{days}', user.remainingDays)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-[#CBD5E1]">{user.workspacesCount}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-[#94A3B8]">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3">
                    {user.role === 'admin' ? (
                      <span className="text-xs font-semibold text-gray-400">{t.adminProtectedAccount}</span>
                    ) : (
                      <div className="flex flex-col items-end gap-2">
                        <button
                          type="button"
                          onClick={() => toggleTestAccount(user.id, !user.isTestAccount)}
                          disabled={isUpdatingTestAccount}
                          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-700 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300 dark:hover:bg-amber-950/30"
                        >
                          {isUpdatingTestAccount ? t.adminUpdatingTestFlag : user.isTestAccount ? t.adminUnmarkAsTest : t.adminMarkAsTest}
                        </button>
                        <button
                          type="button"
                          onClick={() => openChargeModal(user)}
                          disabled={Boolean(isChargePreviewLoading) && selectedChargeUser?.id === user.id}
                          className="rounded-xl bg-[#FF6B00] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#FF7F1F] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {isChargePreviewLoading && selectedChargeUser?.id === user.id ? t.loadingSignals : t.adminChargeAction}
                        </button>
                        <button
                          type="button"
                          onClick={() => openWaiverModal(user)}
                          className="rounded-xl bg-[#FFF7F0] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#B45309] transition-colors hover:bg-[#FFE6D2] dark:bg-[#3A1E12] dark:text-[#FDBA74] dark:hover:bg-[#4A2514]"
                        >
                          {t.adminWaiverAction}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7" className="px-4 py-6 text-center text-sm text-gray-500 dark:text-[#94A3B8]">
                    {t.adminNoUsers}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </ScrollableTableShell>
        <PaginationBar
          label={t.adminUsers}
          currentPage={userPage}
          totalPages={userTotalPages}
          totalItems={usersTotalFiltered}
          onPrevious={() => setUserPage((current) => Math.max(1, current - 1))}
          onNext={() => setUserPage((current) => Math.min(userTotalPages, current + 1))}
          t={t}
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">{t.adminWorkspaces}</h3>
          <div className="flex items-center gap-3">
            <select
              value={sortOrders.workspaces}
              onChange={(event) => setSortOrder('workspaces', event.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#FF6B00] dark:border-[#334155] dark:bg-[#111827] dark:text-[#E2E8F0]"
            >
              <option value="desc">{t.adminSortNewest}</option>
              <option value="asc">{t.adminSortOldest}</option>
            </select>
            {isAdminLoading ? <span className="text-xs font-semibold text-gray-400">{t.loadingSignals}</span> : null}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
          {quickCounters.map((item) => (
            <div key={item.label} className={`rounded-2xl border px-4 py-3 shadow-sm ${counterToneClass(item.tone)}`}>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-80">{item.label}</p>
              <p className="mt-2 text-2xl font-black">{item.value}</p>
            </div>
          ))}
        </div>
        <ScrollableTableShell minWidthClass="min-w-[1240px]" hintLabel={t.swipeHint}>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-[#0F172A] text-gray-500 dark:text-[#94A3B8]">
              <tr>
                <th className="px-4 py-3 text-left font-bold">{t.adminWorkspaceName}</th>
                <th className="px-4 py-3 text-left font-bold">{t.adminWorkspaceSlug}</th>
                <th className="px-4 py-3 text-left font-bold">{t.adminWorkspaceOwner}</th>
                <th className="px-4 py-3 text-left font-bold">{t.adminHealthRuntime}</th>
                <th className="px-4 py-3 text-left font-bold">{t.adminHealthBrokers}</th>
                <th className="px-4 py-3 text-left font-bold">Mensalidade base</th>
                <th className="px-4 py-3 text-left font-bold">Pacote atual</th>
                <th className="px-4 py-3 text-left font-bold">{t.adminCreatedAt}</th>
              </tr>
            </thead>
            <tbody>
              {workspaces.length ? workspaces.map((workspace) => (
                <tr key={workspace.id} className={`border-t border-gray-100 dark:border-[#1F2A3A] ${workspace.hasZeroLinkedBrokers ? 'bg-red-50/40 dark:bg-red-950/10' : ''}`}>
                  <td className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-200">{workspace.name}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-[#CBD5E1]">{workspace.slug}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-[#CBD5E1]">
                    <div className="flex items-center gap-2">
                      <span>{workspace.ownerEmail}</span>
                      <TestAccountBadge isTestAccount={workspace.ownerIsTestAccount} t={t} />
                    </div>
                  </td>
                  <td className="px-4 py-3"><RuntimeBadge status={workspace.runtimeStatus} /></td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${workspace.hasZeroLinkedBrokers ? 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'}`}>
                      {workspace.linkedBrokersCount}/{workspace.totalBrokersCount}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <MembershipSummary remainingDays={workspace.remainingDays} licenseStatus={workspace.licenseStatus} />
                  </td>
                  <td className="px-4 py-3">
                    <PackageSummary label={workspace.packageLabel} status={workspace.packageStatus} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500 dark:text-[#94A3B8]">{formatDate(workspace.createdAt)}</span>
                      <button
                        type="button"
                        onClick={() => openWorkspaceDetails(workspace.id)}
                        className="rounded-xl bg-[#FFF7F0] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#B45309] transition-colors hover:bg-[#FFE6D2] dark:bg-[#3A1E12] dark:text-[#FDBA74] dark:hover:bg-[#4A2514]"
                      >
                        {t.adminDetails}
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="8" className="px-4 py-6 text-center text-sm text-gray-500 dark:text-[#94A3B8]">
                    {t.adminNoWorkspaces}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </ScrollableTableShell>
        <PaginationBar
          label={t.adminWorkspaces}
          currentPage={workspacePage}
          totalPages={workspaceTotalPages}
          totalItems={workspacesTotalFiltered}
          onPrevious={() => setWorkspacePage((current) => Math.max(1, current - 1))}
          onNext={() => setWorkspacePage((current) => Math.min(workspaceTotalPages, current + 1))}
          t={t}
        />
      </section>

      <AdminWorkspaceDetailsModal
        isOpen={Boolean(selectedWorkspaceId)}
        onClose={closeWorkspaceDetails}
        details={workspaceDetails}
        isLoading={isWorkspaceDetailsLoading}
        t={t}
      />

      <AdminGrantWaiverModal
        isOpen={Boolean(selectedWaiverUser)}
        user={selectedWaiverUser}
        isSubmitting={isGrantingWaiver}
        onClose={closeWaiverModal}
        onConfirm={confirmMonthlyWaiver}
        t={t}
      />

      <AdminChargeMembershipModal
        isOpen={Boolean(selectedChargeUser)}
        user={selectedChargeUser}
        preview={chargePreview}
        isPreviewLoading={isChargePreviewLoading}
        isSubmitting={isChargingMembership}
        onClose={closeChargeModal}
        onConfirm={confirmMonthlyCharge}
        t={t}
      />
    </div>
  );
}
