import { useCallback, useEffect, useState } from 'react';
import { getWorkspaceBootstrap, invokeSecureBrokerLink, updateSelectedTimezone } from '../services/supabaseWorkspace';
import {
  clearBotInstanceOperationalAccountConfirmation,
  confirmBotInstanceOperationalAccount,
  createAutomationCommand,
  ensureBotInstances,
  listBotInstances
} from '../services/supabaseTradeJobs';
import { normalizeBrokerSessionSnapshot } from '../utils/brokerSessionSnapshot';

function parseTimestamp(value) {
  const time = Date.parse(String(value || ''));
  return Number.isFinite(time) ? time : 0;
}

function getLatestBrokerSession(botInstances, brokerId) {
  const normalizedBrokerId = String(brokerId || '').trim().toLowerCase();
  const matches = (botInstances || [])
    .filter((bot) => String(bot?.broker_key || '').trim().toLowerCase() === normalizedBrokerId)
    .map((bot) => ({
      bot,
      session: bot?.last_sync_payload?.broker_session || null,
      checkedAt: parseTimestamp(
        bot?.last_sync_payload?.broker_session?.checked_at
          || bot?.last_sync_payload?.at
          || bot?.updated_at
      )
    }))
    .sort((a, b) => b.checkedAt - a.checkedAt);

  return matches[0] ? normalizeBrokerSessionSnapshot(matches[0].session, matches[0].bot) : null;
}

