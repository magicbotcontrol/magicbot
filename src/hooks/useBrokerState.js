import { useEffect, useState } from 'react';
import { initialBrokersList } from '../constants/mockData';

export function useBrokerState(showToast, playAlertSound, t) {
  const initialTimezone = () => {
    try {
      return localStorage.getItem('magicbot_timezone') || 'America/Sao_Paulo';
    } catch {
      return 'America/Sao_Paulo';
    }
  };

  const [selectedTimezone, setSelectedTimezone] = useState(initialTimezone);
  const [brokersList, setBrokersList] = useState(initialBrokersList);
  const [activeBrokerLinking, setActiveBrokerLinking] = useState(null);
  const [brokerEmailInput, setBrokerEmailInput] = useState('');
  const [brokerPassInput, setBrokerPassInput] = useState('');
  const [isLinkingLoading, setIsLinkingLoading] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('magicbot_timezone', selectedTimezone);
    } catch {
    }
  }, [selectedTimezone]);

  const triggerLinkBroker = (brokerId) => {
    const broker = brokersList.find((item) => item.id === brokerId);
    setActiveBrokerLinking(broker);
    setBrokerEmailInput(broker.email || '');
    setBrokerPassInput('');
  };

  const submitLinkBroker = (e) => {
    e.preventDefault();

    if (!brokerEmailInput.trim() || !brokerPassInput.trim()) {
      showToast(t.brokerCredentialsRequired);
      return;
    }

    setIsLinkingLoading(true);
    setTimeout(() => {
      setBrokersList((prev) =>
        prev.map((broker) =>
          broker.id === activeBrokerLinking.id
            ? { ...broker, status: 'Linked', email: brokerEmailInput, balance: 10450.0, baseCurrency: broker.baseCurrency || 'USD' }
            : broker
        )
      );
      setIsLinkingLoading(false);
      setActiveBrokerLinking(null);
      playAlertSound(900, 0.25);
      showToast(t.brokerConnectedSuccess);
    }, 1800);
  };

  const disconnectBroker = (brokerName, brokerId) => {
    setBrokersList((prev) =>
      prev.map((broker) =>
        broker.id === brokerId ? { ...broker, status: 'Unlinked', email: '', balance: 0.0, baseCurrency: broker.baseCurrency || 'USD' } : broker
      )
    );
    showToast(t.disconnectedFrom.replace('{broker}', brokerName));
  };

  return {
    selectedTimezone,
    setSelectedTimezone,
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
