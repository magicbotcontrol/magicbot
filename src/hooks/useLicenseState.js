import { useState } from 'react';
import { initialExpirationDate, renewedExpirationDate } from '../constants/mockData';

export function useLicenseState(showToast, playAlertSound, t) {
  const [remainingDays, setRemainingDays] = useState(0);
  const [expirationDate, setExpirationDate] = useState(initialExpirationDate);
  const [shopCycle, setShopCycle] = useState('monthly');
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixAmount, setPixAmount] = useState(99.9);

  const buyDaysSimulate = (planName, amount) => {
    setPixAmount(amount);
    setShowPixModal(planName);
  };

  const handlePixSuccess = () => {
    setShowPixModal(false);
    setRemainingDays((prev) => prev + 30);
    setExpirationDate(renewedExpirationDate);
    playAlertSound(950, 0.35);
    showToast(t.subscriptionRenewed);
  };

  return {
    remainingDays,
    expirationDate,
    shopCycle,
    setShopCycle,
    showPixModal,
    setShowPixModal,
    pixAmount,
    buyDaysSimulate,
    handlePixSuccess
  };
}
