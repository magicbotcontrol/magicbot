import type {
  AutomationCommandRow,
  BotInstanceRow,
  JsonObject,
  WorkerRuntimeSyncPayload,
  WorkerConfig
} from '../contracts/types.js';
import type { BrokerAdapter } from '../broker-adapters/base/BrokerAdapter.js';
import type { BrokerSessionTracker } from '../broker-session/BrokerSessionTracker.js';
import { Logger } from '../telemetry/logger.js';
import { SupabaseWorkerGateway } from '../queue/SupabaseWorkerGateway.js';
import { SlotRegistry } from '../runtime/SlotRegistry.js';

function readPayloadSlot(payload: JsonObject) {
  const raw = payload.slot;
  const slot = Number(raw);
  return Number.isFinite(slot) ? slot : null;
}

function parseTimestamp(value: unknown) {
  const time = Date.parse(String(value || ''));
  return Number.isFinite(time) ? time : 0;
}

function readBrokerSession(payload: JsonObject | null | undefined) {
  return (payload && typeof payload === 'object' ? payload.broker_session : null) as JsonObject | null;
}

function getBrokerSessionQuality(payload: JsonObject | null | undefined) {
  const session = readBrokerSession(payload);
  if (!session) return 0;

  const state = String(session.state || '').toLowerCase();
  const canTrade = Boolean(session.can_trade);

  if (state === 'session_connected' && canTrade) return 4;
  if (state === 'session_connected') return 3;
  if (state === 'credentials_ready' || state === 'linked') return 2;
  if (state === 'session_login_failed') return 1;
  return 0;
}

function shouldPreserveCurrentSnapshot(currentPayload: JsonObject | null | undefined, nextPayload: WorkerRuntimeSyncPayload) {
  const currentQuality = getBrokerSessionQuality(currentPayload);
  const nextQuality = getBrokerSessionQuality(nextPayload);
  const currentSession = readBrokerSession(currentPayload);
  const nextSession = readBrokerSession(nextPayload);
  const currentCheckedAt = parseTimestamp(currentSession?.checked_at);
  const nextCheckedAt = parseTimestamp(nextSession?.checked_at);

  if (currentCheckedAt > 0 && nextCheckedAt > 0 && currentCheckedAt > nextCheckedAt) {
    return true;
  }

  const freshnessWindowMs = 10 * 60 * 1000;
  const now = Date.now();
  const currentIsFresh = currentCheckedAt > 0 && now - currentCheckedAt <= freshnessWindowMs;

  return currentIsFresh && currentQuality > nextQuality;
}

export class CommandProcessor {
  constructor(
    private readonly config: WorkerConfig,
    private readonly gateway: SupabaseWorkerGateway,
    private readonly slotRegistry: SlotRegistry,
    private readonly adapter: BrokerAdapter,
    private readonly sessions: BrokerSessionTracker,
    private readonly logger: Logger
  ) {}

  async tick() {
    const pending = await this.gateway.listPendingCommands(this.config.maxCommandsPerTick);

    if (pending.length > 0) {
      // #region debug-point iqoption-sync-pending-commands
      this.logger.info('Pending commands fetched for processing', {
        count: pending.length,
        commandIds: pending.map((command) => command.id),
        commandTypes: pending.map((command) => command.command_type)
      });
      // #endregion
    }

    for (const command of pending) {
      const claimed = await this.gateway.claimPendingCommand(command.id);
      if (!claimed) continue;

      // #region debug-point iqoption-sync-command-claimed
      this.logger.info('Command claimed for processing', {
        commandId: claimed.id,
        type: claimed.command_type,
        workspaceId: claimed.workspace_id,
        botInstanceId: claimed.bot_instance_id || null
      });
      // #endregion

      try {
        await this.handleCommand(claimed);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown command error';
        this.logger.error('Command handling failed', { commandId: claimed.id, type: claimed.command_type, message });
        await this.gateway.finalizeCommand(claimed.id, 'failed', { error: message });
      }
    }
  }

