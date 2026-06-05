import { useEffect, useRef, useState } from 'react';
import { getWorkspaceAutomatorEntitlement, getWorkspaceSignalsEntitlement } from '../services/supabaseEntitlements';

const EMPTY = {
  status: 'inactive',
  expiresAt: null,
  remainingDays: 0
};

export function useSignalsEntitlementState(workspaceId, isLoggedIn, showToast, t) {
  const showToastRef = useRef(showToast);
  const errorMessageRef = useRef(t.supabaseSyncError);
  const [dailyListEntitlement, setDailyListEntitlement] = useState(EMPTY);
  const [automatorEntitlement, setAutomatorEntitlement] = useState(EMPTY);
  const [isEntitlementLoading, setIsEntitlementLoading] = useState(false);

  useEffect(() => {
    showToastRef.current = showToast;
    errorMessageRef.current = t.supabaseSyncError;
  }, [showToast, t.supabaseSyncError]);

  useEffect(() => {
    let mounted = true;

    if (!isLoggedIn || !workspaceId) {
      setDailyListEntitlement(EMPTY);
      setAutomatorEntitlement(EMPTY);
      setIsEntitlementLoading(false);
      return undefined;
    }

    setIsEntitlementLoading(true);

    Promise.all([
      getWorkspaceSignalsEntitlement(workspaceId),
      getWorkspaceAutomatorEntitlement(workspaceId)
    ])
      .then(([daily, automator]) => {
        if (!mounted) return;
        setDailyListEntitlement(daily || EMPTY);
        setAutomatorEntitlement(automator || EMPTY);
      })
      .catch(() => {
        if (!mounted) return;
        setDailyListEntitlement(EMPTY);
        setAutomatorEntitlement(EMPTY);
        showToastRef.current(errorMessageRef.current);
      })
      .finally(() => {
        if (!mounted) return;
        setIsEntitlementLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [workspaceId, isLoggedIn]);

  const isSignalsDailyListActive = dailyListEntitlement.status === 'active' && dailyListEntitlement.remainingDays > 0;
  const isSignalsAutomatorActive = automatorEntitlement.status === 'active' && automatorEntitlement.remainingDays > 0;

  return {
    dailyListEntitlement,
    automatorEntitlement,
    isEntitlementLoading,
    isSignalsDailyListActive,
    isSignalsAutomatorActive
  };
}
