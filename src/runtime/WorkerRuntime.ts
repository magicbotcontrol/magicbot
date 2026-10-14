import type { WorkerConfig, WorkerStatus } from '../contracts/types.js';
import { Logger } from '../telemetry/logger.js';
import { delay } from '../utils/delay.js';
import { CommandProcessor } from '../commands/CommandProcessor.js';
import { SupabaseWorkerGateway } from '../queue/SupabaseWorkerGateway.js';
import { SlotRegistry } from './SlotRegistry.js';
import { JobScheduler } from '../scheduler/JobScheduler.js';

export class WorkerRuntime {
  private running = false;

  constructor(
    private readonly config: WorkerConfig,
    private readonly gateway: SupabaseWorkerGateway,
    private readonly slots: SlotRegistry,
    private readonly commands: CommandProcessor,
    private readonly scheduler: JobScheduler,
    private readonly logger: Logger
  ) {}

  async start() {
    if (this.running) return;
    this.running = true;

    await this.gateway.registerWorker();
    this.gateway.logWorkerSummary();
    await this.bootstrapRunningSlots();

    this.logger.info('Worker runtime started', {
      workerKey: this.config.workerKey,
      adapter: this.config.brokerAdapter
    });

    void this.runHeartbeatLoop();
    void this.runCommandLoop();
    void this.runSchedulerLoop();
  }

  async stop() {
    if (!this.running) return;
    this.running = false;

    try {
      await this.gateway.heartbeat('offline', {
        source: 'shutdown'
      });
    } catch (error) {
      this.logger.warn('Failed to send offline heartbeat during shutdown', {
        message: error instanceof Error ? error.message : 'unknown'
      });
    }
  }

  private async bootstrapRunningSlots() {
    const bots = await this.gateway.listDesiredRunningBots(this.config.maxConcurrentSlots);
    this.slots.replaceAll(
      bots.map((bot) => ({
        workspaceId: bot.workspace_id,
        slot: bot.slot,
        botInstanceId: bot.id
      }))
    );

    this.logger.info('Bootstrapped running slots', {
      count: bots.length
    });
  }

  private async runHeartbeatLoop() {
    while (this.running) {
      await this.safeLoop('heartbeat', async () => {
        const status: WorkerStatus = 'online';
        await this.gateway.heartbeat(status, {
          source: 'heartbeat_loop',
          active_slots: this.slots.list().length
        });
      });

      await delay(this.config.heartbeatMs);
    }
  }

  private async runCommandLoop() {
    while (this.running) {
      await this.safeLoop('commands', async () => {
        await this.commands.tick();
      });

      await delay(this.config.pollingMs);
    }
  }

  private async runSchedulerLoop() {
    while (this.running) {
      await this.safeLoop('scheduler', async () => {
        await this.scheduler.tick();
      });

      await delay(this.config.pollingMs);
    }
  }

  private async safeLoop(scope: string, fn: () => Promise<void>) {
    try {
      await fn();
    } catch (error) {
      this.logger.error(`Runtime loop failed: ${scope}`, {
        message: error instanceof Error ? error.message : 'unknown',
        stack: error instanceof Error ? error.stack : 'no stack',
        error: error
      });
      try {
        await this.gateway.heartbeat('degraded', {
          source: scope,
          error: error instanceof Error ? error.message : 'unknown'
        });
      } catch {
        this.logger.warn('Unable to publish degraded heartbeat after loop failure');
      }
    }
  }
}
