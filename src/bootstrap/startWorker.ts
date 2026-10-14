import { createBrokerAdapter } from '../broker-adapters/base/createBrokerAdapter.js';
import { BrokerSessionTracker } from '../broker-session/BrokerSessionTracker.js';
import { CommandProcessor } from '../commands/CommandProcessor.js';
import { loadConfig } from '../config/loadConfig.js';
import { JobProcessor } from '../queue/JobProcessor.js';
import { SupabaseWorkerGateway } from '../queue/SupabaseWorkerGateway.js';
import { SlotRegistry } from '../runtime/SlotRegistry.js';
import { WorkerRuntime } from '../runtime/WorkerRuntime.js';
import { JobScheduler } from '../scheduler/JobScheduler.js';
import { Logger } from '../telemetry/logger.js';

export async function startWorker() {
  const config = loadConfig();
  const logger = new Logger('worker');
  const gateway = new SupabaseWorkerGateway(config, logger.child('supabase'));
  const slotRegistry = new SlotRegistry();
  const adapter = createBrokerAdapter(config);
  const sessions = new BrokerSessionTracker(gateway, adapter, logger.child('broker-session'));
  const processor = new JobProcessor(config, gateway, adapter, sessions, logger.child('jobs'));
  const commands = new CommandProcessor(config, gateway, slotRegistry, adapter, sessions, logger.child('commands'));
  const scheduler = new JobScheduler(config, gateway, slotRegistry, processor, adapter, logger.child('scheduler'));
  const runtime = new WorkerRuntime(config, gateway, slotRegistry, commands, scheduler, logger.child('runtime'));

  let health;
  try {
    health = await adapter.healthcheck();
  } catch (error) {
    health = {
      ok: false,
      message: error instanceof Error ? error.message : 'Bootstrap healthcheck failed'
    };
    logger.warn('Broker adapter bootstrap healthcheck failed', {
      adapter: adapter.key,
      message: health.message
    });
  }
  logger.info('Broker adapter loaded', {
    adapter: adapter.key,
    canSubmit: adapter.canSubmit,
    defaultAccountType: config.defaultAccountType,
    defaultOrderAmount: config.defaultOrderAmount,
    health
  });

  await runtime.start();

  const shutdown = async (signal: string) => {
    logger.warn('Shutdown signal received', { signal });
    await runtime.stop();
    await adapter.disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}