  private async handleCommand(command: AutomationCommandRow) {
    switch (command.command_type) {
      case 'start_bot':
        await this.handleStartBot(command);
        break;
      case 'stop_bot':
        await this.handleStopBot(command);
        break;
      case 'sync_broker_state':
        await this.handleSyncBrokerState(command);
        break;
      case 'refresh_runtime':
        await this.handleRefreshRuntime(command);
        break;
      case 'force_release_lease':
        await this.handleForceReleaseLease(command);
        break;
      default:
        await this.gateway.finalizeCommand(command.id, 'cancelled', {
          message: `Command type ${command.command_type} is not implemented in the worker skeleton.`
        });
        break;
    }
  }

  private async resolveBotContext(command: AutomationCommandRow) {
    const slotFromPayload = readPayloadSlot(command.payload);
    const bot = command.bot_instance_id
      ? await this.gateway.getBotInstanceById(command.bot_instance_id)
      : null;

    const slot = slotFromPayload ?? bot?.slot ?? null;
    if (!slot) {
      throw new Error('Command payload does not include a valid slot and bot_instance_id was not resolved.');
    }

    return {
      slot,
      bot
    };
  }

  private async handleStartBot(command: AutomationCommandRow) {
    const { slot, bot } = await this.resolveBotContext(command);
    const leasedBot = await this.gateway.claimBotLease(command.workspace_id, slot);
    const runtimeSyncPayload = await this.buildRuntimeSyncPayload('worker_command_start', command.id, leasedBot || bot);

    await this.gateway.updateBotRuntime(leasedBot.id, {
      desired_status: 'running',
      runtime_status: 'assigned',
      last_runtime_error: '',
      last_sync_payload: runtimeSyncPayload
    });

    this.slotRegistry.activate({
      workspaceId: command.workspace_id,
      slot,
      botInstanceId: leasedBot.id
    });

    await this.gateway.finalizeCommand(command.id, 'completed', {
      slot,
      bot_instance_id: leasedBot.id,
      lease_expires_at: leasedBot.lease_expires_at
    });
  }

  private async handleStopBot(command: AutomationCommandRow) {
    const { slot, bot } = await this.resolveBotContext(command);

    try {
      await this.gateway.releaseBotLease(command.workspace_id, slot, 'stop_bot_command');
    } catch (error) {
      this.logger.warn('Release lease on stop command returned an error', {
        commandId: command.id,
        workspaceId: command.workspace_id,
        slot,
        message: error instanceof Error ? error.message : 'unknown'
      });
    }

    if (bot?.id) {
      await this.gateway.updateBotRuntime(bot.id, {
        desired_status: 'offline',
        runtime_status: 'idle',
        last_sync_payload: await this.buildRuntimeSyncPayload('worker_command_stop', command.id, bot)
      });
    }

    this.slotRegistry.deactivate(command.workspace_id, slot);

    await this.gateway.finalizeCommand(command.id, 'completed', {
      slot,
      stopped: true
    });
  }

  private async handleRefreshRuntime(command: AutomationCommandRow) {
    const { slot, bot } = await this.resolveBotContext(command);
    const expiredJobs = await this.gateway.expireStaleJobs();

    if (bot?.id) {
      const runtimeSyncPayload = await this.buildRuntimeSyncPayload('worker_command_refresh', command.id, bot);
      await this.gateway.updateBotRuntime(bot.id, {
        last_sync_payload: {
          ...runtimeSyncPayload,
          expiredJobs
        }
      });
    }

    await this.gateway.finalizeCommand(command.id, 'completed', {
      slot,
      expired_jobs: expiredJobs
    });
  }

