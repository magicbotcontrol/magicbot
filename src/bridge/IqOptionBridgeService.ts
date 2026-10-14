import {
  IQOptionApi,
  IQOptionMarket,
  IQOptionModel,
  iqOptionExpired
} from 'iq-option-client';

import type {
  BrokerAccountType,
  BrokerSignalInput
} from '../contracts/types.js';
import { IqOptionBrowserBridgeService } from './IqOptionBrowserBridgeService.js';

type IqBridgeCredentials = {
  email: string;
  password: string;
};

type BridgeSessionSnapshot = {
  accountMode: BrokerAccountType | null;
  balance: number | null;
  currency: string;
  serverTime: string | null;
  canTrade: boolean;
  sessionFreshUntil: string | null;
};

type BridgeSessionEntry = {
  email: string;
  password: string;
  api: IQOptionApi;
  profile: any;
  snapshot: BridgeSessionSnapshot;
  authenticatedAt: string;
  sessionFreshUntil: string | null;
  lastUsedAt: number;
};

type SubmitResult = {
  brokerOrderRef: string;
  latencyMs: number;
  payload: Record<string, unknown>;
  message: string;
};

type IqOptionBridgeServiceOptions = {
  sessionTtlMs: number;
  browserHeadless: boolean;
  browserSessionDir: string;
  browserSlowMoMs: number;
  browserManualLoginTimeoutMs: number;
  loginUrl: string;
  defaultAccountType: BrokerAccountType;
};

class IqOptionApiBridgeService {
  private readonly sessions = new Map<string, BridgeSessionEntry>();

  constructor(private readonly sessionTtlMs: number) {}

  private getSessionKey(email: string) {
    return email.trim().toLowerCase();
  }

  private normalizeCredentials(credentials: IqBridgeCredentials) {
    const email = String(credentials.email || '').trim();
    const password = String(credentials.password || '').trim();
    if (!email || !password) {
      throw new Error('Email e senha sao obrigatorios.');
    }
    return { email, password };
  }

  private selectBalance(profile: any, requestedAccountType?: BrokerAccountType | null) {
    const balances = Array.isArray(profile?.balances) ? profile.balances : [];
    const requested = String(requestedAccountType || '').toLowerCase();
    const preferred = balances.find((balance: any) => {
      const text = `${balance?.type ?? ''} ${balance?.name ?? ''} ${balance?.kind ?? ''} ${balance?.account_type ?? ''}`.toLowerCase();
      if (requested === 'demo') {
        return text.includes('demo') || text.includes('practice') || text.includes('training');
      }
      if (requested === 'real') {
        return text.includes('real');
      }
      return false;
    });
    return preferred ?? balances[0] ?? null;
  }

  private inferAccountMode(balance: any): BrokerAccountType | null {
    const text = `${balance?.type ?? ''} ${balance?.name ?? ''} ${balance?.kind ?? ''} ${balance?.account_type ?? ''}`.toLowerCase();
    if (text.includes('real')) return 'Real';
    if (text.includes('demo') || text.includes('practice') || text.includes('training')) return 'Demo';
    return null;
  }

  private buildSnapshot(profile: any, requestedAccountType?: BrokerAccountType | null): BridgeSessionSnapshot {
    const balance = this.selectBalance(profile, requestedAccountType);
    const amount = Number(balance?.amount);
    const authenticatedAt = new Date();
    return {
      accountMode: this.inferAccountMode(balance) || requestedAccountType || 'Demo',
      balance: Number.isFinite(amount) ? amount : null,
      currency: String(balance?.currency ?? profile?.currency ?? 'USD'),
      serverTime: authenticatedAt.toISOString(),
      canTrade: Boolean(balance),
      sessionFreshUntil: new Date(authenticatedAt.getTime() + this.sessionTtlMs).toISOString()
    };
  }

  private isFresh(entry: BridgeSessionEntry, password: string) {
    if (!entry?.api || !entry?.profile) return false;
    if (entry.password !== password) return false;
    return Date.now() - entry.lastUsedAt < this.sessionTtlMs;
  }

  private async authenticate(credentials: IqBridgeCredentials, requestedAccountType?: BrokerAccountType | null) {
    const normalized = this.normalizeCredentials(credentials);
    const api = new IQOptionApi(normalized.email, normalized.password);
    const profile = await api.connectAsync();
    const snapshot = this.buildSnapshot(profile, requestedAccountType);
    const nowIso = new Date().toISOString();
    const entry: BridgeSessionEntry = {
      email: normalized.email,
      password: normalized.password,
      api,
      profile,
      snapshot,
      authenticatedAt: nowIso,
      sessionFreshUntil: snapshot.sessionFreshUntil,
      lastUsedAt: Date.now()
    };
    this.sessions.set(this.getSessionKey(normalized.email), entry);
    return entry;
  }

