export const initialSignalsText =
  'M5;EURUSD;14:00;CALL\nM15;GBPUSD-OTC;14:30;PUT\nM1;USDJPY;15:00;CALL\n';

export const initialSignalsDate = '2026-05-28';

export const initialExpirationDate = '26/05/2026 22:09';
export const renewedExpirationDate = '28/06/2026 22:09';

export const initialBrokersList = [
  { id: 'iqoption', name: 'IQ Option', logoColor: '#FF6B00', status: 'Linked', email: 'comunidaderedendamais@gmail.com', balance: 10450.0, baseCurrency: 'USD', accountType: 'Demo' },
  { id: 'quotex', name: 'Quotex', logoColor: '#00E676', status: 'Unlinked', email: '', balance: 0.0, baseCurrency: 'USD', accountType: 'Demo' },
  { id: 'pocketoption', name: 'Pocket Option', logoColor: '#29B6F6', status: 'Unlinked', email: '', balance: 0.0, baseCurrency: 'USD', accountType: 'Demo' },
  { id: 'exnova', name: 'Exnova', logoColor: '#8E24AA', status: 'Unlinked', email: '', balance: 0.0, baseCurrency: 'USD', accountType: 'Demo' },
  { id: 'bullex', name: 'Bullex', logoColor: '#37474F', status: 'Unlinked', email: '', balance: 0.0, baseCurrency: 'USD', accountType: 'Demo' },
  { id: 'broker10', name: 'Broker10', logoColor: '#000000', status: 'Unlinked', email: '', balance: 0.0, baseCurrency: 'USD', accountType: 'Demo' },
  { id: 'binomo', name: 'Binomo', logoColor: '#111827', status: 'Unlinked', email: '', balance: 0.0, baseCurrency: 'USD', accountType: 'Demo' },
  { id: 'olymptrade', name: 'Olymp Trade', logoColor: '#10B981', status: 'Unlinked', email: '', balance: 0.0, baseCurrency: 'USD', accountType: 'Demo' },
  { id: 'binolla', name: 'Binolla', logoColor: '#2563EB', status: 'Unlinked', email: '', balance: 0.0, baseCurrency: 'USD', accountType: 'Demo' },
  { id: 'avalon', name: 'Avalon', logoColor: '#14B8A6', status: 'Unlinked', email: '', balance: 0.0, baseCurrency: 'USD', accountType: 'Demo' },
  { id: 'homebroker', name: 'HomeBroker', logoColor: '#6366F1', status: 'Unlinked', email: '', balance: 0.0, baseCurrency: 'USD', accountType: 'Demo' },
  { id: 'casatrade', name: 'CasaTrade', logoColor: '#0F172A', status: 'Unlinked', email: '', balance: 0.0, baseCurrency: 'USD', accountType: 'Demo' }
];

export const initialConfig = {
  broker: 'IQ Option',
  accountType: 'Practice',
  entryType: 'Value',
  entryValue: '2',
  payoutOption: 'Highest Payout',
  minimumPayout: '80',
  delayMode: 'Automatic',
  stopMode: 'Value',
  stopWin: '10',
  stopLoss: '40',
  trailingStop: false,
  preStopLoss: false,
  martingaleActive: true,
  martingaleMultiplier: '2',
  martingaleLevels: '2',
  sorosActive: false,
  sorosPercentage: '50',
  sorosLevels: '2',
  sorosgaleActive: false,
  sorosgaleLevels: '5',
  cyclesActive: false,
  masanielloActive: false,
  virtualLossActive: false,
  recoveryLossActive: false,
  recoveryPercentage: '50',
  reverseDirection: false,
  noDelayMartingale: true,
  simultaneousSignals: false,
  trendAnalysis: false,
  investingAnalysis: false,
  newsFilter: false,
  aiFilter: false,
  traderTimerZone: false,
  candleHit: false,
  advancedMode: false
};

export const initialStrategiesList = [
  { name: 'Estratégia Sniper M5', tf: 'M5', indicators: ['RSI', 'MACD'], winrate: '82%', status: 'Ativa' },
  { name: 'Tendência Forte M1', tf: 'M1', indicators: ['Médias Móveis'], winrate: '76%', status: 'Pausada' }
];

export const initialLiveSignals = [
  { time: '20:55:00', asset: 'EURGBP-OTC', tf: 'M5', dir: 'PUT', prob: '89%', status: 'active', recovery: '-', entry: 14.0, option: 'MAIOR', pl: 0, cancelled: false },
  { time: '22:25:00', asset: 'EURJPY-OTC', tf: 'M5', dir: 'PUT', prob: '92%', status: 'ended', recovery: 'MARTINGALE 1', entry: 14.0, option: 'DIGITAL', pl: -21.0, cancelled: false },
  { time: '23:30:00', asset: 'EURGBP-OTC', tf: 'M5', dir: 'PUT', prob: '78%', status: 'new', recovery: '-', entry: 14.0, option: 'MAIOR', pl: 0, cancelled: false }
];

export const dashboardStats = [
  { title: 'Lucro Total', valueAmount: 1245.0, icon: 'Wallet', color: 'text-green-500', bg: 'bg-green-50' },
  { title: 'Taxa Win', value: '78.5%', icon: 'Target', color: 'text-blue-500', bg: 'bg-blue-50' },
  { title: 'Sinais Ativos', value: '12', icon: 'Activity', color: 'text-orange-500', bg: 'bg-orange-50' },
  { title: 'Operações', value: '342', icon: 'List', color: 'text-purple-500', bg: 'bg-purple-50' }
];

export const aiSignals = [
  { asset: 'EURUSD', prob: 91, dir: 'CALL', tf: 'M5' },
  { asset: 'GBPUSD', prob: 86, dir: 'PUT', tf: 'M15' },
  { asset: 'USDJPY', prob: 88, dir: 'CALL', tf: 'M1' }
];

export const copyTradingRanking = [
  { name: 'Alpha Trading', win: '84%', profitAmount: 5400.0, rank: '1º' },
  { name: 'Master FX', win: '79%', profitAmount: 3800.0, rank: '2º' },
  { name: 'Sniper Trader', win: '81%', profitAmount: 4100.0, rank: '3º' }
];

export const affiliateLeaders = [
  { pos: '1º', name: 'Renda Mais Youtube', referrals: '412 ativos', commissionAmount: 8240.0 },
  { pos: '2º', name: 'Alavancagem Vip Telegram', referrals: '280 ativos', commissionAmount: 5600.0 },
  { pos: '3º', name: 'Mentor Trader Consistente', referrals: '190 ativos', commissionAmount: 3800.0 }
];
