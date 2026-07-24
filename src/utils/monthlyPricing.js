export const MONTHLY_PRICING_TIERS = [
  { id: 'starter', min: 0, max: 250, amount: 20, label: 'US$ 0 a 250' },
  { id: 'core', min: 251, max: 500, amount: 40, label: 'US$ 251 a 500' },
  { id: 'plus', min: 501, max: 1000, amount: 80, label: 'US$ 501 a 1.000' },
  { id: 'pro', min: 1001, max: 5000, amount: 160, label: 'US$ 1.001 a 5.000' },
  { id: 'scale', min: 5001, max: 10000, amount: 360, label: 'US$ 5.001 a 10.000' },
  { id: 'elite', min: 10001, max: 20000, amount: 720, label: 'US$ 10.001 a 20.000' },
  { id: 'desk', min: 20001, max: 50000, amount: 1500, label: 'US$ 20.001 a 50.000' },
  { id: 'institutional', min: 50001, max: 100000, amount: 3000, label: 'US$ 50.001 a 100.000' }
];

export const DEFAULT_MONTHLY_TIER = MONTHLY_PRICING_TIERS[0];
export const DEFAULT_MONTHLY_AMOUNT = DEFAULT_MONTHLY_TIER.amount;

export function resolveMonthlyTier(bankrollValue) {
  const normalized = Number(bankrollValue);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return MONTHLY_PRICING_TIERS[0];
  }

  const match = MONTHLY_PRICING_TIERS.find((tier) => normalized >= tier.min && normalized <= tier.max);
  return match ?? MONTHLY_PRICING_TIERS[MONTHLY_PRICING_TIERS.length - 1];
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
