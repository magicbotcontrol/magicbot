import { supabase, supabaseEnabled } from '../lib/supabase/client';

export const SIGNALS_AUTOMATOR_MAINTENANCE_KEY = 'signals_automator_maintenance';

const DEFAULT_FEATURE_FLAGS = {
  [SIGNALS_AUTOMATOR_MAINTENANCE_KEY]: {
    featureKey: SIGNALS_AUTOMATOR_MAINTENANCE_KEY,
    isEnabled: false,
    note: '',
    updatedAt: null
  }
};

function assertSupabase() {
  if (!supabaseEnabled || !supabase) {
    throw new Error('Supabase is not configured.');
  }
}

function isMissingTableError(error) {
  return String(error?.code || '') === '42P01' || String(error?.message || '').toLowerCase().includes('app_feature_flags');
}

function mapFeatureFlagRow(row) {
  return {
    featureKey: row.feature_key,
    isEnabled: Boolean(row.is_enabled),
    note: String(row.note || ''),
    updatedAt: row.updated_at || null
  };
}

export async function getAppFeatureFlags() {
  assertSupabase();

  const { data, error } = await supabase
    .from('app_feature_flags')
    .select('feature_key, is_enabled, note, updated_at');

  if (error) {
    if (isMissingTableError(error)) {
      return DEFAULT_FEATURE_FLAGS;
    }
    throw error;
  }

  const rows = data || [];
  return rows.reduce((acc, row) => {
    acc[row.feature_key] = mapFeatureFlagRow(row);
    return acc;
  }, { ...DEFAULT_FEATURE_FLAGS });
}

export async function setAppFeatureFlag(featureKey, isEnabled, note = '') {
  assertSupabase();

  const userResult = await supabase.auth.getUser();
  const updatedBy = userResult.data.user?.id || null;

  const { data, error } = await supabase
    .from('app_feature_flags')
    .upsert({
      feature_key: featureKey,
      is_enabled: Boolean(isEnabled),
      note,
      updated_by: updatedBy
    }, { onConflict: 'feature_key' })
    .select('feature_key, is_enabled, note, updated_at')
    .single();

  if (error) throw error;
  return mapFeatureFlagRow(data);
}
