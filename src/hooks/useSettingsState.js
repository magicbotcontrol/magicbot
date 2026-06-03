import { useEffect, useRef, useState } from 'react';
import { DEFAULT_SETTINGS_CONFIG } from '../constants/defaultWorkspace';
import { getWorkspaceBootstrap, saveSettingsConfig } from '../services/supabaseWorkspace';

export function useSettingsState(workspaceId, showToast, t) {
  const [config, setConfig] = useState(DEFAULT_SETTINGS_CONFIG);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    if (!workspaceId) {
      return undefined;
    }

    getWorkspaceBootstrap(workspaceId)
      .then((data) => {
        if (!mounted) return;
        setConfig(data.settings);
        hasLoadedRef.current = true;
      })
      .catch(() => {
        if (!mounted) return;
        showToast(t.supabaseSyncError);
      });

    return () => {
      mounted = false;
    };
  }, [workspaceId, showToast, t]);

  useEffect(() => {
    if (!workspaceId || !hasLoadedRef.current) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      saveSettingsConfig(workspaceId, config).catch(() => {
        showToast(t.supabaseSaveError);
      });
    }, 500);

    return () => clearTimeout(timeout);
  }, [config, workspaceId, showToast, t]);

  return {
    config,
    setConfig
  };
}
