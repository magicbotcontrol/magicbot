export const DEFAULT_WORKSPACE_SLUG = 'default';

export const DEFAULT_SETTINGS_CONFIG = {
  broker: 'IQ Option',
  accountType: 'Demo',
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

export const DEFAULT_BROKERS = [
  { id: 'iqoption', name: 'IQ Option', logoColor: '#FF6B00', status: 'Linked', email: '', balance: 10450, baseCurrency: 'USD', accountType: 'Demo' },
  { id: 'quotex', name: 'Quotex', logoColor: '#00E676', status: 'Unlinked', email: '', balance: 0, baseCurrency: 'USD', accountType: 'Demo' },
  { id: 'pocketoption', name: 'Pocket Option', logoColor: '#29B6F6', status: 'Unlinked', email: '', balance: 0, baseCurrency: 'USD', accountType: 'Demo' },
  { id: 'exnova', name: 'Exnova', logoColor: '#8E24AA', status: 'Unlinked', email: '', balance: 0, baseCurrency: 'USD', accountType: 'Demo' },
  { id: 'bullex', name: 'Bullex', logoColor: '#37474F', status: 'Unlinked', email: '', balance: 0, baseCurrency: 'USD', accountType: 'Demo' },
  { id: 'broker10', name: 'Broker10', logoColor: '#000000', status: 'Unlinked', email: '', balance: 0, baseCurrency: 'USD', accountType: 'Demo' },
  { id: 'binomo', name: 'Binomo', logoColor: '#111827', status: 'Unlinked', email: '', balance: 0, baseCurrency: 'USD', accountType: 'Demo' },
  { id: 'olymptrade', name: 'Olymp Trade', logoColor: '#10B981', status: 'Unlinked', email: '', balance: 0, baseCurrency: 'USD', accountType: 'Demo' },
  { id: 'binolla', name: 'Binolla', logoColor: '#2563EB', status: 'Unlinked', email: '', balance: 0, baseCurrency: 'USD', accountType: 'Demo' },
  { id: 'avalon', name: 'Avalon', logoColor: '#14B8A6', status: 'Unlinked', email: '', balance: 0, baseCurrency: 'USD', accountType: 'Demo' },
  { id: 'homebroker', name: 'HomeBroker', logoColor: '#6366F1', status: 'Unlinked', email: '', balance: 0, baseCurrency: 'USD', accountType: 'Demo' },
  { id: 'casatrade', name: 'CasaTrade', logoColor: '#0F172A', status: 'Unlinked', email: '', balance: 0, baseCurrency: 'USD', accountType: 'Demo' }
];

export const DEFAULT_SIGNALS_DATE = '2026-05-28';

export const DEFAULT_SIGNALS_TEXT = 'M5;EURUSD;14:00;CALL\nM15;GBPUSD-OTC;14:30;PUT\nM1;USDJPY;15:00;CALL';
