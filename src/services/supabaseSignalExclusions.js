import { supabase, supabaseEnabled } from '../lib/supabase/client';

function assertSupabase() {
  if (!supabaseEnabled || !supabase) {
    throw new Error('Supabase is not configured.');
  }
}

function normalizeMarket(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized || 'ob';
}

function normalizeAsset(value) {
  return String(value || '').trim().toUpperCase();
}

export async function listWorkspaceSignalExclusions({ workspaceId, listDate, marketCode, asset }) {
  assertSupabase();
  const normalizedMarket = normalizeMarket(marketCode);
  const normalizedAsset = normalizeAsset(asset);

  if (!workspaceId || !listDate || !normalizedAsset) {
    return [];
  }

  const { data, error } = await supabase
    .from('workspace_signal_exclusions')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('list_date', listDate)
    .eq('market_code', normalizedMarket)
    .eq('asset', normalizedAsset);

  if (error) throw error;
  return (data || []).map((row) => {
    const key = String(row.signal_key || '').trim().toUpperCase();
    const legacyLine = Number(row.line_number || row.last_line_number || 0) || null;
    return {
      signal_key: key || (legacyLine ? `LINE|${legacyLine}` : ''),
      is_ignored: Boolean(row.is_ignored),
      last_line_number: Number(row.last_line_number || legacyLine || 0) || null,
      line_number: legacyLine
    };
  });
}

export async function setWorkspaceSignalIgnored({ workspaceId, listDate, marketCode, asset, signalKey, lineNumber, ignored }) {
  assertSupabase();
  const normalizedMarket = normalizeMarket(marketCode);
  const normalizedAsset = normalizeAsset(asset);
  const normalizedKey = String(signalKey || '').trim().toUpperCase();
  const normalizedLineNumber = Number(lineNumber);
  const nextIgnored = Boolean(ignored);

  if (!workspaceId || !listDate || !normalizedAsset || !normalizedKey) {
    throw new Error('Parâmetros inválidos para ignorar sinal.');
  }

  if (!normalizedLineNumber && normalizedKey.startsWith('LINE|')) {
    const parsed = Number(normalizedKey.split('|')[1]);
    if (parsed) {
      throw new Error('Line number ausente para tabela legacy.');
    }
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  const userId = authData.user?.id || null;

  const tryStable = async () => {
    const upsertResult = await supabase
      .from('workspace_signal_exclusions')
      .upsert({
        workspace_id: workspaceId,
        list_date: listDate,
        market_code: normalizedMarket,
        asset: normalizedAsset,
        signal_key: normalizedKey,
        last_line_number: normalizedLineNumber || null,
        is_ignored: nextIgnored,
        updated_by: userId
      }, { onConflict: 'workspace_id,list_date,market_code,asset,signal_key' })
      .select('*')
      .single();

    if (upsertResult.error) throw upsertResult.error;
    return upsertResult.data;
  };

  const tryLegacy = async () => {
    if (!normalizedLineNumber) {
      throw new Error('Line number inválido para tabela legacy.');
    }
    const upsertResult = await supabase
      .from('workspace_signal_exclusions')
      .upsert({
        workspace_id: workspaceId,
        list_date: listDate,
        market_code: normalizedMarket,
        asset: normalizedAsset,
        line_number: normalizedLineNumber,
        is_ignored: nextIgnored,
        updated_by: userId
      }, { onConflict: 'workspace_id,list_date,market_code,asset,line_number' })
      .select('*')
      .single();

    if (upsertResult.error) throw upsertResult.error;
    return upsertResult.data;
  };

  let persisted = null;
  try {
    persisted = await tryStable();
  } catch {
    persisted = await tryLegacy();
  }

  const { error: eventError } = await supabase
    .from('workspace_signal_exclusion_events')
    .insert({
      workspace_id: workspaceId,
      list_date: listDate,
      market_code: normalizedMarket,
      asset: normalizedAsset,
      signal_key: normalizedKey,
      line_number: normalizedLineNumber || null,
      event_type: nextIgnored ? 'ignore' : 'unignore'
    });

  if (eventError) throw eventError;

  return persisted;
}
