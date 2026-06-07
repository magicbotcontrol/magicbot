import { useEffect, useRef, useState } from 'react';
import { getWorkspaceEntitlement } from '../services/supabaseEntitlements';

const EMPTY = {
  status: 'inactive',
  expiresAt: null,
  remainingDays: 0
};

export function useCopyTradingEntitlementState(workspaceId, isLoggedIn, showToast, t) {
  const showToastRef = useRef(showToast);
  const errorMessageRef = useRef(t.supabaseSyncError);
  const [copyEntitlement, setCopyEntitlement] = useState(EMPTY);
  const [isCopyEntitlementLoading, setIsCopyEntitlementLoading] = useState(false);

  useEffect(() => {
    showToastRef.current = showToast;
    errorMessageRef.current = t.supabaseSyncError;
  }, [showToast, t.supabaseSyncError]);

  useEffect(() => {
    let mounted = true;

    if (!isLoggedIn || !workspaceId) {
      setCopyEntitlement(EMPTY);
      setIsCopyEntitlementLoading(false);
      return undefined;
    }

    setIsCopyEntitlementLoading(true);

    getWorkspaceEntitlement(workspaceId, 'copy_trading')
      .then((entitlement) => {
        if (!mounted) return;
        setCopyEntitlement(entitlement || EMPTY);
      })
      .catch(() => {
        if (!mounted) return;
        setCopyEntitlement(EMPTY);
        showToastRef.current(errorMessageRef.current);
      })
      .finally(() => {
        if (!mounted) return;
        setIsCopyEntitlementLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [workspaceId, isLoggedIn]);

  const isCopyTradingActive = copyEntitlement.status === 'active' && copyEntitlement.remainingDays > 0;

  return {
    copyEntitlement,
    isCopyEntitlementLoading,
    isCopyTradingActive
  };
}
