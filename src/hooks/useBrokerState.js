import { useCallback, useEffect, useState } from 'react';
import { getWorkspaceBootstrap, invokeSecureBrokerLink, updateSelectedTimezone } from '../services/supabaseWorkspace';
import { createAutomationCommand, ensureBotInstances, listBotInstances } from '../services/supabaseTradeJobs';

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

  return matches[0]?.session || null;
}

function mergeBrokersWithRuntimeState(brokers, botInstances) {
  return (brokers || []).map((broker) => ({
    ...broker,
    brokerSession: getLatestBrokerSession(botInstances, broker.id)
  }));
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
    if (!workspaceId || !brokerId) {
      return [];
    }

    await ensureBotInstances(workspaceId);
    const botInstances = await listBotInstances(workspaceId);
    const matchingBots = (botInstances || []).filter((bot) => String(bot?.broker_key || '').trim().toLowerCase() === String(brokerId).trim().toLowerCase());

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
  }, [workspaceId]);

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
    triggerLinkBroker,
    submitLinkBroker,
    disconnectBroker
  };
}
