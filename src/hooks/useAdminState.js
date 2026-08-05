import { useEffect, useRef, useState } from 'react';
import { getAdminOverview, getAdminWorkspaceDetails, updateAdminProfileTestAccount } from '../services/supabaseAdmin';
import { adminChargeUserMonthlyMembership, grantUserMonthlyWaiver } from '../services/supabaseLicense';
import { DEFAULT_MONTHLY_AMOUNT, resolveHighestBankroll, resolveMonthlyTier } from '../utils/monthlyPricing';

const EMPTY_OVERVIEW = {
  summary: { usersCount: 0, adminsCount: 0, testAccountsCount: 0, testWorkspacesCount: 0, workspacesCount: 0 },
  users: [],
  workspaces: []
};

function sortByCreatedAt(items, direction) {
  const factor = direction === 'asc' ? 1 : -1;
  return [...items].sort((left, right) => {
    const leftTime = new Date(left.createdAt || 0).getTime();
    const rightTime = new Date(right.createdAt || 0).getTime();
    return (leftTime - rightTime) * factor;
  });
}

function applyUserFilters(users, filters) {
  const emailQuery = filters.email.trim().toLowerCase();
  const roleQuery = filters.role;
  const testAccountsQuery = filters.testAccounts;

  return users.filter((user) => {
    const emailMatches = !emailQuery || user.email.toLowerCase().includes(emailQuery);
    const roleMatches = roleQuery === 'all' || user.role === roleQuery;
    const testMatches =
      testAccountsQuery === 'all'
      || (testAccountsQuery === 'test' && user.isTestAccount)
      || (testAccountsQuery === 'real' && !user.isTestAccount);
    return emailMatches && roleMatches && testMatches;
  });
}

function applyWorkspaceFilters(workspaces, filters) {
  const slugQuery = filters.slug.trim().toLowerCase();
  const emailQuery = filters.email.trim().toLowerCase();
  const runtimeQuery = filters.runtime;
  const brokersQuery = filters.brokers;
  const testAccountsQuery = filters.testAccounts;
  const membershipQuery = filters.membership;
  const packageQuery = filters.packageType;

  return workspaces.filter((workspace) => {
    const slugMatches = !slugQuery || workspace.slug.toLowerCase().includes(slugQuery);
    const ownerMatches = !emailQuery || workspace.ownerEmail.toLowerCase().includes(emailQuery);
    const runtimeMatches = runtimeQuery === 'all' || workspace.runtimeStatus === runtimeQuery;
    const brokersMatches =
      brokersQuery === 'all'
      || (brokersQuery === 'zero' && workspace.linkedBrokersCount === 0)
      || (brokersQuery === 'linked' && workspace.linkedBrokersCount > 0);
    const testMatches =
      testAccountsQuery === 'all'
      || (testAccountsQuery === 'test' && workspace.ownerIsTestAccount)
      || (testAccountsQuery === 'real' && !workspace.ownerIsTestAccount);
    const membershipMatches =
      membershipQuery === 'all'
      || (membershipQuery === 'active' && workspace.licenseStatus === 'active' && workspace.remainingDays > 0)
      || (membershipQuery === 'inactive' && !(workspace.licenseStatus === 'active' && workspace.remainingDays > 0));
    const packageMatches =
      packageQuery === 'all'
      || (packageQuery === 'copy_trading_package' && workspace.packageCode === 'copy_trading_package')
      || (packageQuery === 'none' && workspace.packageCode !== 'copy_trading_package');
    return slugMatches && ownerMatches && runtimeMatches && brokersMatches && testMatches && membershipMatches && packageMatches;
  });
}

function buildPageState(totalItems, pageSize, requestedPage) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(requestedPage, totalPages);
  const start = (currentPage - 1) * pageSize;

  return {
    currentPage,
    totalPages,
    start,
    end: start + pageSize
  };
}

function formatUsd(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(Number(value || 0));
}

