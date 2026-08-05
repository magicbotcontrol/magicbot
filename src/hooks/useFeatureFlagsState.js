import { useEffect, useRef, useState } from 'react';
import {
  getAppFeatureFlags,
  PHASE1_COPYTRADING_ONLY_KEY
} from '../services/supabaseFeatureFlags';

const DEFAULT_FLAGS = {
  [PHASE1_COPYTRADING_ONLY_KEY]: {
    featureKey: PHASE1_COPYTRADING_ONLY_KEY,
    isEnabled: false,
    note: '',
    updatedAt: null
  }
};

export function useFeatureFlagsState(isLoggedIn, isAdmin, showToast, t) {
  const showToastRef = useRef(showToast);
  const [flags, setFlags] = useState(DEFAULT_FLAGS);
  const [isFeatureFlagsLoading, setIsFeatureFlagsLoading] = useState(false);

  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  const loadFlags = async () => {
    const nextFlags = await getAppFeatureFlags();
    setFlags(nextFlags);
    return nextFlags;
  };

  useEffect(() => {
    let mounted = true;
    let intervalId = null;

    if (!isLoggedIn) {
      setFlags(DEFAULT_FLAGS);
      setIsFeatureFlagsLoading(false);
      return undefined;
    }

    setIsFeatureFlagsLoading(true);

    loadFlags()
      .catch(() => {
        if (!mounted) return;
        showToastRef.current?.(t.supabaseSyncError);
      })
      .finally(() => {
        if (!mounted) return;
        setIsFeatureFlagsLoading(false);
      });

    intervalId = window.setInterval(() => {
      loadFlags().catch(() => {});
    }, 20000);

    return () => {
      mounted = false;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [isLoggedIn, t.supabaseSyncError]);

  return {
    flags,
    isFeatureFlagsLoading,
    isPhase1CopyTradingOnlyActive: Boolean(flags[PHASE1_COPYTRADING_ONLY_KEY]?.isEnabled),
    reloadFeatureFlags: loadFlags
  };
}
