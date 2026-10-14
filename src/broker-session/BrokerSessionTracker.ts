import type { BrokerAdapter } from '../broker-adapters/base/BrokerAdapter.js';
import type { IqOptionBrokerAdapter } from '../broker-adapters/iqoption/IqOptionBrokerAdapter.js';
import type {
  BrokerAuthState,
  BotInstanceRow,
  BrokerAccountConfirmationStatus,
  BrokerAccountType,
  BrokerSessionSnapshot,
  BrokerSessionSource
} from '../contracts/types.js';
import { Logger } from '../telemetry/logger.js';
import type { SupabaseWorkerGateway } from '../queue/SupabaseWorkerGateway.js';

type SessionCacheEntry = {
  key: string;
  status: 'unknown' | 'connected' | 'failed';
  checkedAt: string;
  connectedAt: string | null;
  failedAt: string | null;
  lastError: string | null;
  lastConnectAttemptAt: number;
};

function createCacheKey(bot: BotInstanceRow) {
  return `${bot.workspace_id}:${bot.broker_key}`;
}

function normalizeAccountType(value: unknown): BrokerAccountType | null {
  return value === 'Real' || value === 'Demo' ? value : null;
}

export class BrokerSessionTracker {
  private readonly cache = new Map<string, SessionCacheEntry>();

  constructor(
    private readonly gateway: SupabaseWorkerGateway,
    private readonly adapter: BrokerAdapter,
    private readonly logger: Logger
  ) {}

  private resolveSessionSource(): BrokerSessionSource {
    if (this.adapter.key === 'paper') return 'paper';
    if (!this.adapter.canSubmit) return 'placeholder';
    return this.adapter.key === 'iqoption' ? 'iqoption_real' : 'broker_api';
  }

  private resolveConfirmationStatus({
    sessionSource,
    detectedAccountType,
    confirmedAccountType
  }: {
    sessionSource: BrokerSessionSource;
    detectedAccountType: BrokerAccountType | null;
    confirmedAccountType: BrokerAccountType | null;
  }): BrokerAccountConfirmationStatus {
    if (sessionSource !== 'iqoption_real') {
      return 'not_required';
    }

    if (!confirmedAccountType) {
      return 'pending';
    }

    if (detectedAccountType && detectedAccountType !== confirmedAccountType) {
      return 'mismatch';
    }

    return 'confirmed';
  }