  private async ensureSession(credentials: IqBridgeCredentials, requestedAccountType?: BrokerAccountType | null) {
    const normalized = this.normalizeCredentials(credentials);
    const key = this.getSessionKey(normalized.email);
    const cached = this.sessions.get(key);
    if (cached && this.isFresh(cached, normalized.password)) {
      cached.lastUsedAt = Date.now();
      cached.snapshot = this.buildSnapshot(cached.profile, requestedAccountType);
      cached.sessionFreshUntil = cached.snapshot.sessionFreshUntil;
      return cached;
    }
    return this.authenticate(normalized, requestedAccountType);
  }

  private mapMarket(asset: string): IQOptionMarket {
    const assetUpper = String(asset || '').toUpperCase().replace(/[^A-Z]/g, '');
    if (assetUpper.startsWith('EURUSD')) return IQOptionMarket.EURUSD_OTC;
    if (assetUpper.startsWith('GBPUSD')) return IQOptionMarket.GBPUSD_OTC;
    if (assetUpper.startsWith('USDJPY')) return IQOptionMarket.USDJPY_OTC;
    return IQOptionMarket.EURUSD_OTC;
  }

  private mapSide(action: 'CALL' | 'PUT'): IQOptionModel {
    return action === 'CALL' ? IQOptionModel.BUY : IQOptionModel.SELL;
  }

  async login(credentials: IqBridgeCredentials) {
    const session = await this.ensureSession(credentials);
    return {
      ok: true,
      message: 'Sessao autenticada com sucesso.',
      session: session.snapshot
    };
  }

  async getSnapshot(credentials: IqBridgeCredentials) {
    const session = await this.ensureSession(credentials);
    return {
      ok: true,
      message: 'Snapshot operacional carregado com sucesso.',
      session: session.snapshot
    };
  }

  async prepare(credentials: IqBridgeCredentials, signal: BrokerSignalInput, accountType?: BrokerAccountType | null) {
    const session = await this.ensureSession(credentials, accountType || signal.accountType);
    if (!session.snapshot.canTrade) {
      throw new Error('Sessao autenticada, mas sem conta operacional pronta para envio.');
    }
    return {
      ok: true,
      message: 'Sessao preparada para envio da lista.',
      session: session.snapshot,
      prepared: true
    };
  }

  async submit(credentials: IqBridgeCredentials, signal: BrokerSignalInput): Promise<SubmitResult> {
    const startedAt = Date.now();
    const session = await this.ensureSession(credentials, signal.accountType);
    const selectedBalance = this.selectBalance(session.profile, signal.accountType);
    if (!selectedBalance) {
      throw new Error('Balance nao encontrado para o tipo de conta selecionado.');
    }

    const result = await session.api.sendOrderBinary(
      this.mapMarket(signal.asset),
      this.mapSide(signal.action),
      iqOptionExpired(1),
      Number((selectedBalance as any).id || 1),
      90,
      signal.amount
    );

    session.lastUsedAt = Date.now();
    session.snapshot = this.buildSnapshot(session.profile, signal.accountType);
    session.sessionFreshUntil = session.snapshot.sessionFreshUntil;

    return {
      brokerOrderRef: String((result as any)?.id || (result as any)?.order_id || `iqoption_bridge_${Date.now()}`),
      latencyMs: Date.now() - startedAt,
      message: 'Ordem enviada com sucesso pela bridge.',
      payload: {
        accepted: true,
        bridge: true,
        provider: 'iqoption',
        raw: result as unknown as Record<string, unknown>,
        session: session.snapshot
      }
    };
  }
}

export class IqOptionBridgeService {
  private readonly browserService: IqOptionBrowserBridgeService;

  constructor(private readonly options: IqOptionBridgeServiceOptions) {
    this.browserService = new IqOptionBrowserBridgeService({
      sessionTtlMs: options.sessionTtlMs,
      browserHeadless: options.browserHeadless,
      browserSessionDir: options.browserSessionDir,
      browserSlowMoMs: options.browserSlowMoMs,
      browserManualLoginTimeoutMs: options.browserManualLoginTimeoutMs,
      loginUrl: options.loginUrl,
      defaultAccountType: options.defaultAccountType
    });
  }

  async login(credentials: IqBridgeCredentials) {
    return this.browserService.login(credentials);
  }

  async getSnapshot(credentials: IqBridgeCredentials) {
    return this.browserService.getSnapshot(credentials);
  }

  async prepare(credentials: IqBridgeCredentials, signal: BrokerSignalInput, accountType?: BrokerAccountType | null) {
    return this.browserService.prepare(credentials, signal, accountType);
  }

  async submit(credentials: IqBridgeCredentials, signal: BrokerSignalInput): Promise<SubmitResult> {
    return this.browserService.submit(credentials, signal);
  }
}
