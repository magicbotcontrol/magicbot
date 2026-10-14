import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type {
  AutomationCommandRow,
  AutomationCommandStatus,
  BrokerAuthState,
  BotInstanceRow,
  JsonObject,
  TradeJobRow,
  WorkerConfig,
  WorkerNodeRow,
  WorkerStatus
} from '../contracts/types.js';
import { Logger } from '../telemetry/logger.js';

type BotRuntimePatch = Partial<
  Pick<BotInstanceRow, 'desired_status' | 'runtime_status' | 'last_runtime_error' | 'last_sync_payload'>
>;

function isOptionalDatabaseError(error: unknown) {
  const code = String((error as { code?: string })?.code || '').toUpperCase();
  const text = `${(error as { message?: string })?.message || ''} ${(error as { details?: string })?.details || ''} ${(error as { hint?: string })?.hint || ''}`.toLowerCase();
  return ['42P01', '42703', '42883', 'PGRST204', 'PGRST205'].includes(code)
    || text.includes('does not exist')
    || text.includes('schema cache')
    || text.includes('function')
    || text.includes('could not find');
}

export class SupabaseWorkerGateway {
  private readonly client: SupabaseClient;
  private workerNode: WorkerNodeRow | null = null;

  constructor(
    private readonly config: WorkerConfig,
    private readonly logger: Logger
  ) {
    this.client = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }

  getWorkerNode() {
    return this.workerNode;
  }

  async registerWorker() {
    const { data, error } = await this.client.rpc('register_automation_worker', {
      p_worker_key: this.config.workerKey,
      p_host_name: this.config.hostName,
      p_process_version: this.config.processVersion,
      p_capabilities: {
        adapter: this.config.brokerAdapter,
        commands: ['start_bot', 'stop_bot', 'sync_broker_state', 'refresh_runtime', 'force_release_lease'],
        scheduler: true
      },
      p_meta: {
        started_by: 'magicbot-autotrader-worker'
      }
    });

    if (error) throw error;
    this.workerNode = data as WorkerNodeRow;
    return this.workerNode;
  }

  async heartbeat(status: WorkerStatus, meta: JsonObject = {}) {
    const { data, error } = await this.client.rpc('worker_heartbeat', {
      p_worker_key: this.config.workerKey,
      p_status: status,
      p_meta: meta
    });

    if (error) throw error;
    this.workerNode = data as WorkerNodeRow;
    return this.workerNode;
  }

  async listPendingCommands(limit: number) {
    const { data, error } = await this.client
      .from('automation_commands')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return (data || []) as AutomationCommandRow[];
  }

  async claimPendingCommand(commandId: string) {
    if (!this.workerNode?.id) {
      throw new Error('Worker must be registered before claiming commands.');
    }

    const { data, error } = await this.client
      .from('automation_commands')
      .update({
        status: 'acknowledged',
        assigned_worker_id: this.workerNode.id,
        acknowledged_at: new Date().toISOString()
      })
      .eq('id', commandId)
      .eq('status', 'pending')
      .select('*')
      .maybeSingle();

    if (error) throw error;
    return (data || null) as AutomationCommandRow | null;
  }

  async finalizeCommand(commandId: string, status: Exclude<AutomationCommandStatus, 'pending' | 'acknowledged'>, resultPayload: JsonObject = {}) {
    if (!this.workerNode?.id) {
      throw new Error('Worker must be registered before finalizing commands.');
    }

    const { error } = await this.client
      .from('automation_commands')
      .update({
        status,
        assigned_worker_id: this.workerNode.id,
        completed_at: new Date().toISOString(),
        result_payload: resultPayload
      })
      .eq('id', commandId);

    if (error) throw error;
  }

