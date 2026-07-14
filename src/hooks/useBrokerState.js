import { useEffect, useState } from 'react';
import { getWorkspaceBootstrap, invokeSecureBrokerLink, updateSelectedTimezone } from '../services/supabaseWorkspace';

export function useBrokerState(workspaceId, showToast, playAlertSound, t) {
  const [selectedTimezone, setSelectedTimezone] = useState('America/Sao_Paulo');
  const [brokersList, setBrokersList] = useState([]);
  const [activeBrokerLinking, setActiveBrokerLinking] = useState(null);
  const [brokerEmailInput, setBrokerEmailInput] = useState('');
  const [brokerPassInput, setBrokerPassInput] = useState('');
  const [isLinkingLoading, setIsLinkingLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!workspaceId) {
      return undefined;
    }

    getWorkspaceBootstrap(workspaceId)
      .then((data) => {
        if (!mounted) return;
        setSelectedTimezone(data.preferences?.selected_timezone || 'America/Sao_Paulo');
        setBrokersList(data.brokers || []);
      })
      .catch(() => {
        if (!mounted) return;
        showToast(t.supabaseSyncError);
      });

    return () => {
      mounted = false;
    };
  }, [workspaceId, showToast, t]);

  const triggerLinkBroker = (brokerId) => {
    const broker = brokersList.find((item) => item.id === brokerId);
    setActiveBrokerLinking(broker);
    setBrokerEmailInput('');
    setBrokerPassInput('');
  };

  const submitLinkBroker = (e) => {
    e.preventDefault();

    if (!workspaceId || !activeBrokerLinking) {
      showToast(t.supabaseConnectionError);
      return;
    }

    if (!brokerEmailInput.trim() || !brokerPassInput.trim()) {
      showToast(t.brokerCredentialsRequired);
      return;
    }

    setIsLinkingLoading(true);
    invokeSecureBrokerLink({
      action: 'link',
      brokerKey: activeBrokerLinking.id,
      brokerName: activeBrokerLinking.name,
      logoColor: activeBrokerLinking.logoColor,
      email: brokerEmailInput,
      password: brokerPassInput,
      accountType: activeBrokerLinking.accountType || 'Demo',
      baseCurrency: activeBrokerLinking.baseCurrency || 'USD',
      provider: activeBrokerLinking.id === 'iqoption' ? 'iqoption' : 'manual'
    })
      .then(() => getWorkspaceBootstrap(workspaceId))
      .then((data) => {
        setBrokersList(data.brokers || []);
        setActiveBrokerLinking(null);
        setBrokerEmailInput('');
        setBrokerPassInput('');
        playAlertSound(900, 0.25);
        showToast(t.brokerConnectedSuccess);
      })
      .catch(() => {
        showToast(t.supabaseSaveError);
      })
      .finally(() => {
        setIsLinkingLoading(false);
      });
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
      .then(() => getWorkspaceBootstrap(workspaceId))
      .then((data) => {
        setBrokersList(data.brokers || []);
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
