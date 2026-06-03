import { useEffect, useRef, useState } from 'react';
import { extendWorkspaceLicense, getWorkspaceLicense } from '../services/supabaseLicense';

export function useLicenseState(workspaceId, isLoggedIn, isAdmin, showToast, playAlertSound, t) {
  const showToastRef = useRef(showToast);
  const errorMessageRef = useRef(t.supabaseSyncError);
  const [remainingDays, setRemainingDays] = useState(0);
  const [expirationDate, setExpirationDate] = useState('-');
  const [licenseStatus, setLicenseStatus] = useState('expired');
  const [shopCycle, setShopCycle] = useState('monthly');
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixAmount, setPixAmount] = useState(99.9);
  const [isLicenseLoading, setIsLicenseLoading] = useState(false);

  useEffect(() => {
    showToastRef.current = showToast;
    errorMessageRef.current = t.supabaseSyncError;
  }, [showToast, t.supabaseSyncError]);

  useEffect(() => {
    let mounted = true;

    if (!isLoggedIn || !workspaceId) {
      setRemainingDays(0);
      setExpirationDate('-');
      setLicenseStatus(isAdmin ? 'active' : 'expired');
      setIsLicenseLoading(false);
      return undefined;
    }

    setIsLicenseLoading(true);

    getWorkspaceLicense(workspaceId)
      .then((license) => {
        if (!mounted) return;
        setRemainingDays(isAdmin ? Math.max(license.remainingDays, 3650) : license.remainingDays);
        setExpirationDate(license.expirationDate);
        setLicenseStatus(isAdmin ? 'active' : license.status);
      })
      .catch(() => {
        if (!mounted) return;
        showToastRef.current(errorMessageRef.current);
      })
      .finally(() => {
        if (!mounted) return;
        setIsLicenseLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [workspaceId, isLoggedIn, isAdmin]);

  const buyDaysSimulate = (planName, amount) => {
    setPixAmount(amount);
    setShowPixModal(planName);
  };

  const handlePixSuccess = async () => {
    if (!workspaceId) {
      showToastRef.current(t.supabaseConnectionError);
      return;
    }

    setIsLicenseLoading(true);

    try {
      const license = await extendWorkspaceLicense(workspaceId, {
        days: 30,
        planName: shopCycle === 'semiannual' ? 'semiannual' : 'monthly'
      });

      setRemainingDays(license.remainingDays);
      setExpirationDate(license.expirationDate);
      setLicenseStatus(license.status);
      setShowPixModal(false);
      playAlertSound(950, 0.35);
      showToastRef.current(t.subscriptionRenewed);
    } catch {
      showToastRef.current(t.supabaseSaveError);
    } finally {
      setIsLicenseLoading(false);
    }
  };

  const isPremiumBlocked = !isAdmin && remainingDays <= 0;

  return {
    remainingDays,
    expirationDate,
    licenseStatus,
    isPremiumBlocked,
    isLicenseLoading,
    shopCycle,
    setShopCycle,
    showPixModal,
    setShowPixModal,
    pixAmount,
    buyDaysSimulate,
    handlePixSuccess
  };
}
