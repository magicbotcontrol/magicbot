import { DEFAULT_COMMERCIAL_CONFIG, normalizeCommercialConfig } from '../constants/commercialModel';
import { supabase, supabaseEnabled } from '../lib/supabase/client';

const CONFIG_STORAGE_KEY = 'magicbot.commercialConfig';
const SIGNALS_STORAGE_KEY = 'magicbot.platformSignals';

function readStorage(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function isMissingRelation(error) {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === '42P01' || error?.code === 'PGRST205' || message.includes('platform_commercial_config') || message.includes('platform_signals');
}

function mapSignal(row) {
  return {
    id: row.id,
    asset: row.asset || '',
    operation: row.operation || '',
    status: row.status === 'closed' ? 'closed' : 'open',
    result: ['win', 'loss', 'void'].includes(row.result) ? row.result : 'pending',
    openedAt: row.opened_at || row.openedAt || null,
    closedAt: row.closed_at || row.closedAt || null,
    priceUsd: Number(row.price_usd ?? row.priceUsd ?? 0),
    planCode: row.plan_code || row.planCode || '',
    note: row.note || ''
  };
}

export async function getCommercialConfig() {
  const localConfig = normalizeCommercialConfig(readStorage(CONFIG_STORAGE_KEY, DEFAULT_COMMERCIAL_CONFIG));
  if (!supabaseEnabled || !supabase) return localConfig;

  const { data, error } = await supabase
    .from('platform_commercial_config')
    .select('config')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    if (isMissingRelation(error)) return localConfig;
    throw error;
  }

  if (!data?.config) return localConfig;
  return normalizeCommercialConfig(data.config);
}

export async function saveCommercialConfig(config) {
  const nextConfig = normalizeCommercialConfig(config);
  writeStorage(CONFIG_STORAGE_KEY, nextConfig);
  if (!supabaseEnabled || !supabase) return nextConfig;

  const { error } = await supabase
    .from('platform_commercial_config')
    .upsert({ id: 1, config: nextConfig, updated_at: new Date().toISOString() }, { onConflict: 'id' });

  if (error && !isMissingRelation(error)) throw error;
  return nextConfig;
}

export async function listPlatformSignals() {
  const localSignals = readStorage(SIGNALS_STORAGE_KEY, []).map(mapSignal);
  if (!supabaseEnabled || !supabase) return localSignals;

  const { data, error } = await supabase
    .from('platform_signals')
    .select('*')
    .order('opened_at', { ascending: false });

  if (error) {
    if (isMissingRelation(error)) return localSignals;
    throw error;
  }

  return (data || []).map(mapSignal);
}

export async function savePlatformSignal(signal) {
  const payload = {
    asset: String(signal.asset || '').trim(),
    operation: String(signal.operation || '').trim(),
    status: signal.status === 'closed' ? 'closed' : 'open',
    result: ['win', 'loss', 'void'].includes(signal.result) ? signal.result : 'pending',
    opened_at: signal.openedAt || new Date().toISOString(),
    closed_at: signal.status === 'closed' ? (signal.closedAt || new Date().toISOString()) : null,
    price_usd: Number(signal.priceUsd || 0),
    plan_code: String(signal.planCode || '').trim(),
    note: String(signal.note || '').trim()
  };

  if (!payload.asset) {
    throw new Error('Informe o ativo do sinal.');
  }

  if (!supabaseEnabled || !supabase) {
    const current = readStorage(SIGNALS_STORAGE_KEY, []);
    const next = signal.id
      ? current.map((item) => (item.id === signal.id ? { ...item, ...payload, id: signal.id } : item))
      : [{ id: crypto.randomUUID(), ...payload }, ...current];
    writeStorage(SIGNALS_STORAGE_KEY, next);
    return next.map(mapSignal);
  }

  const query = signal.id
    ? supabase.from('platform_signals').update(payload).eq('id', signal.id)
    : supabase.from('platform_signals').insert(payload);
  const { error } = await query;
  if (error) {
    if (!isMissingRelation(error)) throw error;
    const current = readStorage(SIGNALS_STORAGE_KEY, []);
    const next = signal.id
      ? current.map((item) => (item.id === signal.id ? { ...item, ...payload, id: signal.id } : item))
      : [{ id: crypto.randomUUID(), ...payload }, ...current];
    writeStorage(SIGNALS_STORAGE_KEY, next);
  }

  return listPlatformSignals();
}

export async function removePlatformSignal(signalId) {
  if (!signalId) return listPlatformSignals();

  if (!supabaseEnabled || !supabase) {
    const next = readStorage(SIGNALS_STORAGE_KEY, []).filter((item) => item.id !== signalId);
    writeStorage(SIGNALS_STORAGE_KEY, next);
    return next.map(mapSignal);
  }

  const { error } = await supabase.from('platform_signals').delete().eq('id', signalId);
  if (error && !isMissingRelation(error)) throw error;
  if (error && isMissingRelation(error)) {
    const next = readStorage(SIGNALS_STORAGE_KEY, []).filter((item) => item.id !== signalId);
    writeStorage(SIGNALS_STORAGE_KEY, next);
  }
  return listPlatformSignals();
}
