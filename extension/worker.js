const IQ_URL = 'https://iqoption.com/';

async function getCfg() {
  return await chrome.storage.local.get([
    'supabaseUrl',
    'supabaseAnonKey',
    'magicEmail',
    'magicPassword',
    'iqEmail',
    'iqPassword',
    'enabled',
    'accessToken',
    'refreshToken',
    'tokenExpiresAt',
    'workspaceId'
  ]);
}

async function setCfg(next) {
  await chrome.storage.local.set(next);
}

async function supabaseFetch(cfg, path, init) {
  const url = `${cfg.supabaseUrl.replace(/\/$/, '')}${path}`;
  const headers = new Headers(init?.headers || {});
  headers.set('apikey', cfg.supabaseAnonKey);
  if (cfg.accessToken) {
    headers.set('Authorization', `Bearer ${cfg.accessToken}`);
  }
  if (!headers.get('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(url, { ...(init || {}), headers });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  if (!res.ok) {
    const msg = json?.msg || json?.message || text || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

async function authPassword(cfg) {
  const path = `/auth/v1/token?grant_type=password`;
  const body = JSON.stringify({ email: cfg.magicEmail, password: cfg.magicPassword });
  const res = await supabaseFetch({ ...cfg, accessToken: null }, path, { method: 'POST', body });
  const expiresAt = Date.now() + (Number(res.expires_in || 3600) * 1000);
  await setCfg({ accessToken: res.access_token, refreshToken: res.refresh_token, tokenExpiresAt: expiresAt });
  return { ...cfg, accessToken: res.access_token, refreshToken: res.refresh_token, tokenExpiresAt: expiresAt };
}

async function ensureAuth(cfg) {
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || !cfg.magicEmail || !cfg.magicPassword) {
    throw new Error('Config incompleta');
  }
  if (!cfg.accessToken || !cfg.tokenExpiresAt || Date.now() > (Number(cfg.tokenExpiresAt) - 60_000)) {
    return await authPassword(cfg);
  }
  return cfg;
}

async function ensureWorkspace(cfg) {
  const authed = await ensureAuth(cfg);
  if (authed.workspaceId) return authed;

  const user = await supabaseFetch(authed, '/auth/v1/user', { method: 'GET', headers: { 'Content-Type': 'application/json' } });
  const userId = user?.id;
  if (!userId) throw new Error('Usuário inválido');

  const workspaces = await supabaseFetch(
    authed,
    `/rest/v1/app_workspaces?select=id,slug,created_at&owner_user_id=eq.${userId}&order=created_at.asc&limit=1`,
    { method: 'GET', headers: { 'Content-Type': 'application/json' } }
  );

  const wsId = workspaces?.[0]?.id || null;
  if (!wsId) throw new Error('Workspace não encontrado');
  await setCfg({ workspaceId: wsId });
  return { ...authed, workspaceId: wsId };
}

async function getServerTime(cfg) {
  const res = await supabaseFetch(cfg, '/rest/v1/rpc/get_server_time', { method: 'POST', body: '{}' });
  const iso = typeof res === 'string' ? res : (res?.[0] || res);
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) {
    return new Date();
  }
  return dt;
}

async function findOrCreateIqTab() {
  const tabs = await chrome.tabs.query({ url: ['*://*.iqoption.com/*'] });
  if (tabs?.length) {
    const tab = tabs[0];
    await chrome.tabs.update(tab.id, { active: true });
    return tab.id;
  }
  const created = await chrome.tabs.create({ url: IQ_URL, active: true });
  return created.id;
}

async function pollOnce() {
  const cfg = await getCfg();
  if (!cfg.enabled) return;

  const ready = await ensureWorkspace(cfg);
  const now = await getServerTime(ready);
  const nowIso = now.toISOString();

  const bots = await supabaseFetch(
    ready,
    `/rest/v1/workspace_bot_instances?select=id,slot,status,workspace_id,execution_tolerance_seconds&workspace_id=eq.${ready.workspaceId}&status=eq.running`,
    { method: 'GET', headers: { 'Content-Type': 'application/json' } }
  );

  for (const bot of (bots || [])) {
    const tolSeconds = Math.max(Math.min(Number(bot.execution_tolerance_seconds || 5) || 5, 30), 0);
    const plusIso = new Date(now.getTime() + tolSeconds * 1000).toISOString();
    const jobs = await supabaseFetch(
      ready,
      `/rest/v1/trade_jobs?select=*` +
        `&bot_instance_id=eq.${bot.id}` +
        `&status=eq.queued` +
        `&scheduled_at=lte.${encodeURIComponent(plusIso)}` +
        `&expires_at=gte.${encodeURIComponent(nowIso)}` +
        `&order=scheduled_at.asc` +
        `&limit=1`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    );

    const job = jobs?.[0];
    if (!job) continue;

    const tabId = await findOrCreateIqTab();
    const clientIso = new Date().toISOString();
    const driftMs = Date.now() - now.getTime();
    const windowUntilIso = new Date(now.getTime() + tolSeconds * 1000).toISOString();
    const scheduledIso = String(job.scheduled_at || '');

    await supabaseFetch(
      ready,
      `/rest/v1/trade_jobs?id=eq.${job.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status: 'executing', attempts: Number(job.attempts || 0) + 1 })
      }
    );

    const result = await chrome.tabs.sendMessage(tabId, {
      type: 'EXECUTE_JOB',
      job,
      iqEmail: ready.iqEmail || '',
      iqPassword: ready.iqPassword || ''
    });

    if (result?.ok) {
      const executedAtServerIso = (await getServerTime(ready)).toISOString();
      await supabaseFetch(
        ready,
        `/rest/v1/trade_jobs?id=eq.${job.id}`,
        { method: 'PATCH', body: JSON.stringify({ status: 'executed', last_error: '' }) }
      );
      const eventWrittenAtServerIso = (await getServerTime(ready)).toISOString();
      await supabaseFetch(
        ready,
        `/rest/v1/trade_job_events`,
        {
          method: 'POST',
          body: JSON.stringify({
            job_id: job.id,
            workspace_id: job.workspace_id,
            bot_instance_id: job.bot_instance_id,
            event_type: 'executed',
            payload: {
              ...(result.payload || {}),
              tolerance_seconds: tolSeconds,
              server_time: nowIso,
              poll_server_time: nowIso,
              client_time: clientIso,
              drift_ms: driftMs,
              window_until: windowUntilIso,
              scheduled_at: scheduledIso,
              executed_at_server: executedAtServerIso,
              event_written_at_server: eventWrittenAtServerIso
            }
          })
        }
      );
    } else {
      const err = String(result?.error || 'Falha ao executar');
      const expired = new Date(job.expires_at).getTime() < Date.now();
      const executedAtServerIso = (await getServerTime(ready)).toISOString();
      await supabaseFetch(
        ready,
        `/rest/v1/trade_jobs?id=eq.${job.id}`,
        { method: 'PATCH', body: JSON.stringify({ status: expired ? 'expired' : 'failed', last_error: err }) }
      );
      const eventWrittenAtServerIso = (await getServerTime(ready)).toISOString();
      await supabaseFetch(
        ready,
        `/rest/v1/trade_job_events`,
        {
          method: 'POST',
          body: JSON.stringify({
            job_id: job.id,
            workspace_id: job.workspace_id,
            bot_instance_id: job.bot_instance_id,
            event_type: 'failed',
            payload: {
              error: err,
              tolerance_seconds: tolSeconds,
              server_time: nowIso,
              poll_server_time: nowIso,
              client_time: clientIso,
              drift_ms: driftMs,
              window_until: windowUntilIso,
              scheduled_at: scheduledIso,
              executed_at_server: executedAtServerIso,
              event_written_at_server: eventWrittenAtServerIso
            }
          })
        }
      );
    }
  }
}

async function schedule() {
  await chrome.alarms.create('magicbot_poll', { periodInMinutes: 0.05 });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'magicbot_poll') return;
  try { await pollOnce(); } catch {}
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'EXECUTOR_START') {
    schedule().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg?.type === 'EXECUTOR_STOP') {
    chrome.alarms.clear('magicbot_poll').then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg?.type === 'OPEN_IQ') {
    findOrCreateIqTab().then(() => sendResponse({ ok: true }));
    return true;
  }
  sendResponse({ ok: true });
  return false;
});
