export type JsonObject = Record<string, unknown>;

export type AutomationCommandType =
  | 'start_bot'
  | 'stop_bot'
  | 'sync_broker_state'
  | 'force_release_lease'
  | 'pause_processing'
  | 'resume_processing'
  | 'refresh_runtime';

export type AutomationCommandStatus =
  | 'pending'
  | 'acknowledged'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type WorkerStatus = 'online' | 'degraded' | 'offline';
export type BrokerAccountType = 'Demo' | 'Real';
export type BrokerSessionState =
  | 'unlinked'
  | 'linked'
  | 'credentials_ready'
  | 'session_connected'
  | 'session_login_failed'
  | 'adapter_placeholder'
  | string;
export type BrokerSessionSource = 'unknown' | 'placeholder' | 'paper' | 'broker_api' | 'iqoption_real';
export type BrokerAccountConfirmationStatus = 'not_required' | 'pending' | 'confirmed' | 'mismatch';

export interface WorkerConfig {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  workerKey: string;
  hostName: string;
  processVersion: string;
  brokerAdapter: string;
  iqoptionBridgeUrl?: string;
  iqoptionBridgeToken?: string;
  defaultAccountType: BrokerAccountType;
  defaultOrderAmount: number;
  simulatedLatencyMs: number;
  pollingMs: number;
  heartbeatMs: number;
  botLeaseSeconds: number;
  jobLeadSeconds: number;
  jobClaimLimit: number;
  maxCommandsPerTick: number;
  maxConcurrentSlots: number;
  staleJobSeconds: number;
}

export interface AutomationCommandRow {
  id: string;
  workspace_id: string;
  bot_instance_id: string | null;
  command_type: AutomationCommandType;
  status: AutomationCommandStatus;
  payload: JsonObject;
  created_at: string;
  acknowledged_at: string | null;
  completed_at: string | null;
  result_payload: JsonObject;
}

export interface WorkerNodeRow {
  id: string;
  worker_key: string;
  host_name: string;
  process_version: string;
  status: WorkerStatus;
  last_heartbeat_at: string;
}

export interface BotInstanceRow {
  id: string;
  workspace_id: string;
  slot: number;
  broker_key: string;
  account_type: BrokerAccountType;
  confirmed_account_type?: BrokerAccountType | null;
  confirmed_account_at?: string | null;
  confirmed_by_user_id?: string | null;
  default_order_amount?: number | null;
  status: string;
  desired_status: string;
  runtime_status: string;
  assigned_worker_id: string | null;
  lease_token: string | null;
  lease_acquired_at: string | null;
  lease_expires_at: string | null;
  last_runtime_error: string;
  last_sync_payload: JsonObject;
}

export interface BrokerAuthState {
  broker_key: string;
  connection_status: string;
  auth_mode: string;
  worker_auth_ready: boolean;
  credential_reference: string;
  credential_email_masked: string;
  credentials_updated_at: string | null;
  secure_credentials_present: boolean;
  linked: boolean;
  state: 'unlinked' | 'linked' | 'credentials_ready' | string;
  label: string;
  hint: string;
  account_mode_detected?: BrokerAccountType | null;
  account_mode_confirmed?: BrokerAccountType | null;
  account_balance?: number | null;
  account_currency?: string;
  server_time?: string | null;
  session_fresh_until?: string | null;
  block_reason?: string;
}

export interface BrokerSessionSnapshot extends JsonObject {
  snapshot_version: 'v1';
  adapter_key: string;
  adapter_can_submit: boolean;
  adapter_health_ok: boolean;
  adapter_health_message: string;
  session_source: BrokerSessionSource;
  state: BrokerSessionState;
  label: string;
  hint: string;
  checked_at: string;
  linked?: boolean;
  connection_status?: string;
  auth_mode?: string;
  worker_auth_ready?: boolean;
  credential_reference?: string;
  credential_email_masked?: string;
  credentials_updated_at?: string | null;
  secure_credentials_present?: boolean;
  account_mode_detected: BrokerAccountType | null;
  account_mode_confirmed: BrokerAccountType | null;
  account_confirmation_required: boolean;
  account_confirmation_status: BrokerAccountConfirmationStatus;
  account_balance: number | null;
  account_currency: string;
  server_time: string | null;
  session_fresh_until: string | null;
  connected_at?: string | null;
  failed_at?: string | null;
  last_error?: string | null;
  can_trade: boolean;
  block_reason: string;
}

export interface WorkerRuntimeSyncPayload extends JsonObject {
  source: string;
  commandId?: string | null;
  at: string;
  broker_session: BrokerSessionSnapshot;
}

export interface TradeJobRow {
  id: string;
  workspace_id: string;
  bot_instance_id: string;
  asset: string;
  timeframe: string;
  time_text: string;
  action: 'CALL' | 'PUT';
  entry_amount: number;
  account_type_override?: BrokerAccountType | null;
  scheduled_at: string;
  expires_at: string;
  status: string;
  attempts: number;
}

export interface RuntimeSlot {
  workspaceId: string;
  slot: number;
  botInstanceId: string;
}

export interface BrokerHealthResult {
  ok: boolean;
  message?: string;
}

export interface BrokerSignalInput {
  asset: string;
  action: 'CALL' | 'PUT';
  timeframe: string;
  scheduledAt: string;
  accountType: BrokerAccountType;
  amount: number;
}

export interface BrokerSubmitResult {
  ok: boolean;
  brokerOrderRef?: string;
  providerMessage?: string;
  latencyMs?: number;
  payload?: JsonObject;
}
