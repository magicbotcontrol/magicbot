import 'dotenv/config';
import fs from 'node:fs';
import express from 'express';
import { chromium } from 'playwright-core';
import { createClient } from '@supabase/supabase-js';

const {
  VITE_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  AUTOMATION_API_TOKEN,
  WORKER_PORT = '4175',
  WORKER_INTERNAL_TOKEN = AUTOMATION_API_TOKEN || 'zenquant_worker_internal_2026',
  ZENQUANT_BROWSER_PATH,
  ZENQUANT_HEADLESS = 'true',
  ZENQUANT_REFRESH_MS = '15000'
} = process.env;

const ZENQUANT_LOGIN_URL = 'https://www.zenquantai.com/#/pages/login/login/';
const ZENQUANT_TRADE_URL = 'https://www.zenquantai.com/#/pages/UITransaction/trade';
const LIVE_REFRESH_MS = Number(ZENQUANT_REFRESH_MS);
const FIXED_PLUS_ALLOCATION = 50;
const CYCLE_TIMER_SECONDS = 10800;
const TIMER_WORKER_MS = 1000;
const RECONCILE_INTERVAL_MS = 15000;
const PRE_CYCLE_CHECK_WINDOW_SECONDS = 90;
const POST_CYCLE_CHECK_INITIAL_DELAY_MS = 30000;
const POST_CYCLE_CHECK_RETRY_MS = 15000;
const POST_CYCLE_CHECK_MAX_ATTEMPTS = 20;
const POST_CYCLE_MIN_FORCE_BALANCE = 1;
const liveSessions = new Map();
const pendingConnectPromises = new Map();

let timerWorkerHandle = null;
let timerWorkerRunning = false;
let reconcileHandle = null;

if (!VITE_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Defina VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no arquivo .env.');
}

const supabaseAdmin = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const app = express();
app.use(express.json());

const DEBUG_ENV_PATH = '.dbg/rescue-disconnect-cycle.env';
let debugServerUrl = 'http://127.0.0.1:7777/event';
let debugSessionId = 'rescue-disconnect-cycle';
const VPS_CONNECT_DEBUG_ENV_PATH = '.dbg/vps-connect-drop.env';
let vpsConnectDebugServerUrl = 'http://127.0.0.1:7778/event';
let vpsConnectDebugSessionId = 'vps-connect-drop';
const debugRunId = process.env.RESCUE_DEBUG_RUN_ID || 'post-fix';

try {
  const debugEnv = fs.readFileSync(DEBUG_ENV_PATH, 'utf8');
  debugServerUrl = debugEnv.match(/DEBUG_SERVER_URL=(.+)/)?.[1]?.trim() || debugServerUrl;
  debugSessionId = debugEnv.match(/DEBUG_SESSION_ID=(.+)/)?.[1]?.trim() || debugSessionId;
} catch {}

try {
  const debugEnv = fs.readFileSync(VPS_CONNECT_DEBUG_ENV_PATH, 'utf8');
  vpsConnectDebugServerUrl = debugEnv.match(/DEBUG_SERVER_URL=(.+)/)?.[1]?.trim() || vpsConnectDebugServerUrl;
  vpsConnectDebugSessionId = debugEnv.match(/DEBUG_SESSION_ID=(.+)/)?.[1]?.trim() || vpsConnectDebugSessionId;
} catch {}

const reportRescueDebug = (hypothesisId, location, msg, data = {}) =>
  fetch(debugServerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: debugSessionId,
      runId: debugRunId,
      hypothesisId,
      location,
      msg: `[DEBUG] ${msg}`,
      data,
      ts: Date.now()
    })
  }).catch(() => {});

const reportVpsConnectDebug = (hypothesisId, location, msg, data = {}) =>
  fetch(vpsConnectDebugServerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: vpsConnectDebugSessionId,
      runId: 'pre-fix',
      hypothesisId,
      location,
      msg: `[DEBUG] ${msg}`,
      data,
      ts: Date.now()
    })
  }).catch(() => {});

const getSessionRuntimeState = async (session) => {
  const page = session?.page || null;
  const context = session?.context || null;
  const browser = session?.browser || null;
  const bodyText = page && !page.isClosed()
    ? await page.locator('body').innerText().catch(() => '')
    : '';

  return {
    contaId: session?.contaId ?? null,
    pageClosed: page ? page.isClosed() : true,
    pageUrl: page && !page.isClosed() ? page.url() : null,
    contextPages: context ? context.pages().length : 0,
    browserConnected: browser ? browser.isConnected() : false,
    bodyExcerpt: normalizeText(bodyText).slice(0, 400) || null
  };
};

const clearScheduledPostCycleCheck = (session) => {
  if (session?.postCycleCheckHandle) {
    clearTimeout(session.postCycleCheckHandle);
    session.postCycleCheckHandle = null;
  }
};

const toOptionalNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toStoredTimer = (value, fallback = 10800) => {
  const parsed = toOptionalNumber(value);
  return parsed ?? fallback;
};

const toClientAccount = (row) => ({
  id: row.id,
  apelido: row.apelido,
  login: row.login,
  status: row.status,
  allocated_360days: Number(row.allocated_360days) || 0,
  allocated_plus: Number(row.allocated_plus) || 0,
  allocated_3hours: Number(row.allocated_3hours) || 0,
  timer: toStoredTimer(row.timer),
  plus_countdown_label: row.plus_countdown_label || null,
  plus_countdown_seconds: toOptionalNumber(row.plus_countdown_seconds),
  hours3_countdown_label: row.hours3_countdown_label || null,
  hours3_countdown_seconds: toOptionalNumber(row.hours3_countdown_seconds),
  days360_countdown_label: row.days360_countdown_label || null,
  days360_countdown_seconds: toOptionalNumber(row.days360_countdown_seconds),
  balance: Number(row.balance) || 0,
  trade_limit: Number(row.trade_limit) || 300,
  created_at: row.created_at,
  live_synced_at: row.live_synced_at || null,
  credencial_configurada: Boolean(row.credencial_configurada),
  connection_state: row.connection_state || 'desconectada',
  last_connected_at: row.last_connected_at || null
});

const requireWorkerToken = (req, res, next) => {
  if (!WORKER_INTERNAL_TOKEN || req.header('x-worker-token') !== WORKER_INTERNAL_TOKEN) {
    res.status(401).json({ error: 'Token interno do worker inválido.' });
    return;
  }

  next();
};

const resolveBrowserExecutablePath = () => {
  const candidates = [
    ZENQUANT_BROWSER_PATH,
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  ].filter(Boolean);

  const executablePath = candidates.find((candidate) => fs.existsSync(candidate));

  if (!executablePath) {
    throw new Error('Nenhum navegador compatível foi encontrado. Defina ZENQUANT_BROWSER_PATH no .env.');
  }

  return executablePath;
};

const getBrowserLaunchArgs = () => {
  const args = ['--disable-blink-features=AutomationControlled'];

  if (process.platform === 'linux') {
    // Linux VPS commonly runs the worker as root, which requires disabling the Chrome sandbox.
    args.push('--no-sandbox', '--disable-setuid-sandbox');
  }

  return args;
};

