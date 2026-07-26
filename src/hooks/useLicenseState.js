import { useEffect, useRef, useState } from 'react';
import { getWorkspaceLicense } from '../services/supabaseLicense';
import {
  createNowPaymentsPayment,
  getNowPaymentsMerchantCurrencies,
  getNowPaymentsPaymentStatus
} from '../services/nowPaymentsCheckout';

export function useLicenseState(workspaceId, isLoggedIn, isAdmin, showToast, playAlertSound, t, onPackagePurchased) {
  const showToastRef = useRef(showToast);
  const errorMessageRef = useRef(t.supabaseSyncError);
  const [remainingDays, setRemainingDays] = useState(0);
  const [expirationDate, setExpirationDate] = useState('-');
  const [licenseStatus, setLicenseStatus] = useState('expired');
  const [isLicenseLoading, setIsLicenseLoading] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [paymentCurrencies, setPaymentCurrencies] = useState([]);
  const [selectedPayCurrency, setSelectedPayCurrency] = useState('');
  const [paymentErrorMessage, setPaymentErrorMessage] = useState('');
  const [isPreparingPayment, setIsPreparingPayment] = useState(false);
  const [isRefreshingPayment, setIsRefreshingPayment] = useState(false);
  const fulfilledOrdersRef = useRef(new Set());

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

  const resetPaymentState = () => {
    setSelectedOffer(null);
    setPaymentOrder(null);
    setPaymentCurrencies([]);
    setSelectedPayCurrency('');
    setPaymentErrorMessage('');
    setIsPreparingPayment(false);
    setIsRefreshingPayment(false);
  };

  const syncMembershipState = async () => {
    const license = await getWorkspaceLicense(workspaceId);
    setRemainingDays(isAdmin ? Math.max(license.remainingDays, 3650) : license.remainingDays);
    setExpirationDate(license.expirationDate);
    setLicenseStatus(isAdmin ? 'active' : license.status);
  };

  const handleFulfilledPaymentOrder = async (nextOrder, offerOverride = selectedOffer) => {
    if (!nextOrder?.id || nextOrder.activationStatus !== 'fulfilled') {
      return;
    }

    if (fulfilledOrdersRef.current.has(nextOrder.id)) {
      return;
    }

    fulfilledOrdersRef.current.add(nextOrder.id);

    if (offerOverride?.kind === 'membership') {
      await syncMembershipState();
    } else if (offerOverride?.kind === 'package') {
      onPackagePurchased?.();
    }

    playAlertSound(950, 0.35);
    showToastRef.current(offerOverride?.successMessage || 'Pagamento confirmado com sucesso.');
  };

  useEffect(() => {
    let cancelled = false;

    if (!selectedOffer) {
      setPaymentCurrencies([]);
      setSelectedPayCurrency('');
      setPaymentErrorMessage('');
      return undefined;
    }

    setPaymentErrorMessage('');
    setIsPreparingPayment(true);

    getNowPaymentsMerchantCurrencies()
      .then((result) => {
        if (cancelled) return;
        const currencies = Array.isArray(result?.currencies) ? result.currencies : [];
        setPaymentCurrencies(currencies);
        setSelectedPayCurrency(result?.defaultCurrency || currencies[0] || '');
      })
      .catch((error) => {
        if (cancelled) return;
        setPaymentErrorMessage(error instanceof Error ? error.message : 'Nao foi possivel carregar as moedas de pagamento.');
      })
      .finally(() => {
        if (cancelled) return;
        setIsPreparingPayment(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedOffer]);

  useEffect(() => {
    if (!selectedOffer?.kind || !paymentOrder?.id) {
      return undefined;
    }

    if (paymentOrder.activationStatus === 'fulfilled') {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      getNowPaymentsPaymentStatus(paymentOrder.id)
        .then((result) => {
          const nextOrder = result?.paymentOrder || null;
          setPaymentOrder(nextOrder);
          return handleFulfilledPaymentOrder(nextOrder);
        })
        .catch(() => {});
    }, 20000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [paymentOrder?.id, paymentOrder?.activationStatus, selectedOffer?.kind]);

  const buyDaysSimulate = (offer) => {
    setSelectedOffer(offer || null);
    setPaymentOrder(null);
    setPaymentErrorMessage('');
  };

  const createPaymentCheckout = async () => {
    if (!workspaceId) {
      showToastRef.current(t.supabaseConnectionError);
      return;
    }

    if (!selectedOffer?.kind) {
      setPaymentErrorMessage('Escolha um plano valido antes de gerar a cobranca.');
      return;
    }

    if (!selectedPayCurrency) {
      setPaymentErrorMessage('Selecione a cripto para pagamento.');
      return;
    }

    setIsPreparingPayment(true);
    setPaymentErrorMessage('');

    try {
      const result = await createNowPaymentsPayment({
        workspaceId,
        offer: selectedOffer,
        payCurrency: selectedPayCurrency
      });

      const nextOrder = result?.paymentOrder || null;
      setPaymentOrder(nextOrder);
      await handleFulfilledPaymentOrder(nextOrder);
    } catch (error) {
      setPaymentErrorMessage(error instanceof Error ? error.message : 'Nao foi possivel gerar a cobranca da NowPayments.');
    } finally {
      setIsPreparingPayment(false);
    }
  };

  const refreshPaymentCheckout = async () => {
    if (!paymentOrder?.id) {
      return;
    }

    setIsRefreshingPayment(true);
    setPaymentErrorMessage('');

    try {
      const result = await getNowPaymentsPaymentStatus(paymentOrder.id);
      const nextOrder = result?.paymentOrder || null;
      setPaymentOrder(nextOrder);
      await handleFulfilledPaymentOrder(nextOrder);
    } catch (error) {
      setPaymentErrorMessage(error instanceof Error ? error.message : 'Nao foi possivel verificar o status do pagamento agora.');
    } finally {
      setIsRefreshingPayment(false);
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
    nowPaymentsModalOffer: selectedOffer,
    nowPaymentsPaymentOrder: paymentOrder,
    nowPaymentsCurrencies: paymentCurrencies,
    nowPaymentsSelectedCurrency: selectedPayCurrency,
    setNowPaymentsSelectedCurrency: setSelectedPayCurrency,
    nowPaymentsErrorMessage: paymentErrorMessage,
    isNowPaymentsPreparing: isPreparingPayment,
    isNowPaymentsRefreshing: isRefreshingPayment,
    buyDaysSimulate,
    closeNowPaymentsModal: resetPaymentState,
    createPaymentCheckout,
    refreshPaymentCheckout
  };
}
