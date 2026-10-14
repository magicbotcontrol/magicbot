import 'dotenv/config';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

import type { BrokerAccountType, BrokerSignalInput } from '../contracts/types.js';
import { IqOptionBridgeService } from './IqOptionBridgeService.js';

type BridgeBody = {
  email?: string;
  password?: string;
  accountType?: BrokerAccountType;
  signal?: BrokerSignalInput;
};

function readString(name: string, fallback = '') {
  const value = process.env[name];
  return value ? value.trim() : fallback;
}

function readNumber(name: string, fallback: number) {
  const value = Number(process.env[name] || fallback);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function readBoolean(name: string, fallback: boolean) {
  const value = String(process.env[name] || '').trim().toLowerCase();
  if (!value) return fallback;
  return value === '1' || value === 'true' || value === 'yes' || value === 'on';
}

function readAccountType(name: string, fallback: BrokerAccountType): BrokerAccountType {
  return String(process.env[name] || '').trim().toLowerCase() === 'real' ? 'Real' : fallback;
}

function json(response: ServerResponse, status: number, payload: Record<string, unknown>) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Bridge-Token',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
  });
  response.end(JSON.stringify(payload));
}

async function parseBody(request: IncomingMessage): Promise<BridgeBody> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  return JSON.parse(raw) as BridgeBody;
}

function isAuthorized(request: IncomingMessage, expectedToken: string) {
  if (!expectedToken) return true;
  const authHeader = String(request.headers.authorization || '');
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const bridgeToken = String(request.headers['x-bridge-token'] || '').trim();
  return bearer === expectedToken || bridgeToken === expectedToken;
}

function extractCredentials(body: BridgeBody) {
  const email = String(body.email || '').trim();
  const password = String(body.password || '').trim();
  if (!email || !password) {
    throw new Error('email e password sao obrigatorios.');
  }
  return { email, password };
}

const bridgeHost = readString('IQOPTION_BRIDGE_HOST', '0.0.0.0');
const bridgePort = readNumber('IQOPTION_BRIDGE_PORT', 8787);
const bridgeToken = readString('IQOPTION_BRIDGE_TOKEN');
const sessionTtlMs = readNumber('IQOPTION_BRIDGE_SESSION_TTL_MS', 300000);
const bridgeMode = 'browser';
const browserHeadless = readBoolean('IQOPTION_BRIDGE_BROWSER_HEADLESS', true);
const browserSessionDir = readString('IQOPTION_BRIDGE_BROWSER_SESSION_DIR', '.iqoption-browser-sessions');
const browserSlowMoMs = readNumber('IQOPTION_BRIDGE_BROWSER_SLOW_MO_MS', 0);
const browserManualLoginTimeoutMs = readNumber('IQOPTION_BRIDGE_BROWSER_MANUAL_LOGIN_TIMEOUT_MS', 0);
const loginUrl = readString('IQOPTION_BRIDGE_LOGIN_URL', 'https://iqoption.com/pwa/auth/login');
const defaultAccountType = readAccountType('IQOPTION_BRIDGE_DEFAULT_ACCOUNT_TYPE', 'Demo');
const bridgeService = new IqOptionBridgeService({
  sessionTtlMs,
  browserHeadless,
  browserSessionDir,
  browserSlowMoMs,
  browserManualLoginTimeoutMs,
  loginUrl,
  defaultAccountType
});

// #region debug-point A:bridge-route-entry
const debugBridgeLog = (message: string, data: Record<string, unknown>) => {
  process.stdout.write(`${JSON.stringify({
    scope: 'iqoption-bridge-debug',
    message,
    data,
    ts: new Date().toISOString()
  })}\n`);
};
// #endregion

const server = createServer(async (request, response) => {
  try {
    if (request.method === 'OPTIONS') {
      json(response, 204, {});
      return;
    }

    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);

    if (request.method === 'GET' && url.pathname === '/health') {
      json(response, 200, {
        ok: true,
        service: 'iqoption-http-bridge',
        mode: bridgeMode,
        uptimeSeconds: Math.round(process.uptime())
      });
      return;
    }

    if (!isAuthorized(request, bridgeToken)) {
      json(response, 401, {
        ok: false,
        message: 'Nao autorizado.'
      });
      return;
    }

    if (request.method !== 'POST') {
      json(response, 405, {
        ok: false,
        message: 'Metodo nao permitido.'
      });
      return;
    }

    const body = await parseBody(request);
    // #region debug-point A:request-captured
    debugBridgeLog('route_hit', {
      method: request.method || 'unknown',
      path: url.pathname,
      mode: bridgeMode,
      hasEmail: Boolean(body.email),
      hasSignal: Boolean(body.signal),
      pid: process.pid
    });
    // #endregion

    if (url.pathname === '/api/iqoption/auth/login') {
      json(response, 200, await bridgeService.login(extractCredentials(body)));
      return;
    }

    if (url.pathname === '/api/iqoption/session/snapshot') {
      json(response, 200, await bridgeService.getSnapshot(extractCredentials(body)));
      return;
    }

    if (url.pathname === '/api/iqoption/orders/prepare') {
      if (!body.signal) {
        throw new Error('signal e obrigatorio para prepare.');
      }
      json(response, 200, await bridgeService.prepare(
        extractCredentials(body),
        body.signal,
        body.accountType || body.signal.accountType
      ));
      return;
    }

    if (url.pathname === '/api/iqoption/orders/submit') {
      if (!body.signal) {
        throw new Error('signal e obrigatorio para submit.');
      }
      const result = await bridgeService.submit(extractCredentials(body), body.signal);
      json(response, 200, {
        ok: true,
        brokerOrderRef: result.brokerOrderRef,
        latencyMs: result.latencyMs,
        message: result.message,
        payload: result.payload
      });
      return;
    }

    json(response, 404, {
      ok: false,
      message: 'Rota nao encontrada.'
    });
  } catch (error) {
    json(response, 500, {
      ok: false,
      message: error instanceof Error ? error.message : 'Erro interno da bridge.'
    });
  }
});

server.listen(bridgePort, bridgeHost, () => {
  process.stdout.write(`[iqoption-bridge] listening on http://${bridgeHost}:${bridgePort}\n`);
});
