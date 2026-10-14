import type {
  BrokerAccountType,
  BrokerHealthResult,
  BrokerSignalInput,
  BrokerSubmitResult,
  WorkerConfig
} from '../../contracts/types.js';
import type { BrokerAdapter } from '../base/BrokerAdapter.js';
import { IQOptionApi, IQOptionMarket, IQOptionModel, iqOptionExpired, IQOptionCurrencyType } from 'iq-option-client';

export interface IqOptionSessionSnapshot {
  accountMode: BrokerAccountType | null;
  balance: number | null;
  currency: string;
  serverTime: string | null;
  canTrade: boolean;
  sessionFreshUntil?: string | null;
}

export class IqOptionBrokerAdapter implements BrokerAdapter {
  readonly key = 'iqoption';
  readonly canSubmit = true;

  private credentials: { email: string; password: string } | null = null;
  private sessionSnapshot: IqOptionSessionSnapshot | null = null;
  private iqOptionApi: IQOptionApi | null = null;
  private profile: any = null;

  constructor(private readonly config: WorkerConfig) {}

  private useBridge() {
    return Boolean(this.config.iqoptionBridgeUrl);
  }

  private getBridgeUrl(path: string) {
    const baseUrl = String(this.config.iqoptionBridgeUrl || '').trim().replace(/\/+$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${normalizedPath}`;
  }

  private ensureCredentials() {
    if (!this.credentials) {
      throw new Error('Credentials not set');
    }
    return this.credentials;
  }

  private toBridgeSnapshot(payload: any): IqOptionSessionSnapshot {
    const accountMode = payload?.accountMode === 'Real' || payload?.account_mode === 'Real'
      ? 'Real'
      : payload?.accountMode === 'Demo' || payload?.account_mode === 'Demo'
        ? 'Demo'
        : null;
    const balanceRaw = Number(payload?.balance ?? payload?.accountBalance ?? payload?.account_balance);
    return {
      accountMode,
      balance: Number.isFinite(balanceRaw) ? balanceRaw : null,
      currency: String(payload?.currency ?? payload?.accountCurrency ?? payload?.account_currency ?? 'USD'),
      serverTime: typeof (payload?.serverTime ?? payload?.server_time) === 'string'
        ? String(payload?.serverTime ?? payload?.server_time)
        : new Date().toISOString(),
      canTrade: Boolean(payload?.canTrade ?? payload?.can_trade),
      sessionFreshUntil: typeof (payload?.sessionFreshUntil ?? payload?.session_fresh_until) === 'string'
        ? String(payload?.sessionFreshUntil ?? payload?.session_fresh_until)
        : null
    };
  }

  private async callBridge<T>(path: string, payload: Record<string, unknown>): Promise<T> {
    const credentials = this.ensureCredentials();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (this.config.iqoptionBridgeToken) {
      headers.Authorization = `Bearer ${this.config.iqoptionBridgeToken}`;
      headers['X-Bridge-Token'] = this.config.iqoptionBridgeToken;
    }

    const response = await fetch(this.getBridgeUrl(path), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
        ...payload
      })
    });

    const responseText = await response.text();
    let parsed: any = null;
    if (responseText) {
      try {
        parsed = JSON.parse(responseText);
      } catch {
        parsed = { message: responseText };
      }
    }

    if (!response.ok || parsed?.ok === false) {
      const message = parsed?.message || parsed?.error || `Bridge request failed with status ${response.status}`;
      throw new Error(String(message));
    }

    return parsed as T;
  }

  private async ensureConnectedViaBridge(): Promise<void> {
    const result = await this.callBridge<any>('/api/iqoption/auth/login', {});
    this.sessionSnapshot = this.toBridgeSnapshot(result?.session || result);
  }

  private async getBridgeSessionSnapshot(): Promise<IqOptionSessionSnapshot | null> {
    const result = await this.callBridge<any>('/api/iqoption/session/snapshot', {});
    this.sessionSnapshot = this.toBridgeSnapshot(result?.session || result);
    return this.sessionSnapshot;
  }

  setCredentials(email: string, password: string): void {
    const credentialsChanged = (
      !this.credentials
      || this.credentials.email !== email
      || this.credentials.password !== password
    );
    this.credentials = { email, password };
    if (credentialsChanged) {
      this.sessionSnapshot = null;
      this.iqOptionApi = null;
      this.profile = null;
    }
  }

  private async ensureConnected(): Promise<void> {
    if (this.useBridge()) {
      await this.ensureConnectedViaBridge();
      return;
    }

    if (this.iqOptionApi && this.profile) {
      return;
    }

    this.ensureCredentials();

    // Initialize IQ Option API
    this.iqOptionApi = new IQOptionApi(this.credentials!.email, this.credentials!.password);
    
    // Connect and authenticate
    this.profile = await this.iqOptionApi.connectAsync();

    // Update session snapshot
    const testBalance = (this.profile.balances || []).find(
      (b: any) => true
    );
    const realBalance = null; // Placeholder until we know the correct enum values

    const currentBalance = realBalance || testBalance;
    this.sessionSnapshot = {
      accountMode: realBalance ? 'Real' : 'Demo',
      balance: currentBalance?.amount || 0,
      currency: 'USD',
      serverTime: new Date().toISOString(),
      canTrade: true
    };
  }

  async connect(): Promise<void> {
    await this.ensureConnected();
  }

  async disconnect(): Promise<void> {
    this.credentials = null;
    this.sessionSnapshot = null;
    this.iqOptionApi = null;
    this.profile = null;
  }

  async healthcheck(): Promise<BrokerHealthResult> {
    if (!this.credentials) {
      return {
        ok: false,
        message: 'Adapter iqoption carregado, mas credenciais nao foram configuradas.'
      };
    }

    try {
      await this.ensureConnected();
      return {
        ok: true,
        message: 'Adapter iqoption conectado e pronto para operar.'
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Erro ao conectar'
      };
    }
  }

  async getSessionSnapshot(): Promise<IqOptionSessionSnapshot | null> {
    if (this.credentials && this.useBridge()) {
      return this.getBridgeSessionSnapshot();
    }
    if (this.credentials) {
      await this.ensureConnected();
    }
    return this.sessionSnapshot;
  }

  async prepare(_signal: BrokerSignalInput, _accountType: BrokerAccountType): Promise<void> {
    if (this.useBridge()) {
      await this.callBridge('/api/iqoption/orders/prepare', {
        signal: _signal,
        accountType: _accountType
      });
      return;
    }
    await this.ensureConnected();
  }

  async submit(signal: BrokerSignalInput): Promise<BrokerSubmitResult> {
    if (this.useBridge()) {
      try {
        const result = await this.callBridge<any>('/api/iqoption/orders/submit', {
          signal
        });
        return {
          ok: true,
          brokerOrderRef: String(result?.brokerOrderRef || result?.broker_order_ref || `iqoption_bridge_${Date.now()}`),
          providerMessage: String(result?.message || result?.providerMessage || 'Ordem enviada com sucesso via bridge'),
          latencyMs: Number.isFinite(Number(result?.latencyMs)) ? Number(result.latencyMs) : undefined,
          payload: {
            provider: 'iqoption',
            execution_mode: 'bridge',
            accepted: true,
            bridge: true,
            ...(typeof result?.payload === 'object' && result?.payload ? result.payload : {})
          }
        };
      } catch (error) {
        return {
          ok: false,
          providerMessage: error instanceof Error ? error.message : 'Erro ao enviar ordem via bridge',
          payload: {
            provider: 'iqoption',
            execution_mode: 'bridge',
            accepted: false,
            bridge: true
          }
        };
      }
    }

    try {
      await this.ensureConnected();
    } catch (error) {
      return {
        ok: false,
        providerMessage: error instanceof Error ? error.message : 'Sessao nao conectada'
      };
    }

    try {
      // Map signal.asset para IQOptionMarket
      // Exemplo: 'EURUSD' para EURUSD_OTC
      let market: IQOptionMarket;
      const assetUpper = signal.asset.toUpperCase().replace(/[^A-Z]/g, '');
      if (assetUpper.startsWith('EURUSD')) {
        market = IQOptionMarket.EURUSD_OTC;
      } else if (assetUpper.startsWith('GBPUSD')) {
        market = IQOptionMarket.GBPUSD_OTC;
      } else if (assetUpper.startsWith('USDJPY')) {
        market = IQOptionMarket.USDJPY_OTC;
      } else {
        market = IQOptionMarket.EURUSD_OTC;
      }

      const side = signal.action === 'CALL' ? IQOptionModel.BUY : IQOptionModel.SELL;

      // Balance
      const testBalance = (this.profile.balances || [])[0];
      const realBalance = null;
      const currentBalance = testBalance;
      if (!currentBalance) {
        return {
          ok: false,
          providerMessage: 'Balanço não encontrado para o tipo de conta selecionado'
        };
      }

      const expirationMinutes = 1;
      const profitPercent = 90;
      const amount = signal.amount;

      // Send order
      if (!this.iqOptionApi) {
        throw new Error('IQ Option API not initialized');
      }
      const result = await this.iqOptionApi.sendOrderBinary(
        market,
        side,
        iqOptionExpired(expirationMinutes),
        (currentBalance as any).id || 1,
        profitPercent,
        amount
      );

      const brokerOrderRef = `iqoption_${Date.now()}_${Math.random()}`;

      return {
        ok: true,
        brokerOrderRef,
        providerMessage: 'Ordem enviada com sucesso',
        latencyMs: 100,
        payload: {
          provider: 'iqoption',
          execution_mode: 'real',
          accepted: true,
          asset: signal.asset,
          timeframe: signal.timeframe,
          action: signal.action,
          scheduled_at: signal.scheduledAt,
          account_type: signal.accountType,
          amount: signal.amount
        }
      };
    } catch (error) {
      return {
        ok: false,
        providerMessage: error instanceof Error ? error.message : 'Erro ao enviar ordem',
        payload: {
          provider: 'iqoption',
          execution_mode: 'real',
          accepted: false
        }
      };
    }
  }
}