export function useAdminState(isAdmin, showToast, t) {
  const showToastRef = useRef(showToast);
  const errorMessageRef = useRef(t.supabaseSyncError);
  const [overview, setOverview] = useState(EMPTY_OVERVIEW);
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [filters, setFilters] = useState({
    email: '',
    slug: '',
    role: 'all',
    runtime: 'all',
    brokers: 'all',
    testAccounts: 'all',
    membership: 'all',
    packageType: 'all'
  });
  const [sortOrders, setSortOrders] = useState({ users: 'desc', workspaces: 'desc' });
  const [userPage, setUserPage] = useState(1);
  const [workspacePage, setWorkspacePage] = useState(1);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(null);
  const [workspaceDetails, setWorkspaceDetails] = useState(null);
  const [isWorkspaceDetailsLoading, setIsWorkspaceDetailsLoading] = useState(false);
  const [selectedWaiverUser, setSelectedWaiverUser] = useState(null);
  const [selectedChargeUser, setSelectedChargeUser] = useState(null);
  const [chargePreview, setChargePreview] = useState(null);
  const [isGrantingWaiver, setIsGrantingWaiver] = useState(false);
  const [isChargePreviewLoading, setIsChargePreviewLoading] = useState(false);
  const [isChargingMembership, setIsChargingMembership] = useState(false);
  const [isUpdatingTestAccount, setIsUpdatingTestAccount] = useState(false);

  const loadOverview = async () => {
    return getAdminOverview();
  };

  const loadWorkspaceDetails = async (workspaceId) => {
    return getAdminWorkspaceDetails(workspaceId);
  };

  useEffect(() => {
    showToastRef.current = showToast;
    errorMessageRef.current = t.supabaseSyncError;
  }, [showToast, t.supabaseSyncError]);

  useEffect(() => {
    let mounted = true;

    if (!isAdmin) {
      setOverview(EMPTY_OVERVIEW);
      setIsAdminLoading(false);
      return undefined;
    }

    setIsAdminLoading(true);

    loadOverview()
      .then((data) => {
        if (!mounted || !data) return;
        setOverview(data);
      })
      .catch(() => {
        if (!mounted) return;
        showToastRef.current(errorMessageRef.current);
      })
      .finally(() => {
        if (!mounted) return;
        setIsAdminLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isAdmin]);

  useEffect(() => {
    let mounted = true;

    if (!isAdmin) {
      return undefined;
    }

    return () => {
      mounted = false;
    };
  }, [isAdmin]);

  useEffect(() => {
    let mounted = true;

    if (!isAdmin || !selectedWorkspaceId) {
      setWorkspaceDetails(null);
      setIsWorkspaceDetailsLoading(false);
      return undefined;
    }

    setIsWorkspaceDetailsLoading(true);

    loadWorkspaceDetails(selectedWorkspaceId)
      .then((data) => {
        if (!mounted) return;
        setWorkspaceDetails(data);
      })
      .catch(() => {
        if (!mounted) return;
        setWorkspaceDetails(null);
        showToastRef.current(errorMessageRef.current);
      })
      .finally(() => {
        if (!mounted) return;
        setIsWorkspaceDetailsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isAdmin, selectedWorkspaceId]);

  const filteredUsers = sortByCreatedAt(applyUserFilters(overview?.users || [], filters), sortOrders.users);
  const filteredWorkspaces = sortByCreatedAt(applyWorkspaceFilters(overview?.workspaces || [], filters), sortOrders.workspaces);
  const workspacePackageCounters = filteredWorkspaces.reduce((acc, workspace) => {
    const membershipActive = workspace.licenseStatus === 'active' && workspace.remainingDays > 0;
    if (membershipActive) acc.baseActive += 1;
    else acc.baseInactive += 1;

    switch (workspace.packageCode) {
      case 'copy_trading_package':
        acc.copy += 1;
        break;
      default:
        acc.none += 1;
        break;
    }

    return acc;
  }, {
    baseActive: 0,
    baseInactive: 0,
    copy: 0,
    none: 0
  });
  const userPageState = buildPageState(filteredUsers.length, 6, userPage);
  const workspacePageState = buildPageState(filteredWorkspaces.length, 6, workspacePage);

  const handleFilterChange = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value
    }));
    setUserPage(1);
    setWorkspacePage(1);
  };

  const handleSortOrderChange = (key, value) => {
    setSortOrders((current) => ({
      ...current,
      [key]: value
    }));
    if (key === 'users') {
      setUserPage(1);
      return;
    }
    setWorkspacePage(1);
  };

  const openWorkspaceDetails = (workspaceId) => {
    setSelectedWorkspaceId(workspaceId);
  };

  const closeWorkspaceDetails = () => {
    setSelectedWorkspaceId(null);
    setWorkspaceDetails(null);
  };

  const openWaiverModal = (user) => {
    setSelectedWaiverUser(user);
  };

  const closeWaiverModal = () => {
    if (isGrantingWaiver) return;
    setSelectedWaiverUser(null);
  };

  const openChargeModal = async (user) => {
    setSelectedChargeUser(user);
    setChargePreview(null);
    setIsChargePreviewLoading(true);

    try {
      const ownerWorkspaces = [...(overview?.workspaces || [])]
        .filter((workspace) => workspace.ownerUserId === user.id)
        .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());
      const primaryWorkspace = ownerWorkspaces[0] || null;

      if (!primaryWorkspace) {
        const fallbackTier = resolveMonthlyTier(0);
        setChargePreview({
          workspaceId: null,
          workspaceName: '',
          workspaceCount: 0,
          bankrollUsd: 0,
          hasDetectedBankroll: false,
          tier: fallbackTier,
          suggestedAmount: fallbackTier.amount
        });
        return;
      }

      const details = await loadWorkspaceDetails(primaryWorkspace.id);
      const bankrollUsd = resolveHighestBankroll(details?.brokers || []);
      const tier = resolveMonthlyTier(bankrollUsd);

      setChargePreview({
        workspaceId: primaryWorkspace.id,
        workspaceName: primaryWorkspace.name || details?.workspace?.name || '',
        workspaceCount: ownerWorkspaces.length,
        bankrollUsd,
        hasDetectedBankroll: bankrollUsd > 0,
        tier,
        suggestedAmount: tier.amount
      });
    } catch {
      const fallbackTier = resolveMonthlyTier(0);
      setChargePreview({
        workspaceId: null,
        workspaceName: '',
        workspaceCount: 0,
        bankrollUsd: 0,
        hasDetectedBankroll: false,
        tier: fallbackTier,
        suggestedAmount: fallbackTier.amount
      });
      showToastRef.current(errorMessageRef.current);
    } finally {
      setIsChargePreviewLoading(false);
    }
  };

  const closeChargeModal = () => {
    if (isChargingMembership) return;
    setSelectedChargeUser(null);
    setChargePreview(null);
    setIsChargePreviewLoading(false);
  };

  const confirmMonthlyWaiver = async (note) => {
    if (!selectedWaiverUser) return false;

    setIsGrantingWaiver(true);

    try {
      const result = await grantUserMonthlyWaiver(selectedWaiverUser.id, note);
      const nextOverview = await loadOverview();
      setOverview(nextOverview);

      if (selectedWorkspaceId === result.workspace_id) {
        const details = await loadWorkspaceDetails(result.workspace_id);
        setWorkspaceDetails(details);
      }

      showToastRef.current(t.adminWaiverGranted);
      setSelectedWaiverUser(null);
      return true;
    } catch {
      showToastRef.current(t.supabaseSaveError);
      return false;
    } finally {
      setIsGrantingWaiver(false);
    }
  };

  const confirmMonthlyCharge = async ({ amount, note }) => {
    if (!selectedChargeUser) return false;

    setIsChargingMembership(true);

    try {
      const result = await adminChargeUserMonthlyMembership(selectedChargeUser.id, {
        amount,
        note,
        days: 30,
        bankrollUsd: chargePreview?.bankrollUsd || 0,
        suggestedAmount: chargePreview?.suggestedAmount || DEFAULT_MONTHLY_AMOUNT,
        tierId: chargePreview?.tier?.id || 'starter',
        tierLabel: chargePreview?.tier?.label || 'US$ 0 a 250'
      });
      const nextOverview = await loadOverview();
      setOverview(nextOverview);

      if (selectedWorkspaceId === result.workspace_id) {
        const details = await loadWorkspaceDetails(result.workspace_id);
        setWorkspaceDetails(details);
      }

      showToastRef.current(t.adminChargeGranted.replace('{amount}', formatUsd(result.charged_amount)));
      setSelectedChargeUser(null);
      setChargePreview(null);
      return true;
    } catch (error) {
      showToastRef.current(error?.message || t.supabaseSaveError);
      return false;
    } finally {
      setIsChargingMembership(false);
    }
  };

  const toggleTestAccount = async (userId, nextValue) => {
    setIsUpdatingTestAccount(true);
    try {
      await updateAdminProfileTestAccount(userId, nextValue);
      const nextOverview = await loadOverview();
      setOverview(nextOverview);

      if (selectedWorkspaceId) {
        const details = await loadWorkspaceDetails(selectedWorkspaceId);
        setWorkspaceDetails(details);
      }

      showToastRef.current(nextValue ? t.adminMarkedAsTest : t.adminUnmarkedAsTest);
      return true;
    } catch (error) {
      showToastRef.current(error?.message || t.supabaseSaveError);
      return false;
    } finally {
      setIsUpdatingTestAccount(false);
    }
  };

  return {
    summary: overview?.summary || EMPTY_OVERVIEW.summary,
    users: filteredUsers.slice(userPageState.start, userPageState.end),
    workspaces: filteredWorkspaces.slice(workspacePageState.start, workspacePageState.end),
    filters,
    setFilter: handleFilterChange,
    sortOrders,
    setSortOrder: handleSortOrderChange,
    userPage,
    workspacePage,
    workspacePackageCounters,
    userTotalPages: userPageState.totalPages,
    workspaceTotalPages: workspacePageState.totalPages,
    setUserPage,
    setWorkspacePage,
    usersTotalFiltered: filteredUsers.length,
    workspacesTotalFiltered: filteredWorkspaces.length,
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
  };
}
