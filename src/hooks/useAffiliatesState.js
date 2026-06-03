import { useEffect, useRef, useState } from 'react';
import { getAffiliateOverview } from '../services/supabaseAffiliates';

const EMPTY_AFFILIATE_OVERVIEW = {
  summary: {
    level1Count: 0,
    level2Count: 0,
    totalLeads: 0,
    activeCount: 0,
    activeLevel1Count: 0,
    activeLevel2Count: 0
  },
  network: {
    level1: [],
    level2: []
  }
};

export function useAffiliatesState(isLoggedIn, showToast, t) {
  const showToastRef = useRef(showToast);
  const syncErrorMessageRef = useRef(t.supabaseSyncError);
  const [overview, setOverview] = useState(EMPTY_AFFILIATE_OVERVIEW);
  const [isAffiliatesLoading, setIsAffiliatesLoading] = useState(false);

  useEffect(() => {
    showToastRef.current = showToast;
    syncErrorMessageRef.current = t.supabaseSyncError;
  }, [showToast, t.supabaseSyncError]);

  useEffect(() => {
    let mounted = true;

    if (!isLoggedIn) {
      setOverview(EMPTY_AFFILIATE_OVERVIEW);
      setIsAffiliatesLoading(false);
      return undefined;
    }

    setIsAffiliatesLoading(true);

    getAffiliateOverview()
      .then((data) => {
        if (!mounted || !data) return;
        setOverview(data);
      })
      .catch(() => {
        if (!mounted) return;
        setOverview(EMPTY_AFFILIATE_OVERVIEW);
        showToastRef.current(syncErrorMessageRef.current);
      })
      .finally(() => {
        if (!mounted) return;
        setIsAffiliatesLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isLoggedIn]);

  return {
    affiliateSummary: overview.summary,
    affiliateNetwork: overview.network,
    isAffiliatesLoading
  };
}
