import { useEffect, useRef, useState } from 'react';
import { getDashboardMetrics } from '../services/supabaseDashboard';

const EMPTY = {
  totalProfitLoss: 0,
  winRate: 0,
  activeSignals: 0,
  operations: 0,
  weeklyProfitLoss: Array.from({ length: 7 }, () => 0),
  recentLogs: []
};

export function useDashboardState(workspaceId, isLoggedIn, showToast, t) {
  const showToastRef = useRef(showToast);
  const errorMessageRef = useRef(t.supabaseSyncError);
  const [metrics, setMetrics] = useState(EMPTY);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    showToastRef.current = showToast;
    errorMessageRef.current = t.supabaseSyncError;
  }, [showToast, t.supabaseSyncError]);

  useEffect(() => {
    let mounted = true;

    if (!isLoggedIn || !workspaceId) {
      setMetrics(EMPTY);
      setIsLoading(false);
      return undefined;
    }

    setIsLoading(true);

    getDashboardMetrics(workspaceId)
      .then((data) => {
        if (!mounted) return;
        setMetrics(data || EMPTY);
      })
      .catch(() => {
        if (!mounted) return;
        setMetrics(EMPTY);
        showToastRef.current(errorMessageRef.current);
      })
      .finally(() => {
        if (!mounted) return;
        setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [workspaceId, isLoggedIn]);

  return {
    metrics,
    isDashboardLoading: isLoading
  };
}