const normalizeText = (value) => value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

const normalizeZenQuantLogin = (value) => {
  const digits = value.replace(/\D/g, '');

  if (digits.startsWith('55') && digits.length >= 12) {
    return digits.slice(2);
  }

  return digits;
};

const extractNumber = (text, regex) => {
  const match = text.match(regex);
  if (!match?.[1]) {
    return 0;
  }

  const cleaned = match[1].replace(/[^\d.,-]/g, '').replace(/,/g, '');
  if (!cleaned) {
    return 0;
  }

  return Number(cleaned);
};

const roundCurrency = (value, decimals = 6) => Number((Number(value) || 0).toFixed(decimals));

const calculateRescueReinvestment = (availableAmount, currentPlusAllocation = 0) => {
  const totalAvailable = Math.max(Number(availableAmount) || 0, 0);
  const currentPlus = Math.max(Number(currentPlusAllocation) || 0, 0);
  const plusGap = Math.max(0, FIXED_PLUS_ALLOCATION - currentPlus);
  const plusAllocation = plusGap > 0
    ? (totalAvailable >= plusGap ? plusGap : Math.floor(totalAvailable))
    : 0;
  const remainingAfterPlus = Math.max(totalAvailable - plusAllocation, 0);
  const hours3Allocation = Math.floor(remainingAfterPlus);
  const residualBalance = roundCurrency(totalAvailable - plusAllocation - hours3Allocation, 4);

  return {
    totalAvailable: roundCurrency(totalAvailable, 6),
    plusAllocation,
    hours3Allocation,
    residualBalance
  };
};

const getClaimedAvailableAmount = (claimed = []) =>
  claimed.reduce((total, item) => total + (Number(item?.orderAmount) || 0) + (Number(item?.netIncome) || 0), 0);

const parseDurationToSeconds = (value) => {
  if (!value) {
    return null;
  }

  const text = normalizeText(value);

  if (/claimable/i.test(text)) {
    return 0;
  }

  const dayMatch = text.match(/(\d+)\s*day/i);
  if (dayMatch) {
    return Number(dayMatch[1]) * 86400;
  }

  const hourMatch = text.match(/(\d+)\s*h/i);
  const minuteMatch = text.match(/(\d+)\s*m/i);

  if (hourMatch || minuteMatch) {
    return (Number(hourMatch?.[1] || 0) * 3600) + (Number(minuteMatch?.[1] || 0) * 60);
  }

  return null;
};

const extractStrategySegment = (positionsSection, strategyName) => {
  const escapedName = strategyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`${escapedName}\\s+[\\s\\S]*?(?=(?:360Days|3Hours|Plus)\\s+\\d|$)`, 'i');
  return positionsSection.match(regex)?.[0] || '';
};

const parseStrategyCountdown = (positionsSection, strategyName) => {
  const strategySegment = extractStrategySegment(positionsSection, strategyName);
  if (!strategySegment) {
    return null;
  }

  const countdownMatch =
    strategySegment.match(/\bClaimable\b/i) ||
    strategySegment.match(/\b\d+\s*Day\b/i) ||
    strategySegment.match(/\b\d+\s*h(?:\s+\d+\s*m)?\b/i) ||
    strategySegment.match(/\b\d+\s*m\b/i);

  return countdownMatch?.[0] || null;
};

const parseTradeSnapshot = (rawText, previousLimit = 300) => {
  const text = normalizeText(rawText);
  const positionsSection =
    text.match(/Open positions\s+([\s\S]*?)\s+Trading limit/i)?.[1] ||
    text.match(/Posi[cç][oõ]es abertas\s+([\s\S]*?)\s+(?:Trading limit|Limite de negocia[cç][aã]o)/i)?.[1] ||
    text;
  const allocated360Days =
    extractNumber(positionsSection, /360Days(?:\s+\d+(?:\.\d+)?%)?\s+([\d.,$-]+)\s*USD/i) ||
    extractNumber(positionsSection, /360Days\s+([\d.,$-]+)\s*USD/i);
  const allocatedPlus =
    extractNumber(positionsSection, /Plus(?:\s+\d+(?:\.\d+)?%)?\s+([\d.,$-]+)\s*USD/i) ||
    extractNumber(positionsSection, /Plus\s+([\d.,$-]+)\s*USD/i);
  const allocated3Hours =
    extractNumber(positionsSection, /3Hours(?:\s+\d+(?:\.\d+)?%)?\s+([\d.,$-]+)\s*USD/i) ||
    extractNumber(positionsSection, /3Hours\s+([\d.,$-]+)\s*USD/i);
  const balance =
    extractNumber(text, /Dispon[ií]vel\s+([\d.,$-]+)\s*USD/i) ||
    extractNumber(text, /Available\s+([\d.,$-]+)\s*USD/i);

  const limitPair =
    text.match(/(?:Trading limit|Limite de negocia[cç][aã]o)\s+([\d.,$-]+)\s*USD\s+(?:Increase Quota|Aumentar Cota)\s+([\d.,$-]+)\s*\/\s*([\d.,$-]+)\b/i) ||
    text.match(/(?:Aumentar Cota|Increase Quota)\s+([\d.,$-]+)\s*\/\s*([\d.,$-]+)\b/i);

  let tradeLimit = previousLimit;
  if (limitPair) {
    tradeLimit = Number(limitPair[limitPair.length - 1].replace(/,/g, '')) || previousLimit;
  } else {
    const remaining = extractNumber(text, /Limit(?:e)? de negocia[cç][aã]o\s+([\d.]+)\s*USD/i);
    const remainingEnglish = extractNumber(text, /Trading limit\s+([\d.]+)\s*USD/i);
    if (remaining > 0 || remainingEnglish > 0) {
      tradeLimit = (remaining || remainingEnglish) + allocated360Days + allocatedPlus + allocated3Hours;
    }
  }

  const strategyCountdowns = {
    plus: {
      label: parseStrategyCountdown(positionsSection, 'Plus'),
      seconds: allocatedPlus > 0 ? parseDurationToSeconds(parseStrategyCountdown(positionsSection, 'Plus')) : null
    },
    hours3: {
      label: parseStrategyCountdown(positionsSection, '3Hours'),
      seconds: allocated3Hours > 0 ? parseDurationToSeconds(parseStrategyCountdown(positionsSection, '3Hours')) : null
    },
    days360: {
      label: parseStrategyCountdown(positionsSection, '360Days'),
      seconds: allocated360Days > 0 ? parseDurationToSeconds(parseStrategyCountdown(positionsSection, '360Days')) : null
    }
  };

  const activeCountdowns = [
    strategyCountdowns.plus.seconds,
    strategyCountdowns.hours3.seconds,
    strategyCountdowns.days360.seconds
  ].filter((value) => Number.isFinite(value));

  const nextRescueTimerSeconds = activeCountdowns.length > 0
    ? Math.max(0, Math.min(...activeCountdowns))
    : null;

  return {
    allocated360Days,
    allocatedPlus,
    allocated3Hours,
    balance,
    tradeLimit: tradeLimit || previousLimit,
    nextRescueTimerSeconds,
    strategyCountdowns,
    rawText: text.slice(0, 2000)
  };
};