  private async handleSyncBrokerState(command: AutomationCommandRow) {
    const { slot, bot } = await this.resolveBotContext(command);

    if (!bot?.id) {
      throw new Error('Broker sync command requires a resolved bot instance.');
    }

    // #region debug-point iqoption-sync-command-start
    this.logger.info('Handling sync_broker_state command', {
      commandId: command.id,
      workspaceId: command.workspace_id,
      botInstanceId: bot.id,
      slot,
      brokerKey: bot.broker_key,
      adapter: this.adapter.key
    });
    // #endregion

    const runtimeSyncPayload = await this.buildRuntimeSyncPayload('worker_command_broker_sync', command.id, bot);
    const siblingBots = bot.broker_key
      ? await this.gateway.listBotInstancesByBroker(command.workspace_id, bot.broker_key)
      : [bot];
    const targetBots = siblingBots.length ? siblingBots : [bot];
    const payloadQuality = getBrokerSessionQuality(runtimeSyncPayload);
    const confirmedAccountType = String(runtimeSyncPayload?.broker_session?.account_mode_confirmed || '').trim();
    const syncTargets = payloadQuality >= 3 ? targetBots : [bot];

    // #region debug-point iqoption-sync-command-payload
    this.logger.info('sync_broker_state payload built', {
      commandId: command.id,
      workspaceId: command.workspace_id,
      botInstanceId: bot.id,
      slot,
      brokerKey: bot.broker_key,
      sessionState: runtimeSyncPayload?.broker_session?.state || null,
      adapterKey: runtimeSyncPayload?.broker_session?.adapter_key || null,
      sessionSource: runtimeSyncPayload?.broker_session?.session_source || null,
      canTrade: Boolean(runtimeSyncPayload?.broker_session?.can_trade),
      checkedAt: runtimeSyncPayload?.broker_session?.checked_at || null,
      blockReason: runtimeSyncPayload?.broker_session?.block_reason || null,
      adapterHealthOk: Boolean(runtimeSyncPayload?.broker_session?.adapter_health_ok),
      adapterHealthMessage: runtimeSyncPayload?.broker_session?.adapter_health_message || null
    });
    // #endregion

    for (const targetBot of syncTargets) {
      if (!targetBot?.id) continue;

      if (
        confirmedAccountType
        && (confirmedAccountType === 'Demo' || confirmedAccountType === 'Real')
        && targetBot.confirmed_account_type !== confirmedAccountType
      ) {
        await this.gateway.confirmBotOperationalAccount(targetBot.id, confirmedAccountType);
      }

      if (shouldPreserveCurrentSnapshot(targetBot.last_sync_payload, runtimeSyncPayload)) {
        // #region debug-point iqoption-sync-skip-stale-downgrade
        this.logger.info('Skipping broker sync snapshot downgrade because a fresher or healthier snapshot already exists', {
          commandId: command.id,
          workspaceId: command.workspace_id,
          botInstanceId: targetBot.id,
          slot: targetBot.slot,
          brokerKey: targetBot.broker_key,
          currentQuality: getBrokerSessionQuality(targetBot.last_sync_payload),
          nextQuality: payloadQuality
        });
        // #endregion
        continue;
      }

      await this.gateway.updateBotRuntime(targetBot.id, {
        last_sync_payload: runtimeSyncPayload
      });
    }

    // #region debug-point iqoption-sync-command-persisted
    this.logger.info('sync_broker_state payload persisted', {
      commandId: command.id,
      workspaceId: command.workspace_id,
      botInstanceId: bot.id,
      slot,
      brokerKey: bot.broker_key,
      targetSlots: syncTargets.map((item) => item.slot)
    });
    // #endregion

    await this.gateway.finalizeCommand(command.id, 'completed', {
      slot,
      broker_session_state: runtimeSyncPayload?.broker_session?.state || null
    });
  }

  private async handleForceReleaseLease(command: AutomationCommandRow) {
    const { slot, bot } = await this.resolveBotContext(command);

    let released: BotInstanceRow | null = null;
    if (bot?.id) {
      released = await this.gateway.forceReleaseLease(bot.id, 'force_release_lease_command');
    }

    this.slotRegistry.deactivate(command.workspace_id, slot);

    await this.gateway.finalizeCommand(command.id, 'completed', {
      slot,
      released: Boolean(released)
    });
  }

  private async buildRuntimeSyncPayload(source: string, commandId: string, bot: BotInstanceRow | null): Promise<WorkerRuntimeSyncPayload> {
    const checkedAt = new Date().toISOString();
    const brokerSession = await this.sessions.inspect(bot);

    return {
      source,
      commandId,
      at: checkedAt,
      broker_session: brokerSession
    };
  }
}
