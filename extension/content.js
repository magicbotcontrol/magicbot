function normalizeAssetLabel(asset) {
  const raw = String(asset || '').trim().toUpperCase();
  const otc = raw.includes('OTC');
  const base = raw.replace(/-OTC/g, '').replace(/_/g, '').replace(/-/g, '').trim();
  if (!base) return raw;
  if (base.includes('/')) {
    return otc ? `${base} (OTC)` : base;
  }
  if (base.length >= 6) {
    const pair = `${base.slice(0, 3)}/${base.slice(3)}`;
    return otc ? `${pair} (OTC)` : pair;
  }
  return raw;
}

function textIncludes(el, text) {
  return String(el?.textContent || '').toLowerCase().includes(String(text || '').toLowerCase());
}

function findClickableByText(text) {
  const elements = Array.from(document.querySelectorAll('button, [role="button"], a, div'));
  return elements.find((el) => textIncludes(el, text));
}

function clickElement(el) {
  if (!el) return false;
  el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  el.click?.();
  return true;
}

async function tryLogin(iqEmail, iqPassword) {
  const email = String(iqEmail || '').trim();
  const password = String(iqPassword || '').trim();
  if (!email || !password) return { ok: false, reason: 'Credenciais IQ ausentes' };

  const emailInput = document.querySelector('input[type="email"], input[name="email"], input[autocomplete="email"]');
  const passInput = document.querySelector('input[type="password"], input[name="password"], input[autocomplete="current-password"]');
  if (!emailInput || !passInput) return { ok: false, reason: 'Form de login não detectado' };

  emailInput.focus();
  emailInput.value = email;
  emailInput.dispatchEvent(new Event('input', { bubbles: true }));

  passInput.focus();
  passInput.value = password;
  passInput.dispatchEvent(new Event('input', { bubbles: true }));

  const btn = findClickableByText('Entrar') || findClickableByText('Login') || findClickableByText('Sign in');
  if (!btn) return { ok: false, reason: 'Botão de login não encontrado' };
  clickElement(btn);
  return { ok: true };
}

function pickExpiryTime(expiryHHMM) {
  const nodes = Array.from(document.querySelectorAll('button, [role="option"], div'));
  const target = nodes.find((el) => String(el.textContent || '').trim() === expiryHHMM);
  return clickElement(target);
}

function pickDirection(action) {
  if (action === 'CALL') {
    return clickElement(findClickableByText('Acima')) || clickElement(findClickableByText('Up'));
  }
  return clickElement(findClickableByText('Abaixo')) || clickElement(findClickableByText('Down'));
}

function setEntryAmount(value) {
  const v = String(value || '').trim();
  if (!v) return false;
  const input = document.querySelector('input[type="number"], input[inputmode="decimal"], input');
  if (!input) return false;
  input.focus();
  input.value = v;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}

function formatHHMM(date) {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

async function executeJob(job) {
  const now = Date.now();
  const scheduled = new Date(job.scheduled_at).getTime();
  if (Number.isNaN(scheduled)) {
    return { ok: false, error: 'scheduled_at inválido' };
  }
  if (now < scheduled) {
    return { ok: false, error: 'Ainda não é hora' };
  }

  const expiry = new Date(scheduled + 5 * 60 * 1000);
  const expiryHHMM = formatHHMM(expiry);
  pickExpiryTime(expiryHHMM);
  setEntryAmount(job.entry_amount);

  const ok = pickDirection(String(job.action || '').toUpperCase());
  if (!ok) {
    return { ok: false, error: 'Botão CALL/PUT não encontrado' };
  }
  const executedAtClient = new Date().toISOString();
  return { ok: true, payload: { expiry: expiryHHMM, executed_at_client: executedAtClient } };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type !== 'EXECUTE_JOB') {
    sendResponse({ ok: true });
    return;
  }

  const job = msg.job;
  const iqEmail = msg.iqEmail;
  const iqPassword = msg.iqPassword;

  (async () => {
    // #region debug-point E:iq-context
    (()=>{try{const nodes=Array.from(document.querySelectorAll('div,span')).slice(0,2500);const find=(re)=>nodes.find((n)=>re.test(String(n.textContent||'')));const demo=find(/conta\\s*demo/i);const real=find(/conta\\s*real/i);const parseMoney=(txt)=>{const m=String(txt||'').match(/\\$\\s*([0-9.,]+)/);return m?m[1]:null};const extract=(n)=>{if(!n)return null;const box=n.parentElement||n;const t=String(box.textContent||'');return {text:t.slice(0,120),amount:parseMoney(t)};};fetch("http://127.0.0.1:7777/event",{method:"POST",body:JSON.stringify({sessionId:"broker-balance-signals",runId:"pre",hypothesisId:"E",location:"extension/content.js:EXECUTE_JOB",msg:"[DEBUG] IQ page context snapshot",data:{href:location.href,hasDemo:Boolean(demo),hasReal:Boolean(real),demo:extract(demo),real:extract(real)},ts:Date.now()})}).catch(()=>{})}catch{}})();
    // #endregion
    const assetLabel = normalizeAssetLabel(job.asset);
    const assetBtn = findClickableByText(assetLabel);
    if (assetBtn) {
      clickElement(assetBtn);
    }

    const loginTry = await tryLogin(iqEmail, iqPassword);
    if (!loginTry.ok && loginTry.reason !== 'Form de login não detectado') {
      sendResponse({ ok: false, error: loginTry.reason });
      return;
    }

    const res = await executeJob(job);
    // #region debug-point E:iq-execute-result
    fetch("http://127.0.0.1:7777/event",{method:"POST",body:JSON.stringify({sessionId:"broker-balance-signals",runId:"pre",hypothesisId:"E",location:"extension/content.js:executeJob",msg:"[DEBUG] IQ executeJob result",data:{ok:Boolean(res?.ok),error:res?.error||null,asset:String(job.asset||''),action:String(job.action||''),entry:Number(job.entry_amount||0)||0},ts:Date.now()})}).catch(()=>{});
    // #endregion
    sendResponse(res);
  })().catch((err) => sendResponse({ ok: false, error: String(err?.message || err) }));

  return true;
});
