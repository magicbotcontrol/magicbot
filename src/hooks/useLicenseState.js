import { useEffect, useRef, useState } from 'react';
import { extendWorkspaceLicense, getWorkspaceLicense } from '../services/supabaseLicense';
import { purchaseWorkspacePackage } from '../services/supabaseEntitlements';

export function useLicenseState(workspaceId, isLoggedIn, isAdmin, showToast, playAlertSound, t, onPackagePurchased) {
  const showToastRef = useRef(showToast);
  const errorMessageRef = useRef(t.supabaseSyncError);
  const [remainingDays, setRemainingDays] = useState(0);
  const [expirationDate, setExpirationDate] = useState('-');
  const [licenseStatus, setLicenseStatus] = useState('expired');
  const [selectedOffer, setSelectedOffer] = useState(null);
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

  const buyDaysSimulate = (offer) => {
    setSelectedOffer(offer || null);
  };

  const handlePixSuccess = async () => {
    if (!workspaceId) {
      showToastRef.current(t.supabaseConnectionError);
      return;
    }

    setIsLicenseLoading(true);

    try {
      if (!selectedOffer?.kind) {
        throw new Error('Missing purchase offer');
      }

      if (selectedOffer.kind === 'membership') {
        const license = await extendWorkspaceLicense(workspaceId, {
          days: Number(selectedOffer.days || 30),
          planName: selectedOffer.planName || 'membership-monthly'
        });

        setRemainingDays(license.remainingDays);
        setExpirationDate(license.expirationDate);
        setLicenseStatus(license.status);
      } else if (selectedOffer.kind === 'package') {
        await purchaseWorkspacePackage(
          workspaceId,
          selectedOffer.packageCode,
          Number(selectedOffer.days || 30),
          selectedOffer.note || `Compra do pacote ${selectedOffer.title || selectedOffer.packageCode}`
        );
        onPackagePurchased?.();
      }

      setSelectedOffer(null);
      playAlertSound(950, 0.35);
      showToastRef.current(selectedOffer.successMessage || t.subscriptionRenewed);
    } catch {
      showToastRef.current(t.supabaseSaveError);
    } finally {
      setIsLicenseLoading(false);
    }
  };

  const isMembershipActive = isAdmin || remainingDays > 0;
  const isPremiumBlocked = !isAdmin && !isMembershipActive;

  return {
    remainingDays,
    expirationDate,
    licenseStatus,
    isMembershipActive,
    isPremiumBlocked,
    isLicenseLoading,
    showPixModal: selectedOffer,
    setShowPixModal: setSelectedOffer,
    pixAmount: Number(selectedOffer?.amount || 0),
    pixTitle: selectedOffer?.title || '',
    pixDescription: selectedOffer?.description || '',
    buyDaysSimulate,
    handlePixSuccess
  };
}
