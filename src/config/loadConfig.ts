import 'dotenv/config';
import os from 'node:os';

import type { BrokerAccountType, WorkerConfig } from '../contracts/types.js';

function requireString(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function optionalString(name: string) {
  const value = process.env[name];
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function numberFromEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(`Invalid numeric env var: ${name}`);
  }
  return parsed;
}

function accountTypeFromEnv(name: string, fallback: BrokerAccountType): BrokerAccountType {
  const raw = process.env[name];
  if (!raw) return fallback;

  const normalized = raw.trim().toLowerCase();
  if (normalized === 'demo') return 'Demo';
  if (normalized === 'real') return 'Real';

  throw new Error(`Invalid account type env var: ${name}`);
}

export function loadConfig(): WorkerConfig {
  return {
    supabaseUrl: requireString('SUPABASE_URL'),
    supabaseServiceRoleKey: requireString('SUPABASE_SERVICE_ROLE_KEY'),
    workerKey: process.env.WORKER_KEY || `magicbot-worker-${os.hostname().toLowerCase()}`,
    hostName: process.env.WORKER_HOST_NAME || os.hostname(),
    processVersion: process.env.WORKER_VERSION || '0.1.0',
    brokerAdapter: process.env.WORKER_BROKER_ADAPTER || 'manual',
    iqoptionBridgeUrl: optionalString('WORKER_IQOPTION_BRIDGE_URL'),
    iqoptionBridgeToken: optionalString('WORKER_IQOPTION_BRIDGE_TOKEN'),
    defaultAccountType: accountTypeFromEnv('WORKER_DEFAULT_ACCOUNT_TYPE', 'Demo'),
    defaultOrderAmount: numberFromEnv('WORKER_DEFAULT_ORDER_AMOUNT', 2),
    simulatedLatencyMs: numberFromEnv('WORKER_SIMULATED_LATENCY_MS', 900),
    pollingMs: numberFromEnv('WORKER_POLLING_MS', 2000),
    heartbeatMs: numberFromEnv('WORKER_HEARTBEAT_MS', 10000),
    botLeaseSeconds: numberFromEnv('WORKER_BOT_LEASE_SECONDS', 60),
    jobLeadSeconds: numberFromEnv('WORKER_JOB_LEAD_SECONDS', 15),
    jobClaimLimit: numberFromEnv('WORKER_JOB_CLAIM_LIMIT', 3),
    maxCommandsPerTick: numberFromEnv('WORKER_MAX_COMMANDS_PER_TICK', 10),
    maxConcurrentSlots: numberFromEnv('WORKER_MAX_CONCURRENT_SLOTS', 2),
    staleJobSeconds: numberFromEnv('WORKER_STALE_JOB_SECONDS', 90)
  };
}
