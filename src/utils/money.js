export const FX_BASE_CURRENCY = 'USD';

export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'BRL', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'MXN', 'ARS'];

export function localeForLanguage(language) {
  if (language === 'en') return 'en-GB';
  if (language === 'es') return 'es-ES';
  return 'pt-BR';
}

export function formatCurrency(amount, currency, locale) {
  const n = Number(amount || 0);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: 'symbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

export function convertBetween(amount, fromCurrency, toCurrency, rates, baseCurrency = FX_BASE_CURRENCY) {
  const n = Number(amount || 0);
  const from = fromCurrency || baseCurrency;
  const to = toCurrency || baseCurrency;
  if (from === to) return n;

  const fromRate = from === baseCurrency ? 1 : rates?.[from];
  const toRate = to === baseCurrency ? 1 : rates?.[to];
  if (typeof fromRate !== 'number' || typeof toRate !== 'number' || !fromRate || !toRate) {
    return null;
  }

  const baseAmount = from === baseCurrency ? n : n / fromRate;
  return to === baseCurrency ? baseAmount : baseAmount * toRate;
}

export function defaultFxApiUrl() {
  return 'https://open.er-api.com/v6/latest/{base}';
}