  async listDesiredRunningBots(limit: number) {
    const { data, error } = await this.client
      .from('workspace_bot_instances')
      .select('*')
      .or('desired_status.eq.running,status.eq.running')
      .order('updated_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return (data || []) as BotInstanceRow[];
  }

  async getBotInstanceById(botInstanceId: string) {
    const { data, error } = await this.client
      .from('workspace_bot_instances')
      .select('*')
      .eq('id', botInstanceId)
      .maybeSingle();

    if (error) throw error;
    return (data || null) as BotInstanceRow | null;
  }

  async listBotInstancesByBroker(workspaceId: string, brokerKey: string) {
    const { data, error } = await this.client
      .from('workspace_bot_instances')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('broker_key', brokerKey)
      .order('slot', { ascending: true });

    if (error) throw error;
    return (data || []) as BotInstanceRow[];
  }

  async getBrokerAuthState(workspaceId: string, brokerKey: string) {
    if (!workspaceId || !brokerKey) return null;

    const { data, error } = await this.client.rpc('get_worker_broker_auth_state', {
      p_workspace_id: workspaceId,
      p_broker_key: brokerKey
    });

    if (error) {
      if (isOptionalDatabaseError(error)) {
        this.logger.warn('Broker auth RPC is unavailable; continuing without secure auth inspection', {
          workspaceId,
          brokerKey,
          message: error.message || 'unknown'
        });
        return null;
      }
      throw error;
    }
    return (data || null) as BrokerAuthState | null;
  }

  async getBrokerCredentials(workspaceId: string, brokerKey: string) {
    if (!workspaceId || !brokerKey) return null;

    const { data, error } = await this.client.rpc('get_worker_broker_credentials', {
      p_workspace_id: workspaceId,
      p_broker_key: brokerKey
    });

    if (error) {
      if (isOptionalDatabaseError(error)) {
        this.logger.warn('Broker credentials RPC is unavailable', {
          workspaceId,
          brokerKey,
          message: error.message || 'unknown'
        });
        return null;
      }
      throw error;
    }
    return data as { email: string; password: string } | null;
  }

  async updateBotRuntime(botInstanceId: string, patch: BotRuntimePatch) {
    const { data, error } = await this.client
      .from('workspace_bot_instances')
      .update(patch)
      .eq('id', botInstanceId)
      .select('*')
      .maybeSingle();

    if (error) throw error;
    return (data || null) as BotInstanceRow | null;
  }

  async confirmBotOperationalAccount(botInstanceId: string, accountType: 'Demo' | 'Real') {
    const { data, error } = await this.client
      .from('workspace_bot_instances')
      .update({
        confirmed_account_type: accountType,
        confirmed_account_at: new Date().toISOString(),
        confirmed_by_user_id: null
      })
      .eq('id', botInstanceId)
      .select('*')
      .maybeSingle();

    if (error) throw error;
    return (data || null) as BotInstanceRow | null;
  }

  async claimBotLease(workspaceId: string, slot: number) {
    const { data, error } = await this.client.rpc('claim_bot_lease', {
      p_worker_key: this.config.workerKey,
      p_workspace_id: workspaceId,
      p_slot: slot,
      p_lease_seconds: this.config.botLeaseSeconds
    });

    if (error) throw error;
    return data as BotInstanceRow;
  }

  async releaseBotLease(workspaceId: string, slot: number, reason = '') {
    const { data, error } = await this.client.rpc('release_bot_lease', {
      p_worker_key: this.config.workerKey,
      p_workspace_id: workspaceId,
      p_slot: slot,
      p_reason: reason
    });

    if (error) throw error;
    return data as BotInstanceRow;
  }

  async forceReleaseLease(botInstanceId: string, reason = 'forced_by_worker') {
    const { data, error } = await this.client
      .from('workspace_bot_instances')
      .update({
        assigned_worker_id: null,
        lease_token: null,
        lease_acquired_at: null,
        lease_expires_at: null,
        runtime_status: 'idle',
        last_runtime_error: reason
      })
      .eq('id', botInstanceId)
      .select('*')
      .maybeSingle();

    if (error) throw error;
    return (data || null) as BotInstanceRow | null;
  }

  async claimDueTradeJobs(workspaceId: string, slot: number) {
    const { data, error } = await this.client.rpc('claim_due_trade_jobs', {
      p_worker_key: this.config.workerKey,
      p_workspace_id: workspaceId,
      p_slot: slot,
      p_limit: this.config.jobClaimLimit,
      p_lead_seconds: this.config.jobLeadSeconds
    });

    if (error) throw error;
    return (data || []) as TradeJobRow[];
  }

  async completeTradeJob(jobId: string, resultPayload: JsonObject = {}, brokerOrderRef = '', latencyMs?: number) {
    const { error } = await this.client.rpc('complete_trade_job_attempt', {
      p_worker_key: this.config.workerKey,
      p_job_id: jobId,
      p_broker_order_ref: brokerOrderRef,
      p_result_payload: resultPayload,
      p_latency_ms: latencyMs ?? null
    });

    if (error) throw error;
  }

  async failTradeJob(jobId: string, errorCode: string, errorMessage: string, resultPayload: JsonObject = {}) {
    const { error } = await this.client.rpc('fail_trade_job_attempt', {
      p_worker_key: this.config.workerKey,
      p_job_id: jobId,
      p_error_code: errorCode,
      p_error_message: errorMessage,
      p_result_payload: resultPayload
    });

    if (error) throw error;
  }

  async expireStaleJobs() {
    const { data, error } = await this.client.rpc('expire_stale_trade_jobs', {
      p_max_idle_seconds: this.config.staleJobSeconds
    });

    if (error) throw error;
    return Number(data || 0);
  }

  logWorkerSummary() {
    this.logger.info('Supabase gateway ready', {
      workerKey: this.config.workerKey,
      workerNodeId: this.workerNode?.id || null
    });
  }
}
