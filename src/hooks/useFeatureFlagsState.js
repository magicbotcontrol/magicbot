import { useEffect, useRef, useState } from 'react';
import {
  getAppFeatureFlags,
  setAppFeatureFlag,
  SIGNALS_AUTOMATOR_MAINTENANCE_KEY
} from '../services/supabaseFeatureFlags';

const DEFAULT_FLAGS = {
  [SIGNALS_AUTOMATOR_MAINTENANCE_KEY]: {
    featureKey: SIGNALS_AUTOMATOR_MAINTENANCE_KEY,
    isEnabled: false,
    note: '',
    updatedAt: null
  }
};

export function useFeatureFlagsState(isLoggedIn, isAdmin, showToast, t) {
  const showToastRef = useRef(showToast);
  const [flags, setFlags] = useState(DEFAULT_FLAGS);
  const [isFeatureFlagsLoading, setIsFeatureFlagsLoading] = useState(false);
  const [isTogglingSignalsAutomatorMaintenance, setIsTogglingSignalsAutomatorMaintenance] = useState(false);

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

  const toggleSignalsAutomatorMaintenance = async () => {
    if (!isAdmin) return false;

    const currentFlag = flags[SIGNALS_AUTOMATOR_MAINTENANCE_KEY] || DEFAULT_FLAGS[SIGNALS_AUTOMATOR_MAINTENANCE_KEY];
    const nextValue = !currentFlag.isEnabled;
    setIsTogglingSignalsAutomatorMaintenance(true);

    try {
      const updatedFlag = await setAppFeatureFlag(
        SIGNALS_AUTOMATOR_MAINTENANCE_KEY,
        nextValue,
        nextValue
          ? 'AutoTrader (Lista) em manutencao pelo painel admin'
          : 'AutoTrader (Lista) liberado pelo painel admin'
      );

      setFlags((current) => ({
        ...current,
        [SIGNALS_AUTOMATOR_MAINTENANCE_KEY]: updatedFlag
      }));

      showToastRef.current?.(nextValue ? t.adminSignalsMaintenanceEnabled : t.adminSignalsMaintenanceDisabled);
      return true;
    } catch {
      showToastRef.current?.(t.supabaseSaveError);
      return false;
    } finally {
      setIsTogglingSignalsAutomatorMaintenance(false);
    }
  };

  return {
    flags,
    isFeatureFlagsLoading,
    isTogglingSignalsAutomatorMaintenance,
    isSignalsAutomatorMaintenanceActive: Boolean(flags[SIGNALS_AUTOMATOR_MAINTENANCE_KEY]?.isEnabled),
    toggleSignalsAutomatorMaintenance,
    reloadFeatureFlags: loadFlags
  };
}
