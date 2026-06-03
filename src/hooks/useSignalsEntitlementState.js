import { useEffect, useRef, useState } from 'react';
import { getWorkspaceSignalsEntitlement } from '../services/supabaseEntitlements';

const EMPTY = {
  status: 'inactive',
  expiresAt: null,
  remainingDays: 0
};

export function useSignalsEntitlementState(workspaceId, isLoggedIn, showToast, t) {
  const showToastRef = useRef(showToast);
  const errorMessageRef = useRef(t.supabaseSyncError);
  const [entitlement, setEntitlement] = useState(EMPTY);
  const [isEntitlementLoading, setIsEntitlementLoading] = useState(false);

  useEffect(() => {
    showToastRef.current = showToast;
    errorMessageRef.current = t.supabaseSyncError;
  }, [showToast, t.supabaseSyncError]);

  useEffect(() => {
    let mounted = true;

    if (!isLoggedIn || !workspaceId) {
      setEntitlement(EMPTY);
      setIsEntitlementLoading(false);
      return undefined;
    }

    setIsEntitlementLoading(true);

    getWorkspaceSignalsEntitlement(workspaceId)
      .then((data) => {
        if (!mounted) return;
        setEntitlement(data || EMPTY);
      })
      .catch(() => {
        if (!mounted) return;
        setEntitlement(EMPTY);
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

  const isSignalsListActive = entitlement.status === 'active' && entitlement.remainingDays > 0;

  return {
    signalsEntitlement: entitlement,
    isEntitlementLoading,
    isSignalsListActive
  };
}

