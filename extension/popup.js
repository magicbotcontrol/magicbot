async function getConfig() {
  const result = await chrome.storage.local.get([
    'supabaseUrl',
    'supabaseAnonKey',
    'magicEmail',
    'magicPassword',
    'iqEmail',
    'iqPassword',
    'enabled'
  ]);
  return result || {};
}

async function setConfig(next) {
  await chrome.storage.local.set(next);
}

function $(id) {
  return document.getElementById(id);
}

function setStatus(text, ok) {
  const el = $('status');
  el.textContent = text;
  el.className = `status ${ok ? 'ok' : 'bad'}`;
}

async function render() {
  const cfg = await getConfig();
  $('supabaseUrl').value = cfg.supabaseUrl || '';
  $('supabaseAnonKey').value = cfg.supabaseAnonKey || '';
  $('magicEmail').value = cfg.magicEmail || '';
  $('magicPassword').value = cfg.magicPassword || '';
  $('iqEmail').value = cfg.iqEmail || '';
  $('iqPassword').value = cfg.iqPassword || '';
  setStatus(cfg.enabled ? 'Ativo' : 'Parado', cfg.enabled);
}

async function save() {
  await setConfig({
    supabaseUrl: $('supabaseUrl').value.trim(),
    supabaseAnonKey: $('supabaseAnonKey').value.trim(),
    magicEmail: $('magicEmail').value.trim(),
    magicPassword: $('magicPassword').value,
    iqEmail: $('iqEmail').value.trim(),
    iqPassword: $('iqPassword').value
  });
  setStatus('Salvo', true);
}

async function start() {
  await save();
  await setConfig({ enabled: true });
  await chrome.runtime.sendMessage({ type: 'EXECUTOR_START' });
  await render();
}

async function stop() {
  await setConfig({ enabled: false });
  await chrome.runtime.sendMessage({ type: 'EXECUTOR_STOP' });
  await render();
}

async function openIq() {
  await chrome.runtime.sendMessage({ type: 'OPEN_IQ' });
}

$('save').addEventListener('click', save);
$('start').addEventListener('click', start);
$('stop').addEventListener('click', stop);
$('openIq').addEventListener('click', openIq);

render();

