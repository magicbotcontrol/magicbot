import { SystemLog } from '../../types';
import { getCurrentAuthProfile } from '../auth';
import { supabase } from '../supabase';
import { assertNoError, dateUtils, mapLogRow, SystemLogRow } from './shared';

export async function getLogs(): Promise<SystemLog[]> {
  const { data, error } = await supabase
    .from('app_logs')
    .select('id, acao, detalhe, data, user_name, created_at')
    .order('created_at', { ascending: false });

  assertNoError(error);
  return (data ?? []).map(mapLogRow);
}

export async function addLog(acao: string, detalhe: string) {
  const auth = await getCurrentAuthProfile();
  const payload: SystemLogRow = {
    id: `l-${Date.now()}`,
    acao,
    detalhe,
    data: dateUtils.todayStr(),
    user_name: auth?.nome || 'Sistema',
  };

  const { error } = await supabase.from('app_logs').insert(payload);
  assertNoError(error);
}
