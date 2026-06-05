import { createClient } from '@supabase/supabase-js';

const getEnv = (key, fallback = '') => {
  try {
    const value = import.meta.env[key];
    return String(value ?? fallback).trim();
  } catch {
    return String(fallback).trim();
  }
};

export const getSupabaseConfig = () => {
  const url = getEnv('VITE_SUPABASE_URL').replace(/\/+$/, '');
  const anonKey = getEnv('VITE_SUPABASE_ANON_KEY');

  return {
    url,
    anonKey,
    isConfigured: Boolean(url && anonKey),
  };
};

export const getSupabaseMissingEnv = () => {
  const missing = [];
  const { url, anonKey } = getSupabaseConfig();

  if (!url) missing.push('VITE_SUPABASE_URL');
  if (!anonKey) missing.push('VITE_SUPABASE_ANON_KEY');

  return missing;
};

const encode = (value) => {
  try {
    return encodeURIComponent(String(value || ''));
  } catch {
    return '';
  }
};

const decode = (value) => {
  try {
    return decodeURIComponent(String(value || ''));
  } catch {
    return '';
  }
};

const getCookie = (name) => {
  try {
    const raw = String(document?.cookie || '');
    if (!raw) return null;
    const parts = raw.split(';').map((p) => p.trim());
    const prefix = `${name}=`;
    const hit = parts.find((p) => p.startsWith(prefix));
    if (!hit) return null;
    return decode(hit.slice(prefix.length));
  } catch {
    return null;
  }
};

const setCookie = (name, value, days = 30) => {
  try {
    const maxAge = Math.max(0, Math.floor(days * 24 * 60 * 60));
    const secure = typeof window !== 'undefined' && window.location?.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${name}=${encode(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
  } catch {}
};

const removeCookie = (name) => {
  try {
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
  } catch {}
};

const cookieStorage = {
  getItem: (key) => getCookie(key),
  setItem: (key, value) => setCookie(key, value, 30),
  removeItem: (key) => removeCookie(key),
};

let cachedClient;
let cachedKey;

export const getSupabaseClient = () => {
  const { url, anonKey, isConfigured } = getSupabaseConfig();
  const nextKey = `${url}::${anonKey}`;

  if (!isConfigured) return null;
  if (cachedClient && cachedKey === nextKey) return cachedClient;

  cachedKey = nextKey;
  cachedClient = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: cookieStorage,
    },
  });

  return cachedClient;
};

export const hasSupabaseClient = () => Boolean(getSupabaseClient());
