import { useEffect, useRef, useState } from 'react';
import { getAdminOverview, getAdminWorkspaceDetails, updateAdminProfileTestAccount } from '../services/supabaseAdmin';
import { getAdminDailySignalFeed, listAdminDailySignalFeeds, saveAdminDailySignalFeed } from '../services/supabaseAdminSignals';
import {
  adminGrantAutomatorEntitlement,
  adminGrantSignalsBundleEntitlement,
  adminGrantSignalsEntitlement,
  adminRevokeAutomatorEntitlement,
  adminRevokeSignalsBundleEntitlement,
  adminRevokeSignalsEntitlement
} from '../services/supabaseEntitlements';
import { grantUserMonthlyWaiver } from '../services/supabaseLicense';

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
    return slugMatches && ownerMatches && runtimeMatches && brokersMatches && testMatches;
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

export function useAdminState(isAdmin, showToast, t) {
  const showToastRef = useRef(showToast);
  const errorMessageRef = useRef(t.supabaseSyncError);
  const [overview, setOverview] = useState(EMPTY_OVERVIEW);
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [filters, setFilters] = useState({ email: '', slug: '', role: 'all', runtime: 'all', brokers: 'all', testAccounts: 'all' });
  const [sortOrders, setSortOrders] = useState({ users: 'desc', workspaces: 'desc' });
  const [userPage, setUserPage] = useState(1);
  const [workspacePage, setWorkspacePage] = useState(1);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(null);
  const [workspaceDetails, setWorkspaceDetails] = useState(null);
  const [isWorkspaceDetailsLoading, setIsWorkspaceDetailsLoading] = useState(false);
  const [selectedWaiverUser, setSelectedWaiverUser] = useState(null);
  const [isGrantingWaiver, setIsGrantingWaiver] = useState(false);
  const [isUpdatingTestAccount, setIsUpdatingTestAccount] = useState(false);
  const [signalsFeedDate, setSignalsFeedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [signalsFeedMarket, setSignalsFeedMarket] = useState('ob');
  const [signalsFeedAssets, setSignalsFeedAssets] = useState([]);
  const [signalsFeedAsset, setSignalsFeedAsset] = useState('');
  const [signalsFeedAssetInput, setSignalsFeedAssetInput] = useState('');
  const [signalsFeedText, setSignalsFeedText] = useState('');
  const [isSignalsFeedLoading, setIsSignalsFeedLoading] = useState(false);
  const [isSignalsFeedSaving, setIsSignalsFeedSaving] = useState(false);
  const [isGrantingSignalsAccess, setIsGrantingSignalsAccess] = useState(false);

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
      setSignalsFeedText('');
      setSignalsFeedAssets([]);
      setSignalsFeedAsset('');
      setSignalsFeedAssetInput('');
      setIsSignalsFeedLoading(false);
      return undefined;
    }

    setIsSignalsFeedLoading(true);

    listAdminDailySignalFeeds(signalsFeedDate, signalsFeedMarket)
      .then((feeds) => {
        if (!mounted) return;
        const items = feeds || [];
        setSignalsFeedAssets(items);
        const nextAsset = items.find((item) => item.asset === signalsFeedAsset)?.asset || items[0]?.asset || '';
        setSignalsFeedAsset(nextAsset);
        setSignalsFeedAssetInput(nextAsset);
      })
      .catch(() => {
        if (!mounted) return;
        setSignalsFeedText('');
        setSignalsFeedAssets([]);
        setSignalsFeedAsset('');
        setSignalsFeedAssetInput('');
        showToastRef.current(errorMessageRef.current);
      });

    return () => {
      mounted = false;
    };
  }, [isAdmin, signalsFeedDate, signalsFeedMarket]);

  useEffect(() => {
    let mounted = true;
    if (!isAdmin || !signalsFeedAsset) {
      setSignalsFeedText('');
      setIsSignalsFeedLoading(false);
      return undefined;
    }

    setIsSignalsFeedLoading(true);

    getAdminDailySignalFeed(signalsFeedDate, signalsFeedMarket, signalsFeedAsset)
      .then((data) => {
        if (!mounted) return;
        setSignalsFeedText(data.rawText || '');
      })
      .catch(() => {
        if (!mounted) return;
        setSignalsFeedText('');
        showToastRef.current(errorMessageRef.current);
      })
      .finally(() => {
        if (!mounted) return;
        setIsSignalsFeedLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isAdmin, signalsFeedDate, signalsFeedMarket, signalsFeedAsset]);

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

  const saveSignalsFeed = async () => {
    setIsSignalsFeedSaving(true);
    try {
      const assetValue = signalsFeedAssetInput || signalsFeedAsset;
      await saveAdminDailySignalFeed(signalsFeedDate, signalsFeedMarket, assetValue, signalsFeedText, 'Publicado pelo painel admin');
      const feeds = await listAdminDailySignalFeeds(signalsFeedDate, signalsFeedMarket);
      setSignalsFeedAssets(feeds || []);
      if (assetValue) {
        setSignalsFeedAsset(String(assetValue).trim().toUpperCase());
        setSignalsFeedAssetInput(String(assetValue).trim().toUpperCase());
      }
      showToastRef.current('Lista diária publicada com sucesso.');
      return true;
    } catch (error) {
      showToastRef.current(error?.message || t.supabaseSaveError);
      return false;
    } finally {
      setIsSignalsFeedSaving(false);
    }
  };

  const grantDailyListAccess = async (days) => {
    if (!selectedWorkspaceId) return false;
    setIsGrantingSignalsAccess(true);
    try {
      await adminGrantSignalsEntitlement(selectedWorkspaceId, days, `Liberado via admin por ${days} dias`);
      const [nextOverview, details] = await Promise.all([
        loadOverview(),
        loadWorkspaceDetails(selectedWorkspaceId)
      ]);
      setOverview(nextOverview);
      setWorkspaceDetails(details);
      showToastRef.current(`Acesso ao produto Sinais Diários OB liberado por ${days} dias.`);
      return true;
    } catch {
      showToastRef.current(t.supabaseSaveError);
      return false;
    } finally {
      setIsGrantingSignalsAccess(false);
    }
  };

  const revokeDailyListAccess = async () => {
    if (!selectedWorkspaceId) return false;
    setIsGrantingSignalsAccess(true);
    try {
      await adminRevokeSignalsEntitlement(selectedWorkspaceId, 'Revogado via painel admin');
      const [nextOverview, details] = await Promise.all([
        loadOverview(),
        loadWorkspaceDetails(selectedWorkspaceId)
      ]);
      setOverview(nextOverview);
      setWorkspaceDetails(details);
      showToastRef.current('Acesso ao produto Sinais Diários OB revogado.');
      return true;
    } catch {
      showToastRef.current(t.supabaseSaveError);
      return false;
    } finally {
      setIsGrantingSignalsAccess(false);
    }
  };

  const grantAutomatorAccess = async (days) => {
    if (!selectedWorkspaceId) return false;
    setIsGrantingSignalsAccess(true);
    try {
      await adminGrantAutomatorEntitlement(selectedWorkspaceId, days, `Liberado via admin por ${days} dias`);
      const [nextOverview, details] = await Promise.all([
        loadOverview(),
        loadWorkspaceDetails(selectedWorkspaceId)
      ]);
      setOverview(nextOverview);
      setWorkspaceDetails(details);
      showToastRef.current(`Acesso ao produto AutoTrader (Lista) liberado por ${days} dias.`);
      return true;
    } catch {
      showToastRef.current(t.supabaseSaveError);
      return false;
    } finally {
      setIsGrantingSignalsAccess(false);
    }
  };

  const revokeAutomatorAccess = async () => {
    if (!selectedWorkspaceId) return false;
    setIsGrantingSignalsAccess(true);
    try {
      await adminRevokeAutomatorEntitlement(selectedWorkspaceId, 'Revogado via painel admin');
      const [nextOverview, details] = await Promise.all([
        loadOverview(),
        loadWorkspaceDetails(selectedWorkspaceId)
      ]);
      setOverview(nextOverview);
      setWorkspaceDetails(details);
      showToastRef.current('Acesso ao produto AutoTrader (Lista) revogado.');
      return true;
    } catch {
      showToastRef.current(t.supabaseSaveError);
      return false;
    } finally {
      setIsGrantingSignalsAccess(false);
    }
  };

  const grantSignalsBundleAccess = async (days) => {
    if (!selectedWorkspaceId) return false;
    setIsGrantingSignalsAccess(true);
    try {
      await adminGrantSignalsBundleEntitlement(selectedWorkspaceId, days, `Liberado via admin por ${days} dias`);
      const [nextOverview, details] = await Promise.all([
        loadOverview(),
        loadWorkspaceDetails(selectedWorkspaceId)
      ]);
      setOverview(nextOverview);
      setWorkspaceDetails(details);
      showToastRef.current(`AutoTrader (Lista) + Sinais Diários OB liberados por ${days} dias.`);
      return true;
    } catch {
      showToastRef.current(t.supabaseSaveError);
      return false;
    } finally {
      setIsGrantingSignalsAccess(false);
    }
  };

  const revokeSignalsBundleAccess = async () => {
    if (!selectedWorkspaceId) return false;
    setIsGrantingSignalsAccess(true);
    try {
      await adminRevokeSignalsBundleEntitlement(selectedWorkspaceId, 'Revogado via painel admin');
      const [nextOverview, details] = await Promise.all([
        loadOverview(),
        loadWorkspaceDetails(selectedWorkspaceId)
      ]);
      setOverview(nextOverview);
      setWorkspaceDetails(details);
      showToastRef.current('AutoTrader (Lista) + Sinais Diários OB revogados.');
      return true;
    } catch {
      showToastRef.current(t.supabaseSaveError);
      return false;
    } finally {
      setIsGrantingSignalsAccess(false);
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
    userTotalPages: userPageState.totalPages,
    workspaceTotalPages: workspacePageState.totalPages,
    setUserPage,
    setWorkspacePage,
    usersTotalFiltered: filteredUsers.length,
    workspacesTotalFiltered: filteredWorkspaces.length,
    selectedWorkspaceId,
    workspaceDetails,
    selectedWaiverUser,
    signalsFeedDate,
    signalsFeedMarket,
    signalsFeedAssets,
    signalsFeedAsset,
    signalsFeedAssetInput,
    signalsFeedText,
    isAdminLoading,
    isWorkspaceDetailsLoading,
    isGrantingWaiver,
    isUpdatingTestAccount,
    isSignalsFeedLoading,
    isSignalsFeedSaving,
    isGrantingSignalsAccess,
    openWorkspaceDetails,
    closeWorkspaceDetails,
    openWaiverModal,
    closeWaiverModal,
    confirmMonthlyWaiver,
    toggleTestAccount,
    setSignalsFeedDate,
    setSignalsFeedMarket,
    setSignalsFeedAssets,
    setSignalsFeedAsset,
    setSignalsFeedAssetInput,
    setSignalsFeedText,
    saveSignalsFeed,
    grantDailyListAccess,
    revokeDailyListAccess,
    grantAutomatorAccess,
    revokeAutomatorAccess,
    grantSignalsBundleAccess,
    revokeSignalsBundleAccess
  };
}
