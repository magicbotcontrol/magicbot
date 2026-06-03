import { useEffect, useState } from 'react';
import { ensureWorkspace } from '../services/supabaseWorkspace';
import { supabaseEnabled } from '../lib/supabase/client';

export function useSupabaseWorkspace(isLoggedIn, showToast, t) {
  const [workspace, setWorkspace] = useState(null);
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    if (!supabaseEnabled || !isLoggedIn) {
      setWorkspace(null);
      setIsWorkspaceLoading(false);
      return undefined;
    }

    setIsWorkspaceLoading(true);

    ensureWorkspace()
      .then((data) => {
        if (!mounted) return;
        setWorkspace(data);
      })
      .catch(() => {
        if (!mounted) return;
        showToast?.(t.supabaseConnectionError);
      })
      .finally(() => {
        if (!mounted) return;
        setIsWorkspaceLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isLoggedIn, showToast, t]);

  return {
    workspaceId: workspace?.id || null,
    workspace,
    isWorkspaceLoading,
    supabaseEnabled
  };
}
