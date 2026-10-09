import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_COMMERCIAL_CONFIG, normalizeCommercialConfig } from '../constants/commercialModel';
import {
  getCommercialConfig,
  listPlatformSignals,
  removePlatformSignal,
  saveCommercialConfig,
  savePlatformSignal
} from '../services/supabaseCommercial';

export function useCommercialState(isLoggedIn, showToast) {
  const [config, setConfig] = useState(DEFAULT_COMMERCIAL_CONFIG);
  const [signals, setSignals] = useState([]);
  const [isCommercialLoading, setIsCommercialLoading] = useState(false);

  const reloadCommercial = useCallback(async () => {
    const [nextConfig, nextSignals] = await Promise.all([
      getCommercialConfig(),
      listPlatformSignals()
    ]);
    setConfig(nextConfig);
    setSignals(nextSignals);
    return { config: nextConfig, signals: nextSignals };
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!isLoggedIn) {
      setConfig(DEFAULT_COMMERCIAL_CONFIG);
      setSignals([]);
      return undefined;
    }

    setIsCommercialLoading(true);
    reloadCommercial()
      .catch(() => {
        if (!mounted) return;
        showToast?.('Nao foi possivel carregar as regras comerciais.');
      })
      .finally(() => {
        if (mounted) setIsCommercialLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isLoggedIn, reloadCommercial, showToast]);

  const updateConfig = async (nextConfig) => {
    const saved = await saveCommercialConfig(normalizeCommercialConfig(nextConfig));
    setConfig(saved);
    return saved;
  };

  const publishSignal = async (signal) => {
    const nextSignals = await savePlatformSignal(signal);
    setSignals(nextSignals);
    return nextSignals;
  };

  const deleteSignal = async (signalId) => {
    const nextSignals = await removePlatformSignal(signalId);
    setSignals(nextSignals);
    return nextSignals;
  };

  return {
    commercialConfig: config,
    signals,
    isCommercialLoading,
    reloadCommercial,
    updateCommercialConfig: updateConfig,
    publishSignal,
    deleteSignal
  };
}
