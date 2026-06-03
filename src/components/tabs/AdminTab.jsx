import { ScrollableTableShell } from '../ScrollableTableShell';
import { Icons } from '../../constants/icons';
import { AdminWorkspaceDetailsModal } from '../modals/AdminWorkspaceDetailsModal';
import { AdminGrantWaiverModal } from '../modals/AdminGrantWaiverModal';

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
  summary,
  users,
  workspaces,
  filters,
  setFilter,
  sortOrders,
  setSortOrder,
  userPage,
  workspacePage,
  userTotalPages,
  workspaceTotalPages,
  setUserPage,
  setWorkspacePage,
  usersTotalFiltered,
  workspacesTotalFiltered,
  selectedWorkspaceId,
  workspaceDetails,
  selectedWaiverUser,
  isAdminLoading,
  isWorkspaceDetailsLoading,
  isGrantingWaiver,
  openWorkspaceDetails,
  closeWorkspaceDetails,
  openWaiverModal,
  closeWaiverModal,
  confirmMonthlyWaiver
}) {
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
      </div>

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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
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
                <th className="px-4 py-3 text-left font-bold">{t.adminLists}</th>
                <th className="px-4 py-3 text-left font-bold">{t.adminResult}</th>
                <th className="px-4 py-3 text-left font-bold">{t.adminWorkspaceCount}</th>
                <th className="px-4 py-3 text-left font-bold">{t.adminCreatedAt}</th>
                <th className="px-4 py-3 text-left font-bold">{t.action}</th>
              </tr>
            </thead>
            <tbody>
              {users.length ? users.map((user) => (
                <tr key={user.id} className="border-t border-gray-100 dark:border-[#1F2A3A]">
                  <td className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-200">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${user.role === 'admin' ? 'bg-[#FFF7F0] text-[#B45309] dark:bg-[#3A1E12] dark:text-[#FDBA74]' : 'bg-gray-100 text-gray-600 dark:bg-[#1E293B] dark:text-[#CBD5E1]'}`}>
                      {user.role === 'admin' ? t.adminRoleAdmin : t.adminRoleUser}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-[#CBD5E1]">{t[`adminSubscription${user.licenseAccessType.charAt(0).toUpperCase()}${user.licenseAccessType.slice(1)}`] || user.licenseAccessType}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-[#CBD5E1]">{t.adminDaysLeftCompact.replace('{days}', user.remainingDays)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-[#CBD5E1]">{user.signalListsCount}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-[#CBD5E1]">{user.wins}W / {user.losses}L</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-[#CBD5E1]">{user.workspacesCount}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-[#94A3B8]">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3">
                    {user.role === 'admin' ? (
                      <span className="text-xs font-semibold text-gray-400">{t.adminProtectedAccount}</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openWaiverModal(user)}
                        className="rounded-xl bg-[#FFF7F0] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#B45309] transition-colors hover:bg-[#FFE6D2] dark:bg-[#3A1E12] dark:text-[#FDBA74] dark:hover:bg-[#4A2514]"
                      >
                        {t.adminWaiverAction}
                      </button>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="9" className="px-4 py-6 text-center text-sm text-gray-500 dark:text-[#94A3B8]">
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
        <ScrollableTableShell minWidthClass="min-w-[1240px]" hintLabel={t.swipeHint}>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-[#0F172A] text-gray-500 dark:text-[#94A3B8]">
              <tr>
                <th className="px-4 py-3 text-left font-bold">{t.adminWorkspaceName}</th>
                <th className="px-4 py-3 text-left font-bold">{t.adminWorkspaceSlug}</th>
                <th className="px-4 py-3 text-left font-bold">{t.adminWorkspaceOwner}</th>
                <th className="px-4 py-3 text-left font-bold">{t.adminHealthRuntime}</th>
                <th className="px-4 py-3 text-left font-bold">{t.adminHealthBrokers}</th>
                <th className="px-4 py-3 text-left font-bold">{t.adminTimeLeft}</th>
                <th className="px-4 py-3 text-left font-bold">{t.adminLists}</th>
                <th className="px-4 py-3 text-left font-bold">{t.adminResult}</th>
                <th className="px-4 py-3 text-left font-bold">{t.adminCreatedAt}</th>
              </tr>
            </thead>
            <tbody>
              {workspaces.length ? workspaces.map((workspace) => (
                <tr key={workspace.id} className={`border-t border-gray-100 dark:border-[#1F2A3A] ${workspace.hasZeroLinkedBrokers ? 'bg-red-50/40 dark:bg-red-950/10' : ''}`}>
                  <td className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-200">{workspace.name}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-[#CBD5E1]">{workspace.slug}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-[#CBD5E1]">{workspace.ownerEmail}</td>
                  <td className="px-4 py-3"><RuntimeBadge status={workspace.runtimeStatus} /></td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${workspace.hasZeroLinkedBrokers ? 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'}`}>
                      {workspace.linkedBrokersCount}/{workspace.totalBrokersCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-[#CBD5E1]">{t.adminDaysLeftCompact.replace('{days}', workspace.remainingDays)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-[#CBD5E1]">{workspace.signalListsCount}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-[#CBD5E1]">{workspace.wins}W / {workspace.losses}L</td>
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
                  <td colSpan="9" className="px-4 py-6 text-center text-sm text-gray-500 dark:text-[#94A3B8]">
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
    </div>
  );
}
