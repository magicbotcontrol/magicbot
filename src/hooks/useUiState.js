import { useCallback, useEffect, useMemo, useState } from 'react';
import { colors } from '../constants/colors';
import { translations } from '../constants/translations';
import { convertBetween, defaultFxApiUrl, FX_BASE_CURRENCY, formatCurrency, localeForLanguage, SUPPORTED_CURRENCIES } from '../utils/money';

export function useUiState() {
  const initialLanguage = () => {
    try {
      return localStorage.getItem('magicbot_language') || 'pt';
    } catch {
      return 'pt';
    }
  };

  const initialDarkMode = () => {
    try {
      const saved = localStorage.getItem('magicbot_theme');
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
    } catch {
    }

    try {
      return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? true;
    } catch {
      return true;
    }
  };

  const [activeTab, setActiveTab] = useState('signals');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [hasNotifGlow, setHasNotifGlow] = useState(true);
  const [currentLanguage, setCurrentLanguage] = useState(initialLanguage);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(initialDarkMode);
  const [currency, setCurrency] = useState(() => {
    try {
      const userSet = localStorage.getItem('magicbot_currency_user_set') === '1';
      const stored = localStorage.getItem('magicbot_currency');
      if (userSet && stored) return stored;
      return 'USD';
    } catch {
      return 'USD';
    }
  });
  const [fxRates, setFxRates] = useState(() => {
    try {
      const raw = localStorage.getItem('magicbot_fx_rates');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [fxUpdatedAt, setFxUpdatedAt] = useState(() => {
    try {
      const raw = localStorage.getItem('magicbot_fx_updated_at');
      return raw ? Number(raw) : 0;
    } catch {
      return 0;
    }
  });
  const [fxLoading, setFxLoading] = useState(false);
  const [fxError, setFxError] = useState(false);

  const t = useMemo(() => translations[currentLanguage] || translations.pt, [currentLanguage]);
  const locale = useMemo(() => localeForLanguage(currentLanguage), [currentLanguage]);

  useEffect(() => {
    try {
      localStorage.setItem('magicbot_language', currentLanguage);
    } catch {
    }
  }, [currentLanguage]);

  useEffect(() => {
    try {
      localStorage.setItem('magicbot_currency', currency);
    } catch {
    }
  }, [currency]);

  const setCurrencyUser = (nextCurrency) => {
    setCurrency(nextCurrency);
    try {
      localStorage.setItem('magicbot_currency_user_set', '1');
    } catch {
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem('magicbot_theme', isDarkMode ? 'dark' : 'light');
    } catch {
    }

    try {
      document.documentElement.classList.toggle('dark', isDarkMode);
    } catch {
    }
  }, [isDarkMode]);

  useEffect(() => {
    const cacheTtlMs = 12 * 60 * 60 * 1000;
    if (fxUpdatedAt && Date.now() - fxUpdatedAt < cacheTtlMs) {
      return undefined;
    }

    const apiUrlTemplate = (import.meta?.env?.VITE_FX_API_URL || defaultFxApiUrl()).trim();
    const url = apiUrlTemplate.includes('{base}') ? apiUrlTemplate.replace('{base}', FX_BASE_CURRENCY) : apiUrlTemplate;

    let cancelled = false;
    setFxLoading(true);

    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        const rates = json?.rates && typeof json.rates === 'object' ? json.rates : null;
        if (!rates) return;

        setFxError(false);
        setFxRates(rates);
        const ts = Date.now();
        setFxUpdatedAt(ts);

        try {
          localStorage.setItem('magicbot_fx_rates', JSON.stringify(rates));
          localStorage.setItem('magicbot_fx_updated_at', String(ts));
        } catch {
        }
      })
      .catch(() => {
        if (cancelled) return;
        setFxError(true);
      })
      .finally(() => {
        if (cancelled) return;
        setFxLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fxUpdatedAt]);

  const currentColors = useMemo(() => {
    if (isDarkMode) {
      return {
        ...colors,
        bgMain: '#070B14',
        bgContainer: '#0B1220',
        textMain: '#F8FAFC',
        textMuted: '#94A3B8',
        border: '#1F2A3A'
      };
    }

    return colors;
  }, [isDarkMode]);

  const formatMoney = useMemo(() => {
    return (amount, sourceCurrency = FX_BASE_CURRENCY) => {
      const from = sourceCurrency || FX_BASE_CURRENCY;
      const to = currency || FX_BASE_CURRENCY;

      if (from === to) {
        return formatCurrency(amount, to, locale);
      }

      const converted = convertBetween(amount, from, to, fxRates, FX_BASE_CURRENCY);
      if (converted === null) {
        return formatCurrency(amount, from, locale);
      }

      return formatCurrency(converted, to, locale);
    };
  }, [currency, fxRates, locale]);

  const currencyOptions = useMemo(() => SUPPORTED_CURRENCIES, []);
  const fxStatusLabel = useMemo(() => {
    if (fxLoading) return t.fxUpdating;
    if (fxError) return t.fxUnavailable;
    if (!fxUpdatedAt) return t.fxUnavailable;
    return t.fxUpdated.replace('{time}', new Date(fxUpdatedAt).toLocaleString(locale));
  }, [fxError, fxLoading, fxUpdatedAt, locale, t.fxUnavailable, t.fxUpdated, t.fxUpdating]);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  return {
    activeTab,
    setActiveTab,
    isSidebarOpen,
    setIsSidebarOpen,
    toastMessage,
    hasNotifGlow,
    setHasNotifGlow,
    currentLanguage,
    setCurrentLanguage,
    isLangDropdownOpen,
    setIsLangDropdownOpen,
    isProfileDropdownOpen,
    setIsProfileDropdownOpen,
    isDarkMode,
    setIsDarkMode,
    currency,
    setCurrency,
    setCurrencyUser,
    fxRates,
    fxUpdatedAt,
    fxLoading,
    fxError,
    fxStatusLabel,
    currencyOptions,
    formatMoney,
    t,
    currentColors,
    showToast
  };
}
