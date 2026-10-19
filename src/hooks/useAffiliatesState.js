import { useCallback, useEffect, useRef, useState } from 'react';
import {
  emptyAffiliateWallet,
  getAffiliateOverview,
  getAffiliateWallet,
  requestAffiliateWithdrawal
} from '../services/supabaseAffiliates';

const EMPTY_AFFILIATE_OVERVIEW = {
  summary: {
    canReceiveBonuses: false,
    level1Count: 0,
    level2Count: 0,
    totalLeads: 0,
    networkCount: 0,
    activeCount: 0,
    activeNetworkCount: 0,
    activeLevel1Count: 0,
    activeLevel2Count: 0,
    maxDepthReached: 0,
    matrixFilledCount: 0,
    matrixCapacity: 0,
    unilevelEstimatedAmount: 0,
    matrixEstimatedAmount: 0,
    totalEstimatedAmount: 0
  },
  network: {
    level1: [],
    level2: [],
    levels: []
  },
  matrix: {
    rows: []
  }
};

export function useAffiliatesState(isLoggedIn, showToast, t) {
  const showToastRef = useRef(showToast);
  const syncErrorMessageRef = useRef(t.supabaseSyncError);
  const [overview, setOverview] = useState(EMPTY_AFFILIATE_OVERVIEW);
  const [wallet, setWallet] = useState(emptyAffiliateWallet());
  const [isAffiliatesLoading, setIsAffiliatesLoading] = useState(false);
  const [isWalletLoading, setIsWalletLoading] = useState(false);
  const [isWithdrawSubmitting, setIsWithdrawSubmitting] = useState(false);

  useEffect(() => {
    showToastRef.current = showToast;
    syncErrorMessageRef.current = t.supabaseSyncError;
  }, [showToast, t.supabaseSyncError]);

  const reloadWallet = useCallback(async () => {
    const data = await getAffiliateWallet();
    setWallet(data);
    return data;
  }, []);

  useEffect(() => {
    let mounted = true;

    if (!isLoggedIn) {
      setOverview(EMPTY_AFFILIATE_OVERVIEW);
      setWallet(emptyAffiliateWallet());
      setIsAffiliatesLoading(false);
      setIsWalletLoading(false);
      return undefined;
    }

    setIsAffiliatesLoading(true);
    setIsWalletLoading(true);

    Promise.all([
      getAffiliateOverview(),
      getAffiliateWallet().catch(() => emptyAffiliateWallet())
    ])
      .then(([overviewData, walletData]) => {
        if (!mounted) return;
        if (overviewData) setOverview(overviewData);
        setWallet(walletData || emptyAffiliateWallet());
      })
      .catch(() => {
        if (!mounted) return;
        setOverview(EMPTY_AFFILIATE_OVERVIEW);
        setWallet(emptyAffiliateWallet());
        showToastRef.current(syncErrorMessageRef.current);
      })
      .finally(() => {
        if (!mounted) return;
        setIsAffiliatesLoading(false);
        setIsWalletLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isLoggedIn]);

  const submitWithdrawal = async ({ amountUsd, walletAddress, currency, note }) => {
    setIsWithdrawSubmitting(true);
    try {
      const result = await requestAffiliateWithdrawal({ amountUsd, walletAddress, currency, note });
      if (result?.wallet) {
        setWallet(result.wallet);
      } else {
        await reloadWallet();
      }
      showToastRef.current('Solicitacao de saque enviada.');
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel solicitar o saque.';
      showToastRef.current(message);
      throw error;
    } finally {
      setIsWithdrawSubmitting(false);
    }
  };

  return {
    affiliateSummary: overview.summary,
    affiliateNetwork: overview.network,
    affiliateMatrix: overview.matrix,
    affiliateWallet: wallet,
    isAffiliatesLoading,
    isWalletLoading,
    isWithdrawSubmitting,
    reloadAffiliateWallet: reloadWallet,
    submitAffiliateWithdrawal: submitWithdrawal
  };
}