const loadContaById = async (id) => {
  const { data, error } = await supabaseAdmin.from('contas').select('*').eq('id', id).single();

  if (error) {
    throw error;
  }

  return data;
};

const loadConnectedContas = async () => {
  const { data, error } = await supabaseAdmin
    .from('contas')
    .select('*')
    .in('connection_state', ['conectada', 'conectando'])
    .order('id', { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
};

const loadContaSecret = async (id) => {
  const { data, error } = await supabaseAdmin
    .from('conta_secrets')
    .select('conta_id, senha')
    .eq('conta_id', id)
    .single();

  if (error) {
    throw error;
  }

  return data;
};

const updateContaFromSnapshot = async (contaId, snapshot, currentConta) => {
  const nextTimer =
    snapshot.nextRescueTimerSeconds ?? Math.max(Number(currentConta.timer) || 0, 0);
  const nextStatus =
    currentConta.status === 'Resgatando'
      ? 'Resgatando'
      : nextTimer === 0
        ? 'Pronto para Resgatar'
        : 'Executando';

  const updatePayload = {
    balance: snapshot.balance,
    allocated_360days: snapshot.allocated360Days,
    allocated_plus: snapshot.allocatedPlus,
    allocated_3hours: snapshot.allocated3Hours,
    trade_limit: snapshot.tradeLimit || Number(currentConta.trade_limit) || 300,
    plus_countdown_label: snapshot.strategyCountdowns?.plus?.label || null,
    plus_countdown_seconds: snapshot.strategyCountdowns?.plus?.seconds ?? null,
    hours3_countdown_label: snapshot.strategyCountdowns?.hours3?.label || null,
    hours3_countdown_seconds: snapshot.strategyCountdowns?.hours3?.seconds ?? null,
    days360_countdown_label: snapshot.strategyCountdowns?.days360?.label || null,
    days360_countdown_seconds: snapshot.strategyCountdowns?.days360?.seconds ?? null,
    timer: nextTimer,
    status: nextStatus,
    live_synced_at: new Date().toISOString(),
    connection_state: 'conectada'
  };

  const { error } = await supabaseAdmin.from('contas').update(updatePayload).eq('id', contaId);

  if (error) {
    throw error;
  }
};

const countVisibleExactText = async (page, text) => {
  const locator = page.getByText(text, { exact: true });
  const count = await locator.count();
  let visibleCount = 0;

  for (let index = 0; index < count; index += 1) {
    if (await locator.nth(index).isVisible().catch(() => false)) {
      visibleCount += 1;
    }
  }

  return visibleCount;
};

const getVisibleExactTextLocator = async (page, text, { pick = 'last' } = {}) => {
  const locator = page.getByText(text, { exact: true });
  const count = await locator.count();
  const visibleMatches = [];

  for (let index = 0; index < count; index += 1) {
    const candidate = locator.nth(index);
    if (await candidate.isVisible().catch(() => false)) {
      const box = await candidate.boundingBox().catch(() => null);
      visibleMatches.push({
        index,
        y: typeof box?.y === 'number' ? box.y : null
      });
    }
  }

  if (visibleMatches.length === 0) {
    return null;
  }

  let targetIndex = visibleMatches[visibleMatches.length - 1].index;

  if (pick === 'first') {
    targetIndex = visibleMatches[0].index;
  } else if (pick === 'highest' || pick === 'lowest') {
    const sortedByY = [...visibleMatches].sort((left, right) => {
      const leftY = left.y ?? Number.MAX_SAFE_INTEGER;
      const rightY = right.y ?? Number.MAX_SAFE_INTEGER;
      return pick === 'highest' ? leftY - rightY : rightY - leftY;
    });
    targetIndex = sortedByY[0]?.index ?? targetIndex;
  }

  return locator.nth(targetIndex);
};

const clickVisibleExactText = async (page, text, options = {}) => {
  let lastError = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await waitForActionOverlayToClear(page, 12000);
    const locator = await getVisibleExactTextLocator(page, text, options);

    if (!locator) {
      throw new Error(`O elemento "${text}" não está visível na tela do ZenQuant.`);
    }

    try {
      await locator.scrollIntoViewIfNeeded().catch(() => {});
      await locator.click({ timeout: 10000, force: attempt === 2 });
      return locator;
    } catch (error) {
      lastError = error;
      if (attempt === 1) {
        try {
          await locator.evaluate((node) => {
            let current = node;

            while (current) {
              if (typeof current.click === 'function') {
                current.click();
                return;
              }

              current = current.parentElement;
            }
          });
          return locator;
        } catch (jsError) {
          lastError = jsError;
        }
      }
      await page.waitForTimeout(1200);
    }
  }

  throw lastError || new Error(`Falha ao clicar em "${text}" no ZenQuant.`);
};

const parseClaimDialog = (rawText) => {
  const text = normalizeText(rawText);

  return {
    orderAmount: extractNumber(text, /Order Amount\s+([\d.,$-]+)\s*USD/i),
    roi: extractNumber(text, /ROI\s*≈?\s+([\d.,$-]+)%/i),
    netIncome: extractNumber(text, /Net Income:\s*([\d.,$-]+)\s*USD/i)
  };
};

const waitForActionOverlayToClear = async (page, timeout = 15000) => {
  const startedAt = Date.now();

  while ((Date.now() - startedAt) < timeout) {
    const visibleMaskCount = await page.locator('.trade-inject-flow-mask:visible, .trade-inject-flow-mask__backdrop:visible').count().catch(() => 0);
    if (visibleMaskCount === 0) {
      return;
    }

    await page.waitForTimeout(250);
  }

  throw new Error('Overlay de injeção permaneceu ativo e bloqueou a ação.');
};

const getTradeUiDebugState = async (page) => {
  const bodyText = await page.locator('body').innerText().catch(() => '');
  const normalizedBodyText = normalizeText(bodyText);
  const amountMatch = normalizedBodyText.match(/Amount[\s\S]*?(?=Overview|Active Orders|Order History|$)/i);
  const overviewMatch = normalizedBodyText.match(/Overview[\s\S]*?(?=Active Orders|Order History|$)/i);

  return {
    url: page.url(),
    visibleMaskCount: await page.locator('.trade-inject-flow-mask:visible, .trade-inject-flow-mask__backdrop:visible').count().catch(() => 0),
    totalMaskCount: await page.locator('.trade-inject-flow-mask, .trade-inject-flow-mask__backdrop').count().catch(() => 0),
    amountExcerpt: amountMatch?.[0]?.slice(0, 320) || null,
    overviewExcerpt: overviewMatch?.[0]?.slice(0, 320) || null,
    bodyExcerpt: normalizedBodyText.slice(0, 500) || null
  };
};

const ensureTradePageReady = async (page) => {
  await page.goto(ZENQUANT_TRADE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);

  const bodyText = await page.locator('body').innerText({ timeout: 20000 });
  if (!/360days|3hours|plus/i.test(bodyText)) {
    throw new Error('A tela de negociação não exibiu os cards esperados do ZenQuant.');
  }

  return bodyText;
};

const isRecoverableUiActionError = (error) => {
  const message = error?.message || '';
  return /Campo de injeção não ficou habilitado|intercepts pointer events|locator\.click: Timeout|Claimable|Confirm injection|Overlay de injeção permaneceu ativo|A tela de negociação não exibiu os cards esperados/i.test(message);
};

const loginToZenQuant = async (page, login, senha) => {
  // #region debug-point G:login-start
  reportVpsConnectDebug('G', 'worker/index.js:loginToZenQuant:start', 'Login ZenQuant iniciado na VPS', {
    urlBeforeGoto: page.url(),
    pageClosed: page.isClosed()
  });
  // #endregion
  try {
    await page.goto(ZENQUANT_LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    // #region debug-point G:login-goto-success
    reportVpsConnectDebug('G', 'worker/index.js:loginToZenQuant:goto-success', 'Goto da tela de login concluiu', {
      urlAfterGoto: page.url(),
      pageClosed: page.isClosed()
    });
    // #endregion
  } catch (error) {
    // #region debug-point G:login-goto-error
    reportVpsConnectDebug('G', 'worker/index.js:loginToZenQuant:goto-error', 'Goto da tela de login falhou', {
      message: error?.message || 'erro-desconhecido',
      pageClosed: page.isClosed(),
      currentUrl: page.isClosed() ? null : page.url()
    });
    // #endregion
    throw error;
  }

  try {
    await page.waitForTimeout(3000);
    // #region debug-point G:login-wait-success
    reportVpsConnectDebug('G', 'worker/index.js:loginToZenQuant:wait-success', 'Espera inicial apos goto concluiu', {
      currentUrl: page.url(),
      pageClosed: page.isClosed()
    });
    // #endregion
  } catch (error) {
    // #region debug-point G:login-wait-error
    reportVpsConnectDebug('G', 'worker/index.js:loginToZenQuant:wait-error', 'Espera inicial apos goto falhou', {
      message: error?.message || 'erro-desconhecido',
      pageClosed: page.isClosed(),
      currentUrl: page.isClosed() ? null : page.url()
    });
    // #endregion
    throw error;
  }

  const currentText = await page.locator('body').innerText().catch(() => '');
  const alreadyLoggedIn = /my assets|historical profit|wallet|running/i.test(currentText);

  if (!alreadyLoggedIn) {
    const visibleInputs = page.locator('input:visible');
    const loginInput = visibleInputs.nth(0);
    const passwordInput = visibleInputs.nth(1);
    const loginButton = page.locator('uni-view.zq-cta');

    try {
      await loginInput.waitFor({ state: 'visible', timeout: 20000 });
      await passwordInput.waitFor({ state: 'visible', timeout: 20000 });
    } catch (error) {
      const debugText = await page.locator('body').innerText().catch(() => '');
      const pageTitle = await page.title().catch(() => '');
      const inputCount = await page.locator('input').count().catch(() => 0);
      const visibleInputCount = await visibleInputs.count().catch(() => 0);
      throw new Error(
        [
          'Campos de login não ficaram visíveis.',
          `url=${page.url()}`,
          `title=${pageTitle || 'sem_titulo'}`,
          `inputs=${inputCount}`,
          `visible_inputs=${visibleInputCount}`,
          `body_excerpt=${normalizeText(debugText).slice(0, 500) || 'vazio'}`
        ].join(' | ')
      );
    }

    await loginInput.fill(normalizeZenQuantLogin(login));
    await passwordInput.fill(senha);

    await Promise.allSettled([
      page.waitForURL(/#\/pages\/(index\/index|UITransaction\/trade)/, { timeout: 30000 }),
      loginButton.click({ force: true, timeout: 10000 })
    ]);

    await page.waitForTimeout(4000);
  }

  return ensureTradePageReady(page);
};

const createLiveSession = async (contaId, login, senha) => {
  const executablePath = resolveBrowserExecutablePath();
  const browser = await chromium.launch({
    headless: ZENQUANT_HEADLESS !== 'false',
    executablePath,
    args: getBrowserLaunchArgs()
  });

  const context = await browser.newContext({
    locale: 'pt-BR',
    viewport: { width: 1365, height: 900 }
  });
  const page = await context.newPage();

  page.on('close', () => {
    // #region debug-point H:page-close
    reportVpsConnectDebug('H', 'worker/index.js:createLiveSession:page-close', 'Page foi fechada na VPS', {
      contaId,
      browserConnected: browser.isConnected(),
      contextPages: context.pages().length
    });
    // #endregion
  });

  page.on('crash', () => {
    // #region debug-point H:page-crash
    reportVpsConnectDebug('H', 'worker/index.js:createLiveSession:page-crash', 'Page crashou na VPS', {
      contaId,
      browserConnected: browser.isConnected(),
      contextPages: context.pages().length
    });
    // #endregion
  });

  context.on('close', () => {
    // #region debug-point H:context-close
    reportVpsConnectDebug('H', 'worker/index.js:createLiveSession:context-close', 'Context foi fechado na VPS', {
      contaId,
      browserConnected: browser.isConnected()
    });
    // #endregion
  });

  browser.on('disconnected', () => {
    // #region debug-point H:browser-disconnect
    reportVpsConnectDebug('H', 'worker/index.js:createLiveSession:browser-disconnect', 'Browser foi desconectado na VPS', {
      contaId
    });
    // #endregion
  });

  const session = {
    contaId,
    login,
    senha,
    browser,
    context,
    page,
    refreshTimer: null,
    syncPromise: null,
    actionPromise: null,
    lastTimerTickAt: Date.now(),
    refreshFailures: 0,
    lastPreCycleCheckAt: 0,
    postCycleCheckHandle: null,
    postCycleCheckAttempts: 0,
    isBootstrapping: true
  };

  // #region debug-point B:create-session
  reportVpsConnectDebug('B', 'worker/index.js:createLiveSession', 'Sessao Playwright criada na VPS', {
    contaId,
    executablePath,
    headless: ZENQUANT_HEADLESS !== 'false',
    launchArgs: getBrowserLaunchArgs()
  });
  // #endregion

  liveSessions.set(contaId, session);
  return session;
};

const destroyLiveSession = async (contaId) => {
  const session = liveSessions.get(contaId);
  if (!session) {
    return;
  }

  if (session.refreshTimer) {
    clearInterval(session.refreshTimer);
  }

  clearScheduledPostCycleCheck(session);

  // #region debug-point C:destroy-session
  reportVpsConnectDebug('C', 'worker/index.js:destroyLiveSession:before', 'Destroy da sessao solicitado', {
    ...(await getSessionRuntimeState(session)),
    callerStack: new Error().stack?.split('\n').slice(1, 6).map((line) => line.trim()) || []
  });
  // #endregion

  try {
    await session.page?.close();
  } catch {}

  try {
    await session.context?.close();
  } catch {}

  try {
    await session.browser?.close();
  } catch {}

  liveSessions.delete(contaId);

  // #region debug-point C:destroy-session-after
  reportVpsConnectDebug('C', 'worker/index.js:destroyLiveSession:after', 'Sessao removida do mapa liveSessions', {
    contaId,
    liveSessionCount: liveSessions.size
  });
  // #endregion
};

const syncLiveSession = async (contaId, options = {}) => {
  const session = liveSessions.get(contaId);
  if (!session) {
    throw new Error('Sessão do navegador não inicializada para esta conta.');
  }

  if (session.actionPromise) {
    await session.actionPromise;
  }

  if (session.syncPromise) {
    return session.syncPromise;
  }

  session.syncPromise = (async () => {
    const currentConta = await loadContaById(contaId);
    // #region debug-point D:sync-start
    reportVpsConnectDebug('D', 'worker/index.js:syncLiveSession:start', 'Sync da sessao iniciada', {
      contaId,
      forceLogin: Boolean(options.forceLogin),
      connectionState: currentConta.connection_state,
      status: currentConta.status
    });
    // #endregion
    const bodyText = options.forceLogin
      ? await loginToZenQuant(session.page, session.login, session.senha)
      : await ensureTradePageReady(session.page);

    const snapshot = parseTradeSnapshot(bodyText, Number(currentConta.trade_limit) || 300);
    await updateContaFromSnapshot(contaId, snapshot, currentConta);
    // #region debug-point D:sync-success
    reportVpsConnectDebug('D', 'worker/index.js:syncLiveSession:success', 'Sync da sessao concluida', {
      contaId,
      forceLogin: Boolean(options.forceLogin),
      allocatedPlus: snapshot.allocatedPlus,
      allocated3Hours: snapshot.allocated3Hours,
      balance: snapshot.balance,
      nextRescueTimerSeconds: snapshot.nextRescueTimerSeconds
    });
    // #endregion
    if ((snapshot.nextRescueTimerSeconds ?? 1) === 0 && !session.actionPromise) {
      setTimeout(() => {
        executeRescueCycle(contaId).catch((error) => {
          console.error(`Falha ao executar resgate imediato da conta ${contaId}:`, error.message);
        });
      }, 0);
    }
    return loadContaById(contaId);
  })().catch(async (error) => {
    // #region debug-point D:sync-error
    reportVpsConnectDebug('D', 'worker/index.js:syncLiveSession:error', 'Sync da sessao falhou', {
      contaId,
      forceLogin: Boolean(options.forceLogin),
      message: error?.message || 'erro-desconhecido',
      ...(await getSessionRuntimeState(session))
    });
    // #endregion
    throw error;
  })().finally(() => {
    session.isBootstrapping = false;
    session.syncPromise = null;
  });

  return session.syncPromise;
};

const inspectCycleCompletionState = async (contaId) => {
  const session = liveSessions.get(contaId);
  if (!session) {
    throw new Error('Sessão do navegador não inicializada para esta conta.');
  }

  const currentConta = await loadContaById(contaId);
  const bodyText = await ensureTradePageReady(session.page);
  const snapshot = parseTradeSnapshot(bodyText, Number(currentConta.trade_limit) || 300);
  await updateContaFromSnapshot(contaId, snapshot, currentConta);

  const claimableCount = await countVisibleExactText(session.page, 'Claimable').catch(() => 0);
  const wholeBalance = Math.floor(Math.max(Number(snapshot.balance) || 0, 0));
  const plusMissing = snapshot.allocatedPlus < FIXED_PLUS_ALLOCATION && wholeBalance >= 1;
  const hours3Missing = wholeBalance >= 1;
  const needsAnotherCycle = claimableCount > 0 || wholeBalance >= POST_CYCLE_MIN_FORCE_BALANCE;

  return {
    snapshot,
    claimableCount,
    wholeBalance,
    plusMissing,
    hours3Missing,
    needsAnotherCycle
  };
};

const runPreCycleCheck = async (contaId) => {
  const session = liveSessions.get(contaId);
  if (!session) {
    return;
  }

  const now = Date.now();
  if ((now - (session.lastPreCycleCheckAt || 0)) < (PRE_CYCLE_CHECK_WINDOW_SECONDS * 1000)) {
    return;
  }

  session.lastPreCycleCheckAt = now;

  try {
    await syncLiveSession(contaId);
  } catch (error) {
    console.error(`Falha na pre-checagem do ciclo da conta ${contaId}:`, error.message);
    if (!isRecoverableUiActionError(error)) {
      try {
        await connectAccount(contaId);
      } catch (reconnectError) {
        console.error(`Falha ao reconectar preventivamente a conta ${contaId}:`, reconnectError.message);
      }
    }
  }
};

const schedulePostCycleCheck = (contaId, delayMs = POST_CYCLE_CHECK_INITIAL_DELAY_MS) => {
  const session = liveSessions.get(contaId);
  if (!session) {
    return;
  }

  clearScheduledPostCycleCheck(session);
  session.postCycleCheckHandle = setTimeout(() => {
    verifyAndRecoverCycle(contaId).catch((error) => {
      console.error(`Falha no rastreamento pos-ciclo da conta ${contaId}:`, error.message);
    });
  }, delayMs);
};

const verifyAndRecoverCycle = async (contaId) => {
  const session = liveSessions.get(contaId);
  if (!session) {
    return;
  }

  if (session.actionPromise || session.syncPromise) {
    schedulePostCycleCheck(contaId, POST_CYCLE_CHECK_RETRY_MS);
    return;
  }

  session.postCycleCheckAttempts = (session.postCycleCheckAttempts || 0) + 1;

  try {
    const inspection = await inspectCycleCompletionState(contaId);
    // #region debug-point F:post-cycle-check
    reportRescueDebug('F', 'worker/index.js:verifyAndRecoverCycle', 'Rastreamento pos-ciclo executado', {
      contaId,
      attempt: session.postCycleCheckAttempts,
      claimableCount: inspection.claimableCount,
      wholeBalance: inspection.wholeBalance,
      plusMissing: inspection.plusMissing,
      hours3Missing: inspection.hours3Missing,
      needsAnotherCycle: inspection.needsAnotherCycle,
      allocatedPlus: inspection.snapshot.allocatedPlus,
      allocated3Hours: inspection.snapshot.allocated3Hours,
      balance: inspection.snapshot.balance
    });
    // #endregion

    if (!inspection.needsAnotherCycle) {
      session.postCycleCheckAttempts = 0;
      clearScheduledPostCycleCheck(session);
      return;
    }

    if (session.postCycleCheckAttempts >= POST_CYCLE_CHECK_MAX_ATTEMPTS) {
      console.error(`Rastreamento pos-ciclo da conta ${contaId} atingiu o limite de tentativas.`);
      return;
    }

    await executeRescueCycle(contaId);
  } catch (error) {
    console.error(`Falha na verificacao pos-ciclo da conta ${contaId}:`, error.message);
    if (session.postCycleCheckAttempts < POST_CYCLE_CHECK_MAX_ATTEMPTS) {
      schedulePostCycleCheck(contaId, POST_CYCLE_CHECK_RETRY_MS);
    }
  }
};

const startLiveRefresh = (contaId) => {
  const session = liveSessions.get(contaId);
  if (!session || session.refreshTimer) {
    return;
  }

  session.refreshTimer = setInterval(async () => {
    try {
      await syncLiveSession(contaId);
      session.refreshFailures = 0;
    } catch (error) {
      // #region debug-point E:refresh-error
      reportVpsConnectDebug('E', 'worker/index.js:startLiveRefresh:error', 'Refresh da sessao falhou', {
        contaId,
        message: error?.message || 'erro-desconhecido',
        refreshFailures: session.refreshFailures || 0,
        ...(await getSessionRuntimeState(session))
      });
      // #endregion
      console.error(`Falha no refresh ao vivo da conta ${contaId}:`, error.message);
      if (isRecoverableUiActionError(error)) {
        session.refreshFailures = 0;
        return;
      }

      session.refreshFailures = (session.refreshFailures || 0) + 1;

      if (session.refreshFailures >= 3) {
        await supabaseAdmin.from('contas').update({ connection_state: 'desconectada' }).eq('id', contaId);
        await destroyLiveSession(contaId);
      }
    }
  }, LIVE_REFRESH_MS);
};

const claimOnePosition = async (page) => {
  await waitForActionOverlayToClear(page);
  const claimableButton = await getVisibleExactTextLocator(page, 'Claimable', { pick: 'highest' });
  if (!claimableButton) {
    return null;
  }

  await claimableButton.click({ timeout: 10000 });
  await page.waitForTimeout(1200);

  const modalText = await page.locator('body').innerText({ timeout: 20000 });
  if (!/Current Interest Payout Time/i.test(modalText)) {
    throw new Error('A modal de resgate não apareceu como esperado.');
  }

  const summary = parseClaimDialog(modalText);
  // #region debug-point A:claim-confirm
  reportRescueDebug('A', 'worker/index.js:claimOnePosition', 'Claimable localizado e modal pronta para Confirm', {
    orderAmount: summary.orderAmount,
    netIncome: summary.netIncome,
    currentInterestPayoutTime: summary.currentInterestPayoutTime
  });
  // #endregion
  await clickVisibleExactText(page, 'Confirm', { pick: 'first' });
  await page.waitForTimeout(5000);
  await waitForActionOverlayToClear(page);

  return summary;
};

const claimAllAvailablePositions = async (page) => {
  const claimed = [];

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const claimableCount = await countVisibleExactText(page, 'Claimable');
    if (claimableCount === 0) {
      break;
    }

    const claim = await claimOnePosition(page);
    if (!claim) {
      break;
    }

    claimed.push(claim);
    await page.waitForTimeout(2000);
    await ensureTradePageReady(page);
  }

  return claimed;
};

const getEnabledInjectionInput = async (page, timeout = 15000) => {
  const startedAt = Date.now();
  let visibleInputCount = 0;
  let enabledVisibleInputCount = 0;

  while ((Date.now() - startedAt) < timeout) {
    await waitForActionOverlayToClear(page, 3000);
    const enabledVisibleInputs = page.locator('input:visible:not([disabled]):not([readonly])');
    enabledVisibleInputCount = await enabledVisibleInputs.count().catch(() => 0);

    if (enabledVisibleInputCount > 0) {
      return enabledVisibleInputs.first();
    }

    visibleInputCount = await page.locator('input:visible').count().catch(() => 0);
    await page.waitForTimeout(400);
  }

  const bodyText = await page.locator('body').innerText().catch(() => '');
  throw new Error(
    [
      'Campo de injeção não ficou habilitado.',
      `visible_inputs=${visibleInputCount}`,
      `enabled_visible_inputs=${enabledVisibleInputCount}`,
      `body_excerpt=${normalizeText(bodyText).slice(0, 400) || 'vazio'}`
    ].join(' | ')
  );
};

const enterInjectionAmount = async (page, amount) => {
  const amountInput = await getEnabledInjectionInput(page);
  await amountInput.click({ timeout: 10000 });
  await page.keyboard.press('Control+A').catch(() => {});
  await page.keyboard.press('Backspace').catch(() => {});
  await page.keyboard.type(String(amount), { delay: 80 });
  await page.waitForTimeout(1200);
};

const injectIntoStrategy = async (page, strategyName, amount) => {
  if (!amount || amount <= 0) {
    return false;
  }

  // #region debug-point C:strategy-before
  reportRescueDebug(strategyName === 'Plus' ? 'C' : 'D', 'worker/index.js:injectIntoStrategy:before', 'Preparando injecao na estrategia', {
    strategyName,
    amount
  });
  // #endregion
  await waitForActionOverlayToClear(page);
  // #region debug-point D:strategy-ui-before-click
  reportRescueDebug(strategyName === 'Plus' ? 'C' : 'D', 'worker/index.js:injectIntoStrategy:ui-before-click', 'Estado da UI antes de clicar na estrategia', await getTradeUiDebugState(page));
  // #endregion
  try {
    await clickVisibleExactText(page, strategyName, { pick: 'lowest' });
  } catch (error) {
    // #region debug-point D:strategy-ui-click-error
    reportRescueDebug(strategyName === 'Plus' ? 'C' : 'D', 'worker/index.js:injectIntoStrategy:click-error', 'Falha ao clicar na estrategia para injecao', {
      strategyName,
      amount,
      message: error?.message || 'erro-desconhecido',
      ...(await getTradeUiDebugState(page))
    });
    // #endregion
    throw error;
  }
  await page.waitForTimeout(1000);
  // #region debug-point D:strategy-ui-after-click
  reportRescueDebug(strategyName === 'Plus' ? 'C' : 'D', 'worker/index.js:injectIntoStrategy:ui-after-click', 'Estado da UI apos clicar na estrategia', await getTradeUiDebugState(page));
  // #endregion
  await enterInjectionAmount(page, amount);
  await clickVisibleExactText(page, 'Confirm injection', { pick: 'first' });
  await page.waitForTimeout(6000);
  await waitForActionOverlayToClear(page);
  // #region debug-point C:strategy-after
  reportRescueDebug(strategyName === 'Plus' ? 'C' : 'D', 'worker/index.js:injectIntoStrategy:after', 'Confirm injection concluido', {
    strategyName,
    amount
  });
  // #endregion
  return true;
};

const executeRescueCycle = async (contaId) => {
  const session = liveSessions.get(contaId);
  if (!session) {
    throw new Error('Conecte a conta antes de executar o resgate real.');
  }

  if (session.actionPromise) {
    return session.actionPromise;
  }

  let postCycleDelayMs = POST_CYCLE_CHECK_INITIAL_DELAY_MS;
  session.actionPromise = (async () => {
    try {
      if (session.syncPromise) {
        await session.syncPromise;
      }

      const beforeClaimText = await ensureTradePageReady(session.page);
      const beforeClaimSnapshot = parseTradeSnapshot(beforeClaimText);
      // #region debug-point B:cycle-start
      reportRescueDebug('B', 'worker/index.js:executeRescueCycle:start', 'Ciclo iniciado com snapshot antes do Claimable', {
        contaId,
        balanceBeforeClaim: beforeClaimSnapshot.balance,
        allocatedPlusBeforeClaim: beforeClaimSnapshot.allocatedPlus,
        allocated3HoursBeforeClaim: beforeClaimSnapshot.allocated3Hours,
        nextRescueTimerSecondsBeforeClaim: beforeClaimSnapshot.nextRescueTimerSeconds
      });
      // #endregion
      const claimed = await claimAllAvailablePositions(session.page);

      let currentConta = await loadContaById(contaId);
      let pageText = await ensureTradePageReady(session.page);
      let snapshot = parseTradeSnapshot(pageText, Number(currentConta.trade_limit) || 300);
      const claimedAvailableAmount = getClaimedAvailableAmount(claimed);
      const availableForReinvestment = Math.max(
        Number(snapshot.balance) || 0,
        roundCurrency((Number(beforeClaimSnapshot.balance) || 0) + claimedAvailableAmount, 6)
      );
      const reinvestment = calculateRescueReinvestment(availableForReinvestment, snapshot.allocatedPlus);
      const injections = [];
      // #region debug-point B:cycle-after-claim
      reportRescueDebug('B', 'worker/index.js:executeRescueCycle:after-claim', 'Claimable concluido e valores calculados para reaplicacao', {
        contaId,
        claimedCount: claimed.length,
        claimedAvailableAmount,
        snapshotBalanceAfterClaim: snapshot.balance,
        availableForReinvestment,
        plusAllocation: reinvestment.plusAllocation,
        hours3Allocation: reinvestment.hours3Allocation,
        residualBalance: reinvestment.residualBalance
      });
      // #endregion

      if (reinvestment.plusAllocation > 0) {
        const injectedPlus = await injectIntoStrategy(session.page, 'Plus', reinvestment.plusAllocation);
        if (!injectedPlus) {
          throw new Error('Falha ao reaplicar o valor fixo no Plus durante o ciclo de resgate.');
        }

        injections.push({ strategy: 'Plus', amount: reinvestment.plusAllocation });
        currentConta = await loadContaById(contaId);
        pageText = await ensureTradePageReady(session.page);
        snapshot = parseTradeSnapshot(pageText, Number(currentConta.trade_limit) || 300);
        // #region debug-point C:plus-post-snapshot
        reportRescueDebug('C', 'worker/index.js:executeRescueCycle:after-plus', 'Snapshot apos injecao no Plus', {
          contaId,
          balanceAfterPlus: snapshot.balance,
          allocatedPlusAfterPlus: snapshot.allocatedPlus,
          allocated3HoursAfterPlus: snapshot.allocated3Hours,
          nextRescueTimerSecondsAfterPlus: snapshot.nextRescueTimerSeconds
        });
        // #endregion
      }

      if (reinvestment.hours3Allocation > 0) {
        const injected3Hours = await injectIntoStrategy(session.page, '3Hours', reinvestment.hours3Allocation);
        if (!injected3Hours) {
          throw new Error('Falha ao reaplicar o restante inteiro no 3Hours durante o ciclo de resgate.');
        }

        injections.push({ strategy: '3Hours', amount: reinvestment.hours3Allocation });
        currentConta = await loadContaById(contaId);
        pageText = await ensureTradePageReady(session.page);
        snapshot = parseTradeSnapshot(pageText, Number(currentConta.trade_limit) || 300);
        // #region debug-point D:3hours-post-snapshot
        reportRescueDebug('D', 'worker/index.js:executeRescueCycle:after-3hours', 'Snapshot apos injecao no 3Hours', {
          contaId,
          balanceAfter3Hours: snapshot.balance,
          allocatedPlusAfter3Hours: snapshot.allocatedPlus,
          allocated3HoursAfter3Hours: snapshot.allocated3Hours,
          nextRescueTimerSecondsAfter3Hours: snapshot.nextRescueTimerSeconds
        });
        // #endregion
      }

      currentConta = await loadContaById(contaId);
      await updateContaFromSnapshot(contaId, snapshot, currentConta);
      await supabaseAdmin
        .from('contas')
        .update({
          timer: snapshot.nextRescueTimerSeconds ?? CYCLE_TIMER_SECONDS,
          status: 'Executando',
          balance: roundCurrency(snapshot.balance, 4)
        })
        .eq('id', contaId);

      const updatedConta = await loadContaById(contaId);
      session.lastTimerTickAt = Date.now();

      return {
        conta: toClientAccount(updatedConta),
        cycle: {
          claimed,
          injections
        }
      };
    } catch (error) {
      postCycleDelayMs = POST_CYCLE_CHECK_RETRY_MS;
      // #region debug-point E:cycle-error
      reportRescueDebug('E', 'worker/index.js:executeRescueCycle:error', 'Ciclo falhou com erro runtime', {
        contaId,
        message: error?.message || 'erro-desconhecido',
        connectionState: session.connectionState || null
      });
      // #endregion
      throw error;
    }
  })().finally(() => {
    session.actionPromise = null;
    session.lastPreCycleCheckAt = 0;
    schedulePostCycleCheck(contaId, postCycleDelayMs);
  });

  return session.actionPromise;
};

const connectAccount = async (contaId) => {
  if (pendingConnectPromises.has(contaId)) {
    // #region debug-point A:connect-reuse
    reportVpsConnectDebug('A', 'worker/index.js:connectAccount:reuse', 'Conexao reutilizou promise ja em andamento', {
      contaId
    });
    // #endregion
    return pendingConnectPromises.get(contaId);
  }

  const connectPromise = (async () => {
    const conta = await loadContaById(contaId);
    const secret = await loadContaSecret(contaId);
    const connectedAt = new Date().toISOString();

    // #region debug-point A:connect-start
    reportVpsConnectDebug('A', 'worker/index.js:connectAccount:start', 'Conexao da conta iniciada na VPS', {
      contaId,
      apelido: conta.apelido,
      connectionState: conta.connection_state,
      status: conta.status
    });
    // #endregion
    await supabaseAdmin.from('contas').update({ connection_state: 'conectando' }).eq('id', contaId);
    await destroyLiveSession(contaId);
    await createLiveSession(contaId, conta.login, secret.senha);
    await syncLiveSession(contaId, { forceLogin: true });
    await supabaseAdmin.from('contas').update({ last_connected_at: connectedAt, connection_state: 'conectada' }).eq('id', contaId);
    const syncedConta = await loadContaById(contaId);
    startLiveRefresh(contaId);

    // #region debug-point A:connect-success
    reportVpsConnectDebug('A', 'worker/index.js:connectAccount:success', 'Conta marcada como conectada na VPS', {
      contaId,
      apelido: conta.apelido,
      connectionState: syncedConta.connection_state,
      status: syncedConta.status
    });
    // #endregion

    return toClientAccount(syncedConta);
  })().finally(() => {
    pendingConnectPromises.delete(contaId);
  });

  pendingConnectPromises.set(contaId, connectPromise);
  return connectPromise;
};

const disconnectAccount = async (contaId) => {
  await destroyLiveSession(contaId);
  await supabaseAdmin.from('contas').update({ connection_state: 'desconectada' }).eq('id', contaId);
  const conta = await loadContaById(contaId);
  return toClientAccount(conta);
};

const tickConnectedAccountTimer = async (contaId) => {
  const session = liveSessions.get(contaId);
  if (!session) {
    return;
  }

  if (session.actionPromise || session.syncPromise) {
    session.lastTimerTickAt = Date.now();
    return;
  }

  const now = Date.now();
  if (!session.lastTimerTickAt) {
    session.lastTimerTickAt = now;
    return;
  }

  const elapsedSeconds = Math.floor((now - session.lastTimerTickAt) / 1000);
  if (elapsedSeconds < 1) {
    return;
  }

  session.lastTimerTickAt += elapsedSeconds * 1000;

  const conta = await loadContaById(contaId);
  if (conta.connection_state !== 'conectada') {
    return;
  }

  let currentTimer = Math.max(Number(conta.timer) || 0, 0);
  if (currentTimer > 0 && currentTimer <= PRE_CYCLE_CHECK_WINDOW_SECONDS) {
    await runPreCycleCheck(contaId);
    const refreshedConta = await loadContaById(contaId);
    currentTimer = Math.max(Number(refreshedConta.timer) || 0, 0);
  }

  if (currentTimer <= 0) {
    if (conta.status !== 'Resgatando') {
      await supabaseAdmin.from('contas').update({ timer: 0, status: 'Resgatando' }).eq('id', contaId);
    }

    await executeRescueCycle(contaId);
    return;
  }

  const nextTimer = Math.max(currentTimer - elapsedSeconds, 0);

  if (nextTimer === 0) {
    await supabaseAdmin.from('contas').update({ timer: 0, status: 'Resgatando' }).eq('id', contaId);
    await executeRescueCycle(contaId);
    return;
  }

  await supabaseAdmin.from('contas').update({ timer: nextTimer, status: 'Executando' }).eq('id', contaId);
};

const startTimerWorker = () => {
  if (timerWorkerHandle) {
    return;
  }

  timerWorkerHandle = setInterval(async () => {
    if (timerWorkerRunning) {
      return;
    }

    timerWorkerRunning = true;

    try {
      for (const contaId of liveSessions.keys()) {
        await tickConnectedAccountTimer(contaId);
      }
    } catch (error) {
      console.error('Falha no worker dedicado do timer:', error.message);
    } finally {
      timerWorkerRunning = false;
    }
  }, TIMER_WORKER_MS);
};

const reconcileConnectedAccounts = async () => {
  const connectedContas = await loadConnectedContas();
  const connectedIds = new Set(connectedContas.map((conta) => conta.id));

  for (const conta of connectedContas) {
    if (!liveSessions.has(conta.id) && !pendingConnectPromises.has(conta.id)) {
      try {
        // #region debug-point F:reconcile-restore
        reportVpsConnectDebug('F', 'worker/index.js:reconcileConnectedAccounts:start', 'Reconcile tentou restaurar conta sem sessao ativa', {
          contaId: conta.id,
          apelido: conta.apelido,
          connectionState: conta.connection_state,
          status: conta.status
        });
        // #endregion
        await connectAccount(conta.id);
      } catch (error) {
        // #region debug-point F:reconcile-error
        reportVpsConnectDebug('F', 'worker/index.js:reconcileConnectedAccounts:error', 'Reconcile falhou ao restaurar conta', {
          contaId: conta.id,
          apelido: conta.apelido,
          message: error?.message || 'erro-desconhecido'
        });
        // #endregion
        console.error(`Falha ao restaurar a conta ${conta.id} no worker:`, error.message);
        if (!isRecoverableUiActionError(error)) {
          await supabaseAdmin.from('contas').update({ connection_state: 'desconectada' }).eq('id', conta.id);
        }
      }
    }
  }

  for (const contaId of [...liveSessions.keys()]) {
    const session = liveSessions.get(contaId);
    if (
      !connectedIds.has(contaId) &&
      !pendingConnectPromises.has(contaId) &&
      !session?.syncPromise &&
      !session?.actionPromise &&
      !session?.isBootstrapping
    ) {
      await destroyLiveSession(contaId);
    }
  }
};

const startReconcileLoop = () => {
  if (reconcileHandle) {
    return;
  }

  reconcileHandle = setInterval(() => {
    reconcileConnectedAccounts().catch((error) => {
      console.error('Falha ao reconciliar contas conectadas no worker:', error.message);
    });
  }, RECONCILE_INTERVAL_MS);
};

app.get('/internal/health', requireWorkerToken, (_req, res) => {
  let browserReady = false;

  try {
    browserReady = Boolean(resolveBrowserExecutablePath());
  } catch {
    browserReady = false;
  }

  res.json({ ok: true, browser_ready: browserReady, active_sessions: liveSessions.size });
});

app.post('/internal/accounts/:id/connect', requireWorkerToken, async (req, res) => {
  const contaId = Number(req.params.id);

  if (!Number.isInteger(contaId) || contaId <= 0) {
    res.status(400).json({ error: 'ID inválido.' });
    return;
  }

  try {
    const conta = await connectAccount(contaId);
    res.json(conta);
  } catch (error) {
    await supabaseAdmin.from('contas').update({ connection_state: 'desconectada' }).eq('id', contaId);
    res.status(500).json({ error: `Falha ao validar login real no ZenQuant: ${error.message}` });
  }
});

app.post('/internal/accounts/:id/disconnect', requireWorkerToken, async (req, res) => {
  const contaId = Number(req.params.id);

  if (!Number.isInteger(contaId) || contaId <= 0) {
    res.status(400).json({ error: 'ID inválido.' });
    return;
  }

  try {
    const conta = await disconnectAccount(contaId);
    res.json(conta);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/internal/accounts/:id/rescue-cycle', requireWorkerToken, async (req, res) => {
  const contaId = Number(req.params.id);

  if (!Number.isInteger(contaId) || contaId <= 0) {
    res.status(400).json({ error: 'ID inválido.' });
    return;
  }

  try {
    const result = await executeRescueCycle(contaId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Falha ao executar o resgate real no ZenQuant: ${error.message}` });
  }
});

app.listen(Number(WORKER_PORT), async () => {
  startTimerWorker();
  startReconcileLoop();
  await reconcileConnectedAccounts().catch((error) => {
    console.error('Falha ao iniciar a reconciliação do worker:', error.message);
  });
  console.log(`Worker ZenQuant em http://127.0.0.1:${WORKER_PORT}/internal`);
});
