import type { BrokerAdapter } from '../broker-adapters/base/BrokerAdapter.js';
import type { RuntimeSlot, WorkerConfig } from '../contracts/types.js';
import { Logger } from '../telemetry/logger.js';
import { JobProcessor } from '../queue/JobProcessor.js';
import { SupabaseWorkerGateway } from '../queue/SupabaseWorkerGateway.js';
import { SlotRegistry } from '../runtime/SlotRegistry.js';

export class JobScheduler {
  constructor(
    private readonly config: WorkerConfig,
    private readonly gateway: SupabaseWorkerGateway,
    private readonly slotRegistry: SlotRegistry,
    private readonly processor: JobProcessor,
    private readonly adapter: BrokerAdapter,
    private readonly logger: Logger
  ) {}

  async tick() {
    const slots = this.slotRegistry.list().slice(0, this.config.maxConcurrentSlots);

    if (!slots.length) return;

    if (!this.adapter.canSubmit) {
      this.logger.debug('Scheduler is idle because the active adapter cannot submit real jobs', {
        adapter: this.adapter.key,
        activeSlots: slots.length
      });
      return;
    }

    for (const slot of slots) {
      await this.processSlot(slot);
    }
  }

  private async processSlot(slot: RuntimeSlot) {
    try {
      await this.gateway.claimBotLease(slot.workspaceId, slot.slot);
    } catch (error) {
      // Ignore "Bot lease already assigned" errors - they're expected if another worker has the lease
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Bot lease already assigned') || String((error as any)?.code) === 'P0001') {
        this.logger.debug('Skipping slot - lease already assigned to another worker', {
          workspaceId: slot.workspaceId,
          slot: slot.slot
        });
        return;
      }
      // Re-throw any other errors
      throw error;
    }
    
    const jobs = await this.gateway.claimDueTradeJobs(slot.workspaceId, slot.slot);

    if (!jobs.length) return;

    this.logger.info('Claimed due jobs for slot', {
      workspaceId: slot.workspaceId,
      slot: slot.slot,
      jobs: jobs.length
    });

    for (const job of jobs) {
      await this.processor.process(job);
    }
  }
}
