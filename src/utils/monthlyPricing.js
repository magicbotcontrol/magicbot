export const BOT_MONTHLY_AMOUNT = 36;
export const BOT_MIN_CAPITAL_USD = 250;

export const MONTHLY_PRICING_TIERS = [
  { id: 'bot', min: 0, max: Number.POSITIVE_INFINITY, amount: BOT_MONTHLY_AMOUNT, label: 'BOT' }
];

export const DEFAULT_MONTHLY_TIER = MONTHLY_PRICING_TIERS[0];
export const DEFAULT_MONTHLY_AMOUNT = BOT_MONTHLY_AMOUNT;

export function resolveMonthlyTier() {
  return DEFAULT_MONTHLY_TIER;
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
