import { Indicador } from '../../types';
import { supabase } from '../supabase';
import { addLog } from './logs.service';
import { triggerTelegramNotification } from './notifications.service';
import { assertNoError } from './shared';

export async function getIndicators(): Promise<Indicador[]> {
  const { data, error } = await supabase.from('indicators').select('*').order('nome');
  assertNoError(error);
  return data ?? [];
}

export async function addIndicator(input: Omit<Indicador, 'id'>): Promise<Indicador> {
  const newIndicator: Indicador = {
    ...input,
    id: `ind-${Date.now()}`,
  };

  const { data, error } = await supabase.from('indicators').insert(newIndicator).select().single();
  assertNoError(error);

  await addLog(
    'Cadastro Indicador',
    `Indicador ${newIndicator.nome} cadastrado com código ${newIndicator.codigo_interno}`
  );
  await triggerTelegramNotification(
    `🆕 *Novo Indicador Cadastrado*\n📍 *Nome:* ${newIndicator.nome}\n🔑 *Código:* ${newIndicator.codigo_interno}\n📊 *Comissão:* ${newIndicator.percentual}%`
  );

  return data;
}

export async function updateIndicator(updated: Indicador) {
  const { error } = await supabase.from('indicators').update(updated).eq('id', updated.id);
  assertNoError(error);
  await addLog('Edição Indicador', `Indicador ${updated.nome} atualizado`);
}

export async function deleteIndicator(id: string) {
  const { error } = await supabase.from('indicators').delete().eq('id', id);
  assertNoError(error);
  await addLog('Exclusão Indicador', `Indicador ID ${id} removido`);
}
