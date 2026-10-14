export const BOT_MIN_CAPITAL_USD = 250;
export const BOT_MAX_CAPITAL_USD = 100000;

export const MONTHLY_PRICING_TIERS = [
  { id: 'from-250', min: 250, max: 999.99, amount: 36, label: 'A partir de US$ 250' },
  { id: 'from-1000', min: 1000, max: 3499.99, amount: 80, label: 'A partir de US$ 1.000' },
  { id: 'from-3500', min: 3500, max: 4999.99, amount: 150, label: 'A partir de US$ 3.500' },
  { id: 'from-5000', min: 5000, max: 9999.99, amount: 250, label: 'A partir de US$ 5.000' },
  { id: 'from-10000', min: 10000, max: 100000, amount: 500, label: 'US$ 10.000 a 100.000' }
];

export const DEFAULT_MONTHLY_TIER = MONTHLY_PRICING_TIERS[0];
export const DEFAULT_MONTHLY_AMOUNT = DEFAULT_MONTHLY_TIER.amount;
export const BOT_MONTHLY_AMOUNT = DEFAULT_MONTHLY_AMOUNT;

export function resolveMonthlyTier(bankrollValue) {
  const normalized = Number(bankrollValue);
  if (!Number.isFinite(normalized) || normalized < MONTHLY_PRICING_TIERS[1].min) {
    return MONTHLY_PRICING_TIERS[0];
  }

  if (normalized >= BOT_MAX_CAPITAL_USD) {
    return MONTHLY_PRICING_TIERS[MONTHLY_PRICING_TIERS.length - 1];
  }

  return MONTHLY_PRICING_TIERS.find((tier) => normalized >= tier.min && normalized <= tier.max)
    ?? MONTHLY_PRICING_TIERS[MONTHLY_PRICING_TIERS.length - 1];
}

export function getBrokerBalanceValue(item) {
  const sessionBalance = Number(item?.brokerSession?.account_balance);
  if (Number.isFinite(sessionBalance) && sessionBalance > 0) {
    return sessionBalance;
  }

  const fallbackBalance = Number(item?.balance);
  return Number.isFinite(fallbackBalance) && fallbackBalance > 0 ? fallbackBalance : 0;
}

export function resolveHighestBankroll(items = []) {
  return items.reduce((highest, item) => Math.max(highest, getBrokerBalanceValue(item)), 0);
}