function mergeBrokersWithRuntimeState(brokers, botInstances) {
  return (brokers || []).map((broker) => {
    const matchingBots = (botInstances || [])
      .filter((bot) => String(bot?.broker_key || '').trim().toLowerCase() === String(broker?.id || '').trim().toLowerCase())
      .sort((a, b) => parseTimestamp(b?.updated_at) - parseTimestamp(a?.updated_at));
    const primaryBot = matchingBots[0] || null;
    return {
      ...broker,
      botSlot: primaryBot?.slot || null,
      botCount: matchingBots.length,
      confirmedAccountType: primaryBot?.confirmed_account_type || null,
      confirmedAccountAt: primaryBot?.confirmed_account_at || null,
      brokerSession: getLatestBrokerSession(botInstances, broker.id)
    };
  });
}

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function useBrokerState(workspaceId, showToast, playAlertSound, t) {
  const [selectedTimezone, setSelectedTimezone] = useState('America/Sao_Paulo');
  const [brokersList, setBrokersList] = useState([]);
  const [activeBrokerLinking, setActiveBrokerLinking] = useState(null);
  const [brokerEmailInput, setBrokerEmailInput] = useState('');
  const [brokerPassInput, setBrokerPassInput] = useState('');
  const [isLinkingLoading, setIsLinkingLoading] = useState(false);
  const [brokerActionLoading, setBrokerActionLoading] = useState({});

  const setBrokerLoadingState = useCallback((brokerId, action, value) => {
    const normalizedBrokerId = String(brokerId || '').trim().toLowerCase();
    if (!normalizedBrokerId || !action) return;
    setBrokerActionLoading((prev) => ({
      ...prev,
      [normalizedBrokerId]: {
        ...(prev[normalizedBrokerId] || {}),
        [action]: Boolean(value)
      }
    }));
  }, []);

  const listBrokerBotInstances = useCallback(async (brokerId) => {
    if (!workspaceId || !brokerId) {
      return [];
    }
    await ensureBotInstances(workspaceId);
    const rows = await listBotInstances(workspaceId);
    return (rows || []).filter((bot) => String(bot?.broker_key || '').trim().toLowerCase() === String(brokerId).trim().toLowerCase());
  }, [workspaceId]);

  const syncAccountRuntimeState = useCallback(async () => {
    if (!workspaceId) {
      setBrokersList([]);
      return { brokers: [], botInstances: [] };
    }

    await ensureBotInstances(workspaceId);
    const [workspaceData, botInstances] = await Promise.all([
      getWorkspaceBootstrap(workspaceId),
      listBotInstances(workspaceId)
    ]);
    const mergedBrokers = mergeBrokersWithRuntimeState(workspaceData.brokers || [], botInstances || []);

    setSelectedTimezone(workspaceData.preferences?.selected_timezone || 'America/Sao_Paulo');
    setBrokersList(mergedBrokers);

    return {
      brokers: mergedBrokers,
      botInstances: botInstances || []
    };
  }, [workspaceId]);

  const waitForBrokerSessionSync = useCallback(async ({ brokerId, commandIds, attempts = 6, waitMs = 1500 }) => {
    const normalizedBrokerId = String(brokerId || '').trim().toLowerCase();
    const expectedCommandIds = (commandIds || []).filter(Boolean);

    if (!workspaceId || !normalizedBrokerId || !expectedCommandIds.length) {
      return [];
    }

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const rows = await listBotInstances(workspaceId);
      const matchingBots = (rows || []).filter((bot) => String(bot?.broker_key || '').trim().toLowerCase() === normalizedBrokerId);
      const isSynced = matchingBots.some((bot) => expectedCommandIds.includes(bot?.last_sync_payload?.commandId));

      if (isSynced) {
        return rows || [];
      }

      await sleep(waitMs);
    }

    return [];
  }, [workspaceId]);

  const queueBrokerSessionSync = useCallback(async (brokerId) => {
    if (!workspaceId || !brokerId) return [];
    const matchingBots = await listBrokerBotInstances(brokerId);

    if (!matchingBots.length) {
      return [];
    }

    const commands = await Promise.all(matchingBots.map((bot) => createAutomationCommand({
      workspaceId,
      botInstanceId: bot.id,
      commandType: 'sync_broker_state',
      payload: {
        slot: Number(bot.slot),
        broker_key: brokerId,
        reason: 'broker_link_post_connect'
      }
    })));

    return commands.filter(Boolean);
  }, [workspaceId, listBrokerBotInstances]);

  useEffect(() => {
    if (!workspaceId) {
      setBrokersList([]);
      return undefined;
    }

    syncAccountRuntimeState()
      .catch(() => {
        showToast(t.supabaseSyncError);
      });

    return undefined;
  }, [workspaceId, showToast, syncAccountRuntimeState, t]);

  useEffect(() => {
    if (!workspaceId) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      syncAccountRuntimeState().catch(() => {});
    }, 15000);

    return () => {
      window.clearInterval(timer);
    };
  }, [workspaceId, syncAccountRuntimeState]);

  const triggerLinkBroker = (brokerId) => {
    const broker = brokersList.find((item) => item.id === brokerId);
    setActiveBrokerLinking(broker);
    setBrokerEmailInput('');
    setBrokerPassInput('');
  };

  const submitLinkBroker = async (e) => {
    e.preventDefault();

    if (!workspaceId || !activeBrokerLinking) {
      showToast(t.supabaseConnectionError);
      return;
    }

    if (!brokerEmailInput.trim() || !brokerPassInput.trim()) {
      showToast(t.brokerCredentialsRequired);
      return;
    }

    const brokerToLink = activeBrokerLinking;
    setIsLinkingLoading(true);
    try {
      await invokeSecureBrokerLink({
        action: 'link',
        brokerKey: brokerToLink.id,
        brokerName: brokerToLink.name,
        logoColor: brokerToLink.logoColor,
        email: brokerEmailInput,
        password: brokerPassInput,
        accountType: brokerToLink.accountType || 'Demo',
        baseCurrency: brokerToLink.baseCurrency || 'USD',
        provider: brokerToLink.id === 'iqoption' ? 'iqoption' : 'manual'
      });

      const syncCommands = await queueBrokerSessionSync(brokerToLink.id);
      const commandIds = syncCommands.map((command) => command?.id).filter(Boolean);

      if (commandIds.length) {
        await waitForBrokerSessionSync({
          brokerId: brokerToLink.id,
          commandIds
        });
      }

      const data = await syncAccountRuntimeState();
      const linkedBroker = (data.brokers || []).find((item) => item.id === brokerToLink.id);
      const linkedSessionState = String(linkedBroker?.brokerSession?.state || '').toLowerCase();

      setActiveBrokerLinking(null);
      setBrokerEmailInput('');
      setBrokerPassInput('');
      playAlertSound(900, 0.25);

      if (linkedSessionState === 'session_connected') {
        showToast('Corretora vinculada e sessão operacional conectada.');
      } else if (linkedSessionState === 'session_login_failed') {
        showToast('Corretora vinculada, mas o worker encontrou falha no login operacional.');
      } else if (commandIds.length) {
        showToast('Corretora vinculada. O worker já está tentando abrir a sessão operacional.');
      } else {
        showToast(t.brokerConnectedSuccess);
      }
    } catch {
      showToast(t.supabaseSaveError);
    } finally {
      setIsLinkingLoading(false);
    }
  };

  const disconnectBroker = (brokerName, brokerId) => {
    const broker = brokersList.find((item) => item.id === brokerId);
    if (!broker) {
      return;
    }

    invokeSecureBrokerLink({
      action: 'unlink',
      brokerKey: broker.id
    })
      .then(() => syncAccountRuntimeState())
      .then(() => {
        showToast(t.disconnectedFrom.replace('{broker}', brokerName));
      })
      .catch(() => {
        showToast(t.supabaseSaveError);
      });
  };

  const syncBrokerOperationalSession = useCallback(async (brokerId) => {
    if (!workspaceId || !brokerId) {
      showToast(t.supabaseConnectionError);
      return false;
    }

    setBrokerLoadingState(brokerId, 'sync', true);
    try {
      const syncCommands = await queueBrokerSessionSync(brokerId);
      const commandIds = syncCommands.map((command) => command?.id).filter(Boolean);
      if (!commandIds.length) {
        showToast('Nenhum comando de sincronização foi criado para essa corretora.');
        return false;
      }
      if (commandIds.length) {
        await waitForBrokerSessionSync({ brokerId, commandIds });
      }
      await syncAccountRuntimeState();
      showToast('Sincronização operacional enviada ao worker.');
      return true;
    } catch {
      showToast(t.supabaseSaveError);
      return false;
    } finally {
      setBrokerLoadingState(brokerId, 'sync', false);
    }
  }, [workspaceId, queueBrokerSessionSync, waitForBrokerSessionSync, syncAccountRuntimeState, showToast, t, setBrokerLoadingState]);

  const confirmBrokerOperationalAccount = useCallback(async (brokerId, accountType) => {
    const normalizedBrokerId = String(brokerId || '').trim().toLowerCase();
    const normalizedAccountType = accountType === 'Real' ? 'Real' : 'Demo';
    const broker = brokersList.find((item) => item.id === normalizedBrokerId);
    const detectedAccountType = broker?.brokerSession?.account_mode_detected || null;

    if (!workspaceId || !normalizedBrokerId) {
      showToast(t.supabaseConnectionError);
      return false;
    }

    if (detectedAccountType && detectedAccountType !== normalizedAccountType) {
      showToast(`A sessão detectou a conta ${detectedAccountType}. Confirme apenas a conta detectada ou resincronize a corretora.`);
      return false;
    }

    setBrokerLoadingState(normalizedBrokerId, `confirm_${normalizedAccountType.toLowerCase()}`, true);
    try {
      const matchingBots = await listBrokerBotInstances(normalizedBrokerId);
      if (!matchingBots.length) {
        showToast('Nenhum bot configurado para essa corretora.');
        return false;
      }

      await Promise.all(matchingBots.map((bot) => confirmBotInstanceOperationalAccount({
        workspaceId,
        slot: Number(bot.slot),
        accountType: normalizedAccountType
      })));

      await syncBrokerOperationalSession(normalizedBrokerId);
      showToast(`Conta ${normalizedAccountType} confirmada para execução automática.`);
      return true;
    } catch {
      showToast(t.supabaseSaveError);
      return false;
    } finally {
      setBrokerLoadingState(normalizedBrokerId, `confirm_${normalizedAccountType.toLowerCase()}`, false);
    }
  }, [workspaceId, brokersList, listBrokerBotInstances, syncBrokerOperationalSession, showToast, t, setBrokerLoadingState]);

  const clearBrokerOperationalAccount = useCallback(async (brokerId) => {
    const normalizedBrokerId = String(brokerId || '').trim().toLowerCase();
    if (!workspaceId || !normalizedBrokerId) {
      showToast(t.supabaseConnectionError);
      return false;
    }

    setBrokerLoadingState(normalizedBrokerId, 'clear_confirmation', true);
    try {
      const matchingBots = await listBrokerBotInstances(normalizedBrokerId);
      if (!matchingBots.length) {
        showToast('Nenhum bot configurado para essa corretora.');
        return false;
      }

      await Promise.all(matchingBots.map((bot) => clearBotInstanceOperationalAccountConfirmation({
        workspaceId,
        slot: Number(bot.slot)
      })));

      await syncBrokerOperationalSession(normalizedBrokerId);
      showToast('Confirmação operacional removida.');
      return true;
    } catch {
      showToast(t.supabaseSaveError);
      return false;
    } finally {
      setBrokerLoadingState(normalizedBrokerId, 'clear_confirmation', false);
    }
  }, [workspaceId, listBrokerBotInstances, syncBrokerOperationalSession, showToast, t, setBrokerLoadingState]);

  const saveSelectedTimezone = async (timezone) => {
    if (!workspaceId) {
      showToast(t.supabaseConnectionError);
      return false;
    }

    try {
      await updateSelectedTimezone(workspaceId, timezone);
      setSelectedTimezone(timezone);
      return true;
    } catch {
      showToast(t.supabaseSaveError);
      return false;
    }
  };

  return {
    selectedTimezone,
    saveSelectedTimezone,
    brokersList,
    setBrokersList,
    activeBrokerLinking,
    setActiveBrokerLinking,
    brokerEmailInput,
    setBrokerEmailInput,
    brokerPassInput,
    setBrokerPassInput,
    isLinkingLoading,
    brokerActionLoading,
    triggerLinkBroker,
    submitLinkBroker,
    disconnectBroker,
    syncBrokerOperationalSession,
    confirmBrokerOperationalAccount,
    clearBrokerOperationalAccount
  };
}
