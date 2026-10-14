import type {
  BotInstanceRow,
  BrokerAccountType,
  JsonObject,
  TradeJobRow,
  WorkerConfig
} from '../contracts/types.js';

export interface ResolvedJobExecutionConfig {
  accountType: BrokerAccountType;
  amount: number;
  sources: {
    accountType: 'trade_job' | 'bot_instance' | 'bot_payload' | 'env_default';
    amount: 'trade_job' | 'bot_instance' | 'bot_payload' | 'env_default';
  };
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readNestedValue(source: JsonObject, path: string[]): unknown {
  let current: unknown = source;

  for (const key of path) {
    if (!isJsonObject(current)) return undefined;
    current = current[key];
  }

  return current;
}

function normalizeAccountType(value: unknown): BrokerAccountType | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'demo' || normalized === 'practice') return 'Demo';
  if (normalized === 'real' || normalized === 'live') return 'Real';
  return null;
}

function normalizePositiveAmount(value: unknown): number | null {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return amount;
}

function resolveBotPayloadAccountType(payload: JsonObject): BrokerAccountType | null {
  const candidates = [
    readNestedValue(payload, ['accountType']),
    readNestedValue(payload, ['account_type']),
    readNestedValue(payload, ['execution', 'accountType']),
    readNestedValue(payload, ['execution', 'account_type']),
    readNestedValue(payload, ['broker', 'accountType']),
    readNestedValue(payload, ['broker', 'account_type'])
  ];

  for (const candidate of candidates) {
    const normalized = normalizeAccountType(candidate);
    if (normalized) return normalized;
  }

  return null;
}

function resolveBotPayloadAmount(payload: JsonObject): number | null {
  const candidates = [
    readNestedValue(payload, ['defaultOrderAmount']),
    readNestedValue(payload, ['default_order_amount']),
    readNestedValue(payload, ['orderAmount']),
    readNestedValue(payload, ['order_amount']),
    readNestedValue(payload, ['execution', 'defaultOrderAmount']),
    readNestedValue(payload, ['execution', 'default_order_amount']),
    readNestedValue(payload, ['execution', 'orderAmount']),
    readNestedValue(payload, ['execution', 'order_amount'])
  ];

  for (const candidate of candidates) {
    const normalized = normalizePositiveAmount(candidate);
    if (normalized) return normalized;
  }

  return null;
}

export function resolveJobExecutionConfig({
  job,
  bot,
  config
}: {
  job: TradeJobRow;
  bot: BotInstanceRow | null;
  config: WorkerConfig;
}): ResolvedJobExecutionConfig {
  const jobAccountType = normalizeAccountType(job.account_type_override);
  const botAccountType = normalizeAccountType(bot?.account_type);
  const payloadAccountType = bot?.last_sync_payload ? resolveBotPayloadAccountType(bot.last_sync_payload) : null;

  const jobAmount = normalizePositiveAmount(job.entry_amount);
  const botAmount = normalizePositiveAmount(bot?.default_order_amount);
  const payloadAmount = bot?.last_sync_payload ? resolveBotPayloadAmount(bot.last_sync_payload) : null;

  return {
    accountType: jobAccountType || botAccountType || payloadAccountType || config.defaultAccountType,
    amount: jobAmount || botAmount || payloadAmount || config.defaultOrderAmount,
    sources: {
      accountType: jobAccountType
        ? 'trade_job'
        : botAccountType
          ? 'bot_instance'
          : payloadAccountType
            ? 'bot_payload'
            : 'env_default',
      amount: jobAmount
        ? 'trade_job'
        : botAmount
          ? 'bot_instance'
          : payloadAmount
            ? 'bot_payload'
            : 'env_default'
    }
  };
}
