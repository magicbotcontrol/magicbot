import { mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';

import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';

import type {
  BrokerAccountType,
  BrokerSignalInput
} from '../contracts/types.js';

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

type SubmitResult = {
  brokerOrderRef: string;
  latencyMs: number;
  payload: Record<string, unknown>;
  message: string;
};

type BrowserBridgeOptions = {
  sessionTtlMs: number;
  browserHeadless: boolean;
  browserSessionDir: string;
  browserSlowMoMs: number;
  browserManualLoginTimeoutMs: number;
  loginUrl: string;
  defaultAccountType: BrokerAccountType;
};

type BrowserSessionEntry = {
  email: string;
  password: string;
  context: BrowserContext;
  page: Page;
  snapshot: BridgeSessionSnapshot;
  authenticatedAt: string;
  sessionFreshUntil: string | null;
  lastUsedAt: number;
  storageStatePath: string;
};

type SnapshotRuntimeData = {
  url: string;
  title: string;
  bodyText: string;
  storageEntries: Array<{ key: string; value: string }>;
};

export class IqOptionBrowserBridgeService {
  private readonly sessions = new Map<string, BrowserSessionEntry>();
  private readonly pendingSessions = new Map<string, Promise<BrowserSessionEntry>>();
  private browser: Browser | null = null;

  constructor(private readonly options: BrowserBridgeOptions) {
    mkdirSync(this.options.browserSessionDir, { recursive: true });
  }

  // #region debug-point B:browser-flow-log
  private debug(message: string, data: Record<string, unknown>) {
    process.stdout.write(`${JSON.stringify({
      scope: 'iqoption-browser-debug',
      message,
      data,
      ts: new Date().toISOString()
    })}\n`);
  }
  // #endregion

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

  private sanitizeFileName(value: string) {
    return value.replace(/[^a-z0-9._-]/gi, '_').toLowerCase();
  }

  private getStorageStatePath(email: string) {
    return path.join(this.options.browserSessionDir, `${this.sanitizeFileName(email)}.json`);
  }

  private buildFreshUntil(now = Date.now()) {
    return new Date(now + this.options.sessionTtlMs).toISOString();
  }

  private async getBrowser() {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: this.options.browserHeadless,
        slowMo: this.options.browserSlowMoMs,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
          '--no-sandbox'
        ]
      });
    }
    return this.browser;
  }

  private async createContext(storageStatePath: string) {
    const browser = await this.getBrowser();
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      storageState: existsSync(storageStatePath) ? storageStatePath : undefined,
      viewport: { width: 1440, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
    });
    await context.addInitScript(() => {
      const override = <T>(target: T, key: string, value: unknown) => {
        try {
          Object.defineProperty(target, key, {
            configurable: true,
            get: () => value
          });
        } catch {
          // ignore
        }
      };

      override(navigator, 'webdriver', undefined);
      override(navigator, 'languages', ['en-US', 'en']);
      override(navigator, 'platform', 'Win32');
      override(navigator, 'plugins', [
        { name: 'Chrome PDF Plugin' },
        { name: 'Chrome PDF Viewer' },
        { name: 'Native Client' }
      ]);

      override(navigator, 'userAgentData', {
        brands: [
          { brand: 'Chromium', version: '126' },
          { brand: 'Google Chrome', version: '126' },
          { brand: 'Not.A/Brand', version: '24' }
        ],
        mobile: false,
        platform: 'Windows',
        getHighEntropyValues: async () => ({
          brands: [
            { brand: 'Chromium', version: '126' },
            { brand: 'Google Chrome', version: '126' },
            { brand: 'Not.A/Brand', version: '24' }
          ],
          mobile: false,
          platform: 'Windows',
          platformVersion: '10.0.0',
          architecture: 'x86',
          bitness: '64',
          uaFullVersion: '126.0.0.0'
        }),
        toJSON: () => ({
          brands: [
            { brand: 'Chromium', version: '126' },
            { brand: 'Google Chrome', version: '126' },
            { brand: 'Not.A/Brand', version: '24' }
          ],
          mobile: false,
          platform: 'Windows'
        })
      });

      if (!(window as any).chrome) {
        Object.defineProperty(window, 'chrome', {
          configurable: true,
          value: { runtime: {} }
        });
      }
    });
    return context;
  }

  private async isLoginRequired(page: Page) {
    const selectors = [
      '[data-testid="login-form"]',
      '[data-testid="login-form-identifierField"]',
      'input[name="identifier"]',
      'input[name="password"]'
    ];

    for (const selector of selectors) {
      try {
        await page.waitForSelector(selector, { timeout: 10000, state: 'visible' });
        // #region debug-point F:login-required-detected
        this.debug('login_required_detected', {
          selector,
          currentUrl: page.url()
        });
        // #endregion
        return true;
      } catch {
        // try next selector
      }
    }

    const requiresLogin = page.url().includes('/pwa/auth/login');
    // #region debug-point F:login-required-fallback
    this.debug('login_required_fallback', {
      currentUrl: page.url(),
      requiresLogin
    });
    // #endregion
    return requiresLogin;
  }

  private async readLoginErrorText(page: Page) {
    const locators = [
      '[role="alert"]',
      '[data-testid*="error"]',
      '.mantine-InputWrapper-error',
      '.mantine-Alert-root'
    ];

    for (const selector of locators) {
      try {
        const texts = await page.locator(selector).allTextContents();
        const normalized = texts.map((text) => text.trim()).filter(Boolean).join(' | ');
        if (normalized) {
          return normalized;
        }
      } catch {
        // ignore
      }
    }

    return '';
  }

  // #region debug-point G:failure-context
  private async captureFailureContext(page: Page) {
    const screenshotPath = path.join(
      this.options.browserSessionDir,
      `login-failure-${Date.now()}.png`
    );

    try {
      await page.screenshot({ path: screenshotPath, fullPage: true });
    } catch {
      // ignore screenshot failures
    }

    const diagnostics = await page.evaluate(() => {
      const submit = document.querySelector('[data-testid="login-form-submitButton"]') as HTMLButtonElement | null;
      const identifier = document.querySelector('[data-testid="login-form-identifierField"], input[name="identifier"]') as HTMLInputElement | null;
      const password = document.querySelector('[data-testid="login-form-passwordField"], input[name="password"]') as HTMLInputElement | null;
      const bodyText = (document.body?.innerText || '').replace(/\s+/g, ' ').trim();
      const iframeCount = document.querySelectorAll('iframe').length;
      return {
        currentUrl: window.location.href,
        title: document.title || '',
        bodyExcerpt: bodyText.slice(0, 1200),
        iframeCount,
        submitDisabled: submit ? submit.disabled : null,
        submitText: submit?.textContent?.trim() || null,
        identifierLength: identifier?.value?.length || 0,
        passwordLength: password?.value?.length || 0
      };
    }).catch(() => ({
      currentUrl: page.url(),
      title: '',
      bodyExcerpt: '',
      iframeCount: -1,
      submitDisabled: null,
      submitText: null,
      identifierLength: 0,
      passwordLength: 0
    }));

    return {
      screenshotPath,
      ...diagnostics
    };
  }
  // #endregion

  private normalizeNumber(value: string) {
    const cleaned = value.replace(/[^\d,.-]/g, '').trim();
    if (!cleaned) return null;

    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    let normalized = cleaned;

    if (lastComma > lastDot) {
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > lastComma) {
      normalized = cleaned.replace(/,/g, '');
    } else {
      normalized = cleaned.replace(',', '.');
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private inferCurrency(text: string) {
    if (/R\$/i.test(text)) return 'BRL';
    if (/EUR|€/i.test(text)) return 'EUR';
    if (/USD|US\$/i.test(text)) return 'USD';
    return 'USD';
  }

  private inferAccountMode(text: string, fallback?: BrokerAccountType | null): BrokerAccountType | null {
    if (/practice|demo|training/i.test(text)) return 'Demo';
    if (/\breal\b|\blive\b/i.test(text)) return 'Real';
    return fallback || null;
  }

  private extractBalance(text: string) {
    const patterns = [
      /(?:US\$|USD|R\$|EUR|€|\$)\s*([0-9]+(?:[.,\s][0-9]{3})*(?:[.,][0-9]{2})?)/i,
      /balance[^0-9]*([0-9]+(?:[.,\s][0-9]{3})*(?:[.,][0-9]{2})?)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        const parsed = this.normalizeNumber(match[1]);
        if (parsed !== null) {
          return parsed;
        }
      }
    }

    return null;
  }

  private async collectRuntimeData(page: Page): Promise<SnapshotRuntimeData> {
    return page.evaluate(() => {
      const storageEntries: Array<{ key: string; value: string }> = [];
      const storages = [window.localStorage, window.sessionStorage];

      for (const storage of storages) {
        for (let index = 0; index < storage.length; index += 1) {
          const key = storage.key(index) || '';
          if (/account|auth|balance|currency|mode|portfolio|profile|user/i.test(key)) {
            storageEntries.push({ key, value: String(storage.getItem(key) || '') });
          }
        }
      }

      return {
        url: window.location.href,
        title: document.title || '',
        bodyText: document.body?.innerText || '',
        storageEntries
      };
    });
  }

  private async persistStorageState(entry: BrowserSessionEntry) {
    await entry.context.storageState({ path: entry.storageStatePath });
  }

  // #region debug-point H:network-capture
  private async captureLoginNetwork(page: Page) {
    const entries = await page.evaluate(() => {
      const performanceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      return performanceEntries
        .map((entry) => ({
          name: entry.name,
          initiatorType: entry.initiatorType,
          duration: entry.duration
        }))
        .filter((entry) => /login|auth|api|graphql/i.test(entry.name))
        .slice(-20);
    }).catch(() => [] as Array<{ name: string; initiatorType: string; duration: number }>);

    return entries;
  }
  // #endregion

  private async performLogin(page: Page, credentials: IqBridgeCredentials) {
    // #region debug-point B:login-start
    this.debug('perform_login_start', {
      emailMasked: `${credentials.email.slice(0, 2)}***${credentials.email.slice(-8)}`,
      loginUrl: this.options.loginUrl
    });
    // #endregion
    await page.goto(this.options.loginUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('[data-testid="login-form"]', { timeout: 30000 });
    const identifierField = page.locator('[data-testid="login-form-identifierField"]');
    const passwordField = page.locator('[data-testid="login-form-passwordField"]');
    await identifierField.click({ clickCount: 3 });
    await identifierField.press('Control+A').catch(() => {});
    await identifierField.type(credentials.email, { delay: 80 });
    await page.waitForTimeout(250);
    await passwordField.click({ clickCount: 3 });
    await passwordField.press('Control+A').catch(() => {});
    await passwordField.type(credentials.password, { delay: 90 });
    await page.waitForTimeout(350);
    await passwordField.press('Tab').catch(() => {});
    await page.waitForTimeout(250);
    await page.locator('[data-testid="login-form-submitButton"]').click();

    try {
      const authResponse = await page.waitForResponse(
        (response) => /https:\/\/api\.iqoption\.com\/v2\/login/i.test(response.url()),
        { timeout: 15000 }
      ).catch(() => null);

      if (authResponse) {
        // #region debug-point H:network-response
        this.debug('perform_login_network_response', {
          url: authResponse.url(),
          status: authResponse.status(),
          ok: authResponse.ok(),
          requestMethod: authResponse.request().method()
        });
        // #endregion
      } else {
        // #region debug-point H:network-missed
        this.debug('perform_login_network_response_missing', {
          finalUrl: page.url()
        });
        // #endregion
      }

      await page.waitForFunction(
        () => !window.location.pathname.includes('/pwa/auth/login') && !document.querySelector('[data-testid="login-form"]'),
        undefined,
        { timeout: 30000 }
      );
    } catch {
      if (!this.options.browserHeadless && this.options.browserManualLoginTimeoutMs > 0) {
        // #region debug-point J:manual-login-assist
        this.debug('manual_login_assist_waiting', {
          timeoutMs: this.options.browserManualLoginTimeoutMs,
          currentUrl: page.url()
        });
        // #endregion
        try {
          await page.bringToFront().catch(() => {});
          await page.waitForFunction(
            () => !window.location.pathname.includes('/pwa/auth/login') && !document.querySelector('[data-testid="login-form"]'),
            undefined,
            { timeout: this.options.browserManualLoginTimeoutMs }
          );
          // #region debug-point J:manual-login-assist-success
          this.debug('manual_login_assist_success', {
            finalUrl: page.url()
          });
          // #endregion
          await page.waitForTimeout(1500);
          return;
        } catch {
          // continue to regular failure reporting
        }
      }
      const errorText = await this.readLoginErrorText(page);
      const failureContext = await this.captureFailureContext(page);
      const networkEntries = await this.captureLoginNetwork(page);
      // #region debug-point C:login-failed
      this.debug('perform_login_failed', {
        finalUrl: page.url(),
        errorText: errorText || null,
        networkEntries,
        ...failureContext
      });
      // #endregion
      throw new Error(errorText || 'Authentication failed');
    }
    await page.waitForTimeout(1500);
    // #region debug-point B:login-success
    this.debug('perform_login_success', {
      finalUrl: page.url()
    });
    // #endregion
  }

  private async buildSnapshot(page: Page, requestedAccountType?: BrokerAccountType | null): Promise<BridgeSessionSnapshot> {
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    const runtime = await this.collectRuntimeData(page);
    if (runtime.url.includes('/pwa/auth/login')) {
      // #region debug-point D:snapshot-still-on-login
      this.debug('build_snapshot_still_on_login', {
        finalUrl: runtime.url,
        title: runtime.title
      });
      // #endregion
      throw new Error('Authentication failed');
    }

    const combinedText = [
      runtime.title,
      runtime.bodyText,
      ...runtime.storageEntries.map((entry) => `${entry.key}:${entry.value}`)
    ].join('\n');

    const balance = this.extractBalance(combinedText);
    const accountMode = this.inferAccountMode(combinedText, requestedAccountType || this.options.defaultAccountType);
    const currency = this.inferCurrency(combinedText);
    const now = Date.now();

    return {
      accountMode,
      balance,
      currency,
      serverTime: new Date(now).toISOString(),
      canTrade: true,
      sessionFreshUntil: this.buildFreshUntil(now)
    };
  }

  private async disposeSession(entry: BrowserSessionEntry) {
    try {
      await entry.context.close();
    } catch {
      // ignore
    }
  }

  private async createSession(credentials: IqBridgeCredentials, requestedAccountType?: BrokerAccountType | null) {
    const normalized = this.normalizeCredentials(credentials);
    const storageStatePath = this.getStorageStatePath(normalized.email);
    const context = await this.createContext(storageStatePath);
    const page = await context.newPage();

    try {
      await page.goto(this.options.loginUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      if (await this.isLoginRequired(page)) {
        await this.performLogin(page, normalized);
      }

      const snapshot = await this.buildSnapshot(page, requestedAccountType);
      // #region debug-point E:session-created
      this.debug('create_session_snapshot_ready', {
        finalUrl: page.url(),
        accountMode: snapshot.accountMode,
        balance: snapshot.balance,
        currency: snapshot.currency
      });
      // #endregion
      const nowIso = new Date().toISOString();
      const entry: BrowserSessionEntry = {
        email: normalized.email,
        password: normalized.password,
        context,
        page,
        snapshot,
        authenticatedAt: nowIso,
        sessionFreshUntil: snapshot.sessionFreshUntil,
        lastUsedAt: Date.now(),
        storageStatePath
      };
      await this.persistStorageState(entry);
      this.sessions.set(this.getSessionKey(normalized.email), entry);
      return entry;
    } catch (error) {
      await context.close().catch(() => {});
      throw error;
    }
  }

  private async refreshSession(entry: BrowserSessionEntry, requestedAccountType?: BrokerAccountType | null) {
    if (entry.page.isClosed()) {
      return false;
    }

    try {
      await entry.page.goto(this.options.loginUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      if (await this.isLoginRequired(entry.page)) {
        await this.performLogin(entry.page, { email: entry.email, password: entry.password });
      }

      entry.snapshot = await this.buildSnapshot(entry.page, requestedAccountType);
      entry.lastUsedAt = Date.now();
      entry.sessionFreshUntil = entry.snapshot.sessionFreshUntil;
      await this.persistStorageState(entry);
      return true;
    } catch {
      return false;
    }
  }

  private async ensureSession(credentials: IqBridgeCredentials, requestedAccountType?: BrokerAccountType | null) {
    const normalized = this.normalizeCredentials(credentials);
    const key = this.getSessionKey(normalized.email);
    const cached = this.sessions.get(key);
    const pending = this.pendingSessions.get(key);

    if (cached && cached.password === normalized.password) {
      const refreshed = await this.refreshSession(cached, requestedAccountType);
      if (refreshed) {
        return cached;
      }

      await this.disposeSession(cached);
      this.sessions.delete(key);
    }

    if (pending) {
      // #region debug-point I:pending-session-reused
      this.debug('pending_session_reused', {
        emailMasked: `${normalized.email.slice(0, 2)}***${normalized.email.slice(-8)}`
      });
      // #endregion
      return pending;
    }

    const creationPromise = this.createSession(normalized, requestedAccountType)
      .finally(() => {
        this.pendingSessions.delete(key);
      });

    this.pendingSessions.set(key, creationPromise);
    return creationPromise;
  }

  async login(credentials: IqBridgeCredentials) {
    const session = await this.ensureSession(credentials);
    return {
      ok: true,
      message: 'Sessao autenticada com sucesso via navegador.',
      session: session.snapshot
    };
  }

  async getSnapshot(credentials: IqBridgeCredentials) {
    const session = await this.ensureSession(credentials);
    return {
      ok: true,
      message: 'Snapshot operacional carregado via navegador.',
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
      message: 'Sessao preparada via navegador.',
      session: session.snapshot,
      prepared: true
    };
  }

  async submit(_credentials: IqBridgeCredentials, _signal: BrokerSignalInput): Promise<SubmitResult> {
    throw new Error('Submit por navegador ainda nao foi implementado na bridge.');
  }
}
