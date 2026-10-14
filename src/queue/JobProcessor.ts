import type { JsonObject, WorkerRuntimeSyncPayload, WorkerConfig } from '../contracts/types.js';
import type { BrokerAdapter } from '../broker-adapters/base/BrokerAdapter.js';
import type { TradeJobRow } from '../contracts/types.js';
import { Logger } from '../telemetry/logger.js';
import { SupabaseWorkerGateway } from './SupabaseWorkerGateway.js';
import { resolveJobExecutionConfig } from './resolveJobExecutionConfig.js';
import type { BrokerSessionTracker } from '../broker-session/BrokerSessionTracker.js';

export class JobProcessor {
  constructor(
    private readonly config: WorkerConfig,
    private readonly gateway: SupabaseWorkerGateway,
    private readonly adapter: BrokerAdapter,
    private readonly sessions: BrokerSessionTracker,
    private readonly logger: Logger
  ) {}

  async process(job: TradeJobRow) {
    if (!this.adapter.canSubmit) {
      this.logger.warn('Skipping claimed job because broker adapter is placeholder', {
        jobId: job.id,
        asset: job.asset,
        adapter: this.adapter.key
      });
      return;
    }

    const startedAt = Date.now();
    const bot = await this.gateway.getBotInstanceById(job.bot_instance_id);
    const execution = resolveJobExecutionConfig({
      job,
      bot,
      config: this.config
    });
    const signal = {
      asset: job.asset,
      action: job.action,
      timeframe: job.timeframe,
      scheduledAt: job.scheduled_at,
      accountType: execution.accountType,
      amount: execution.amount
    } as const;

    try {
      await this.adapter.prepare(signal, execution.accountType);

      const result = await this.adapter.submit(signal);
      const resultPayload = {
        broker_adapter: this.adapter.key,
        execution_mode: this.adapter.key === 'paper' ? 'paper' : 'live',
        account_type: execution.accountType,
        configured_amount: execution.amount,
        account_type_source: execution.sources.accountType,
        amount_source: execution.sources.amount,
        bot_instance_id: bot?.id || job.bot_instance_id,
        bot_broker_key: bot?.broker_key || null,
        ...((result.payload || {}) as Record<string, unknown>)
      };

      if (!result.ok) {
        await this.publishBotSync(bot, {
          source: 'job_processor_result',
          job_id: job.id,
          last_attempt_status: 'failed'
        });
        await this.gateway.failTradeJob(
          job.id,
          'broker_submit_failed',
          result.providerMessage || 'Broker adapter rejected execution.',
          resultPayload
        );
        return;
      }

      await this.gateway.completeTradeJob(
        job.id,
        resultPayload,
        result.brokerOrderRef || '',
        result.latencyMs ?? Date.now() - startedAt
      );
      await this.publishBotSync(bot, {
        source: 'job_processor_result',
        job_id: job.id,
        last_attempt_status: 'executed',
        broker_order_ref: result.brokerOrderRef || ''
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown job execution error';
      this.logger.error('Job execution failed', { jobId: job.id, message });
      await this.publishBotSync(bot, {
        source: 'job_processor_result',
        job_id: job.id,
        last_attempt_status: 'failed',
        error: message
      });
      await this.gateway.failTradeJob(job.id, 'job_processor_exception', message);
    }
  }

  private async publishBotSync(
    bot: Awaited<ReturnType<SupabaseWorkerGateway['getBotInstanceById']>>,
    extra: JsonObject
  ) {
    if (!bot?.id) return;

    const checkedAt = new Date().toISOString();
    const adapterHealth = await this.adapter.healthcheck();
    const brokerSession = await this.sessions.inspect(bot);
    const payload: WorkerRuntimeSyncPayload = {
      at: checkedAt,
      source: String(extra.source || 'job_processor_result'),
      broker_session: {
        ...brokerSession,
        adapter_health_ok: adapterHealth.ok,
        adapter_health_message: adapterHealth.message || brokerSession.adapter_health_message || ''
      },
      ...extra
    };

    await this.gateway.updateBotRuntime(bot.id, {
      runtime_status: adapterHealth.ok ? 'running' : 'degraded',
      last_sync_payload: payload
    });
  }
}
