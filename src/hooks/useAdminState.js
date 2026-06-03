import { useEffect, useRef, useState } from 'react';
import { getAdminOverview, getAdminWorkspaceDetails } from '../services/supabaseAdmin';
import { grantUserMonthlyWaiver } from '../services/supabaseLicense';

const EMPTY_OVERVIEW = {
  summary: { usersCount: 0, adminsCount: 0, workspacesCount: 0 },
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

  return users.filter((user) => {
    const emailMatches = !emailQuery || user.email.toLowerCase().includes(emailQuery);
    const roleMatches = roleQuery === 'all' || user.role === roleQuery;
    return emailMatches && roleMatches;
  });
}

function applyWorkspaceFilters(workspaces, filters) {
  const slugQuery = filters.slug.trim().toLowerCase();
  const emailQuery = filters.email.trim().toLowerCase();
  const runtimeQuery = filters.runtime;
  const brokersQuery = filters.brokers;

  return workspaces.filter((workspace) => {
    const slugMatches = !slugQuery || workspace.slug.toLowerCase().includes(slugQuery);
    const ownerMatches = !emailQuery || workspace.ownerEmail.toLowerCase().includes(emailQuery);
    const runtimeMatches = runtimeQuery === 'all' || workspace.runtimeStatus === runtimeQuery;
    const brokersMatches =
      brokersQuery === 'all'
      || (brokersQuery === 'zero' && workspace.linkedBrokersCount === 0)
      || (brokersQuery === 'linked' && workspace.linkedBrokersCount > 0);
    return slugMatches && ownerMatches && runtimeMatches && brokersMatches;
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
  const [filters, setFilters] = useState({ email: '', slug: '', role: 'all', runtime: 'all', brokers: 'all' });
  const [sortOrders, setSortOrders] = useState({ users: 'desc', workspaces: 'desc' });
  const [userPage, setUserPage] = useState(1);
  const [workspacePage, setWorkspacePage] = useState(1);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(null);
  const [workspaceDetails, setWorkspaceDetails] = useState(null);
  const [isWorkspaceDetailsLoading, setIsWorkspaceDetailsLoading] = useState(false);
  const [selectedWaiverUser, setSelectedWaiverUser] = useState(null);
  const [isGrantingWaiver, setIsGrantingWaiver] = useState(false);

  const loadOverview = async () => {
    return getAdminOverview();
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

    if (!isAdmin || !selectedWorkspaceId) {
      setWorkspaceDetails(null);
      setIsWorkspaceDetailsLoading(false);
      return undefined;
    }

    setIsWorkspaceDetailsLoading(true);

    getAdminWorkspaceDetails(selectedWorkspaceId)
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
        const details = await getAdminWorkspaceDetails(result.workspace_id);
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
    isAdminLoading,
    isWorkspaceDetailsLoading,
    isGrantingWaiver,
    openWorkspaceDetails,
    closeWorkspaceDetails,
    openWaiverModal,
    closeWaiverModal,
    confirmMonthlyWaiver
  };
}