  private async buildSnapshot({
    bot,
    checkedAt,
    adapterHealth,
    state,
    label,
    hint,
    brokerAuth = null,
    connectedAt = null,
    failedAt = null,
    lastError = null
  }: {
    bot: BotInstanceRow | null;
    checkedAt: string;
    adapterHealth: { ok: boolean; message?: string };
    state: string;
    label: string;
    hint: string;
    brokerAuth?: BrokerAuthState | null;
    connectedAt?: string | null;
    failedAt?: string | null;
    lastError?: string | null;
  }): Promise<BrokerSessionSnapshot> {
    const sessionSource = this.resolveSessionSource();

    // Get real snapshot data from adapter if available
    let detectedAccountType: BrokerAccountType | null = null;
    let accountBalance: number | null = null;
    let accountCurrency = '';
    let serverTime: string | null = null;
    let adapterCanTrade = false;

    if (this.adapter.key === 'iqoption' && 'getSessionSnapshot' in this.adapter) {
      const iqAdapter = this.adapter as IqOptionBrokerAdapter;
      try {
        const iqSnapshot = await iqAdapter.getSessionSnapshot();
        if (iqSnapshot) {
          detectedAccountType = iqSnapshot.accountMode;
          accountBalance = iqSnapshot.balance;
          accountCurrency = iqSnapshot.currency;
          serverTime = iqSnapshot.serverTime;
          adapterCanTrade = iqSnapshot.canTrade;
        }
      } catch (error) {
        this.logger.warn('Unable to read IQ Option session snapshot during broker state build', {
          workspaceId: bot?.workspace_id || null,
          botInstanceId: bot?.id || null,
          brokerKey: bot?.broker_key || null,
          message: error instanceof Error ? error.message : 'unknown'
        });
      }
    }

    // Fall back to brokerAuth if adapter doesn't have data
    if (!detectedAccountType) {
      detectedAccountType = normalizeAccountType((brokerAuth || {}).account_mode_detected);
    }
    if (accountBalance === null) {
      const accountBalanceRaw = Number((brokerAuth || {}).account_balance);
      accountBalance = Number.isFinite(accountBalanceRaw) ? Number(accountBalanceRaw) : null;
    }
    if (!accountCurrency) {
      accountCurrency = typeof (brokerAuth || {}).account_currency === 'string'
        ? String((brokerAuth || {}).account_currency)
        : '';
    }
    if (!serverTime) {
      serverTime = typeof (brokerAuth || {}).server_time === 'string' ? String((brokerAuth || {}).server_time) : null;
    }

    const confirmedAccountType = normalizeAccountType(
      (brokerAuth || {}).account_mode_confirmed ?? bot?.confirmed_account_type ?? null
    );
    const accountConfirmationStatus = this.resolveConfirmationStatus({
      sessionSource,
      detectedAccountType,
      confirmedAccountType
    });
    const accountConfirmationRequired = sessionSource === 'iqoption_real';

    const canTrade = (
      state === 'session_connected'
      && sessionSource === 'iqoption_real'
      && accountConfirmationStatus === 'confirmed'
      && adapterCanTrade
    );

    return {
      ...(brokerAuth || {}),
      snapshot_version: 'v1',
      adapter_key: this.adapter.key,
      adapter_can_submit: this.adapter.canSubmit,
      adapter_health_ok: adapterHealth.ok,
      adapter_health_message: adapterHealth.message || '',
      session_source: sessionSource,
      state,
      label,
      hint,
      checked_at: checkedAt,
      account_mode_detected: detectedAccountType,
      account_mode_confirmed: confirmedAccountType,
      account_confirmation_required: accountConfirmationRequired,
      account_confirmation_status: accountConfirmationStatus,
      account_balance: accountBalance,
      account_currency: accountCurrency,
      server_time: serverTime,
      session_fresh_until: typeof (brokerAuth || {}).session_fresh_until === 'string' ? String((brokerAuth || {}).session_fresh_until) : null,
      connected_at: connectedAt,
      failed_at: failedAt,
      last_error: lastError,
      can_trade: canTrade,
      block_reason: canTrade
        ? ''
        : (
          typeof (brokerAuth || {}).block_reason === 'string'
            ? String((brokerAuth || {}).block_reason)
            : state === 'session_connected' && sessionSource !== 'iqoption_real'
              ? 'real_broker_adapter_required'
              : accountConfirmationStatus === 'pending'
                ? 'account_confirmation_required'
                : accountConfirmationStatus === 'mismatch'
                  ? 'confirmed_account_mismatch'
                  : state !== 'session_connected'
                    ? 'broker_session_not_connected'
                    : 'trade_not_ready'
        )
    };
  }

