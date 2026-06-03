const BROKER_URLS_BY_KEY = {
  iqoption: 'https://iqoption.com/',
  quotex: 'https://quotex.com/',
  binomo: 'https://binomo.com/',
  olymptrade: 'https://olymptrade.com/',
  pocketoption: 'https://pocketoption.com/'
};

export function resolveBrokerKeyFromName(brokersList, brokerName) {
  if (!brokerName) return null;
  const match = (brokersList || []).find((broker) => broker.name === brokerName);
  return match?.id || null;
}

export function getBrokerExternalUrl({ brokerKey, brokerName, brokersList }) {
  const key = brokerKey || resolveBrokerKeyFromName(brokersList, brokerName);
  if (!key) return null;
  return BROKER_URLS_BY_KEY[key] || null;
}