  async inspect(bot: BotInstanceRow | null): Promise<BrokerSessionSnapshot> {
    const checkedAt = new Date().toISOString();

    if (!bot?.workspace_id || !bot.broker_key) {
      return this.buildSnapshot({
        bot,
        checkedAt,
        adapterHealth: { ok: false, message: '' },
        state: 'unlinked',
        label: 'Nao vinculada',
        hint: 'Bot nao possui broker_key associado.'
      });
    }

    // #region debug-point iqoption-sync-inspect-start
    this.logger.info('Broker session inspect started', {
      workspaceId: bot.workspace_id,
      botInstanceId: bot.id,
      brokerKey: bot.broker_key,
      adapter: this.adapter.key,
      checkedAt
    });
    // #endregion

    // Get broker auth state and credentials first
    const brokerAuth = await this.gateway.getBrokerAuthState(bot.workspace_id, bot.broker_key);
    const brokerCredentials = await this.gateway.getBrokerCredentials(bot.workspace_id, bot.broker_key);

    // #region debug-point iqoption-sync-auth-state
    this.logger.info('Broker auth state loaded for session inspect', {
      workspaceId: bot.workspace_id,
      botInstanceId: bot.id,
      brokerKey: bot.broker_key,
      linked: Boolean(brokerAuth?.linked),
      brokerState: brokerAuth?.state || null,
      hasCredentials: Boolean(brokerCredentials?.email && brokerCredentials?.password),
      credentialEmailMasked: brokerCredentials?.email
        ? `${String(brokerCredentials.email).slice(0, 2)}***${String(brokerCredentials.email).slice(-10)}`
        : null
    });
    // #endregion

    // Set credentials on adapter if available and it's the IQ Option adapter
    if (this.adapter.key === 'iqoption' && 'setCredentials' in this.adapter && brokerCredentials) {
      (this.adapter as IqOptionBrokerAdapter).setCredentials(brokerCredentials.email, brokerCredentials.password);
    }

    const adapterHealth = await this.adapter.healthcheck();

    // #region debug-point iqoption-sync-healthcheck
    this.logger.info('Adapter healthcheck finished for session inspect', {
      workspaceId: bot.workspace_id,
      botInstanceId: bot.id,
      brokerKey: bot.broker_key,
      adapter: this.adapter.key,
      adapterHealthOk: adapterHealth.ok,
      adapterHealthMessage: adapterHealth.message || ''
    });
    // #endregion

    if (!this.adapter.canSubmit) {
      return this.buildSnapshot({
        bot,
        checkedAt,
        adapterHealth,
        state: 'adapter_placeholder',
        label: 'Adapter sem envio',
        hint: adapterHealth.message || 'Adapter atual nao executa envio real de ordens.'
      });
    }

    if (!brokerAuth?.linked) {
      return this.buildSnapshot({
        bot,
        checkedAt,
        adapterHealth,
        state: 'unlinked',
        label: 'Nao vinculada',
        hint: 'Nenhuma credencial vinculada para este bot.',
        brokerAuth
      });
    }

    if (String(brokerAuth.state || '').toLowerCase() !== 'credentials_ready') {
      return this.buildSnapshot({
        bot,
        checkedAt,
        adapterHealth,
        state: brokerAuth.state || 'linked',
        label: brokerAuth.label || 'Vinculada',
        hint: brokerAuth.hint || 'Existe vinculo, mas a credencial ainda nao esta pronta para sessao operacional.',
        brokerAuth
      });
    }

    const cacheKey = createCacheKey(bot);
    const cached = this.cache.get(cacheKey);
    const now = Date.now();
    const canAttemptConnect = !cached || (cached.status !== 'connected' && now - cached.lastConnectAttemptAt > 15_000);

    if (canAttemptConnect) {
      try {
        // #region debug-point iqoption-sync-connect-attempt
        this.logger.info('Broker session connect attempt started', {
          workspaceId: bot.workspace_id,
          botInstanceId: bot.id,
          brokerKey: bot.broker_key,
          adapter: this.adapter.key,
          previousStatus: cached?.status || null
        });
        // #endregion
        await this.adapter.connect();
        const next: SessionCacheEntry = {
          key: cacheKey,
          status: 'connected',
          checkedAt,
          connectedAt: checkedAt,
          failedAt: null,
          lastError: null,
          lastConnectAttemptAt: now
        };
        this.cache.set(cacheKey, next);
        // #region debug-point iqoption-sync-connect-success
        this.logger.info('Broker session connect attempt succeeded', {
          workspaceId: bot.workspace_id,
          botInstanceId: bot.id,
          brokerKey: bot.broker_key,
          adapter: this.adapter.key,
          connectedAt: checkedAt
        });
        // #endregion
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown';
        this.logger.warn('Broker session connect failed', {
          workspaceId: bot.workspace_id,
          brokerKey: bot.broker_key,
          adapter: this.adapter.key,
          message
        });
        const next: SessionCacheEntry = {
          key: cacheKey,
          status: 'failed',
          checkedAt,
          connectedAt: cached?.connectedAt || null,
          failedAt: checkedAt,
          lastError: message,
          lastConnectAttemptAt: now
        };
        this.cache.set(cacheKey, next);
        // #region debug-point iqoption-sync-connect-failed
        this.logger.error('Broker session connect attempt failed with cache update', {
          workspaceId: bot.workspace_id,
          botInstanceId: bot.id,
          brokerKey: bot.broker_key,
          adapter: this.adapter.key,
          message,
          stack: error instanceof Error ? error.stack : 'no stack'
        });
        // #endregion
      }
    }

    const finalCache = this.cache.get(cacheKey);
    if (finalCache?.status === 'failed') {
      return this.buildSnapshot({
        bot,
        checkedAt,
        adapterHealth,
        state: 'session_login_failed',
        label: 'Falha no login',
        hint: finalCache.lastError ? `Falha ao iniciar sessao: ${finalCache.lastError}` : 'Falha ao iniciar sessao.',
        brokerAuth,
        connectedAt: finalCache.connectedAt,
        failedAt: finalCache.failedAt,
        lastError: finalCache.lastError
      });
    }

    if (finalCache?.status === 'connected') {
      // #region debug-point iqoption-sync-confirmation-pending
      this.logger.info('Broker session connected cache ready for snapshot build', {
        workspaceId: bot.workspace_id,
        botInstanceId: bot.id,
        brokerKey: bot.broker_key,
        adapter: this.adapter.key,
        connectedAt: finalCache.connectedAt
      });
      // #endregion
      const connectedSnapshot = await this.buildSnapshot({
        bot,
        checkedAt,
        adapterHealth,
        state: 'session_connected',
        label: 'Sessao conectada',
        hint: 'Sessao operacional iniciada pelo worker.',
        brokerAuth,
        connectedAt: finalCache.connectedAt
      });

      const shouldAutoConfirm = (
        connectedSnapshot.session_source === 'iqoption_real'
        && connectedSnapshot.account_confirmation_status === 'pending'
        && normalizeAccountType(connectedSnapshot.account_mode_detected)
        && bot?.id
      );

      if (!shouldAutoConfirm) {
        return connectedSnapshot;
      }

      const detectedAccountType = normalizeAccountType(connectedSnapshot.account_mode_detected);
      if (!detectedAccountType) {
        return connectedSnapshot;
      }

      // #region debug-point iqoption-sync-auto-confirm-attempt
      this.logger.info('Broker session pending confirmation will be auto-confirmed', {
        workspaceId: bot.workspace_id,
        botInstanceId: bot.id,
        brokerKey: bot.broker_key,
        adapter: this.adapter.key,
        detectedAccountType
      });
      // #endregion

      const updatedBot = await this.gateway.confirmBotOperationalAccount(bot.id, detectedAccountType);

      // #region debug-point iqoption-sync-auto-confirm-success
      this.logger.info('Broker session detected account auto-confirmed', {
        workspaceId: bot.workspace_id,
        botInstanceId: bot.id,
        brokerKey: bot.broker_key,
        adapter: this.adapter.key,
        detectedAccountType,
        confirmedAccountAt: updatedBot?.confirmed_account_at || null
      });
      // #endregion

      return this.buildSnapshot({
        bot: updatedBot || {
          ...bot,
          confirmed_account_type: detectedAccountType,
          confirmed_account_at: new Date().toISOString()
        },
        checkedAt,
        adapterHealth,
        state: 'session_connected',
        label: 'Sessao conectada',
        hint: 'Sessao operacional iniciada pelo worker.',
        brokerAuth: {
          ...(brokerAuth || {}),
          account_mode_confirmed: detectedAccountType
        },
        connectedAt: finalCache.connectedAt
      });
    }

    return this.buildSnapshot({
      bot,
      checkedAt,
      adapterHealth,
      state: 'credentials_ready',
      label: 'Credencial pronta',
      hint: 'Credencial pronta, aguardando inicio de sessao operacional.',
      brokerAuth
    });
  }
}
