import { UserCopy } from '../../types';
import { supabase } from '../supabase';
import { getIndicators } from './indicators.service';
import { addLog } from './logs.service';
import { triggerTelegramNotification } from './notifications.service';
import {
  assertNoError,
  BalanceUpdateResult,
  buildBalanceHistory,
  calculatePlanFields,
  dateUtils,
  NewUserInput,
} from './shared';

export function buildUserPayload(input: NewUserInput, generatedId = `usr-${Date.now()}`): UserCopy {
  const planFields = calculatePlanFields(input.banca_inicial, !!input.indicador_id);

  return {
    ...input,
    id: generatedId,
    banca_atual: input.banca_inicial,
    ...planFields,
    proxima_cobranca: dateUtils.addDays(
      input.data_inicio,
      planFields.plano === 'QUINZENAL' ? 15 : 7
    ),
    created_at: dateUtils.todayStr(),
  };
}

export function buildUpdatedUserPayload(updated: UserCopy): UserCopy {
  const planFields = calculatePlanFields(updated.banca_inicial, !!updated.indicador_id);

  return {
    ...updated,
    ...planFields,
    proxima_cobranca: dateUtils.addDays(
      updated.data_inicio,
      planFields.plano === 'QUINZENAL' ? 15 : 7
    ),
  };
}

export async function getUsers(): Promise<UserCopy[]> {
  const { data, error } = await supabase.from('users_copy').select('*').order('created_at');
  assertNoError(error);
  return data ?? [];
}

export async function addUser(
  input: NewUserInput
): Promise<{ success: boolean; message?: string; user?: UserCopy }> {
  const users = await getUsers();

  if (!/^\d{9}$/.test(input.iq_id)) {
    return { success: false, message: 'O ID IQ Option deve possuir exatamente 9 algarismos numéricos.' };
  }

  if (users.some((user) => user.iq_id === input.iq_id)) {
    return { success: false, message: `Já existe um usuário cadastrado com o ID IQ Option ${input.iq_id}.` };
  }

  const newUser = buildUserPayload(input);

  const { data, error } = await supabase.from('users_copy').insert(newUser).select().single();
  assertNoError(error);

  const indicators = await getIndicators();
  const indicatorName = input.indicador_id
    ? indicators.find((indicator) => indicator.id === input.indicador_id)?.nome || 'Indicador'
    : 'Direto';

  await addLog(
    'Cadastro Usuário Copy',
    `Usuário ${newUser.nome} cadastrado com ID Iq ${newUser.iq_id} e banca inicial $${newUser.banca_inicial}`
  );
  await triggerTelegramNotification(
    `🔔 *Novo Usuário Conectado ao Copy*\n👤 *Nome:* ${newUser.nome}\n🆔 *ID IQ:* ${newUser.iq_id}\n📈 *Banca Inicial:* $${newUser.banca_inicial}\n🗓️ *Plano:* ${newUser.plano}\n📣 *Indicador:* ${indicatorName}`
  );

  return { success: true, user: data };
}

export async function updateUser(updated: UserCopy) {
  const users = await getUsers();

  if (!/^\d{9}$/.test(updated.iq_id)) {
    throw new Error('O ID IQ Option deve possuir exatamente 9 algarismos numéricos.');
  }

  if (users.some((user) => user.id !== updated.id && user.iq_id === updated.iq_id)) {
    throw new Error(`Já existe um usuário cadastrado com o ID IQ Option ${updated.iq_id}.`);
  }

  const normalizedUser = buildUpdatedUserPayload(updated);

  const { error } = await supabase.from('users_copy').update(normalizedUser).eq('id', updated.id);
  assertNoError(error);
  await addLog('Edição Usuário', `Usuário ${updated.nome} editado`);
}

export async function deleteUser(id: string) {
  const users = await getUsers();
  const userToDelete = users.find((user) => user.id === id);

  const { error: billingError } = await supabase.from('cobrancas').delete().eq('user_id', id);
  assertNoError(billingError);

  const { error: historyError } = await supabase.from('historico_banca').delete().eq('user_id', id);
  assertNoError(historyError);

  const { error } = await supabase.from('users_copy').delete().eq('id', id);
  assertNoError(error);
  await addLog('Exclusão Usuário', `Usuário ${userToDelete?.nome || id} removido do sistema`);
}

export async function recordBalanceUpdate(
  userId: string,
  targetBalance: number
): Promise<BalanceUpdateResult> {
  const users = await getUsers();
  const user = users.find((item) => item.id === userId);

  if (!user) {
    return { success: false, difference: 0 };
  }

  const difference = targetBalance - user.banca_atual;

  if (difference === 0) {
    return { success: true, difference: 0 };
  }

  const history = buildBalanceHistory(userId, user.banca_atual, targetBalance);

  const { error: historyError } = await supabase.from('historico_banca').insert(history);
  assertNoError(historyError);

  const { error: userError } = await supabase
    .from('users_copy')
    .update({ banca_atual: targetBalance })
    .eq('id', userId);
  assertNoError(userError);

  await addLog(
    'Atualização de Banca',
    `Banca de ${user.nome} de $${user.banca_atual} para $${targetBalance} (Lucro: $${difference})`
  );

  if (difference < 0) {
    await triggerTelegramNotification(
      `⚠️ *Evolução Negativa da Banca*\n👤 *Usuário:* ${user.nome}\n🆔 *ID IQ:* ${user.iq_id}\n📉 *Prejuízo:* $${Math.abs(difference)} (${history.percentual}%)\n🔴 *Saldo Atual:* $${targetBalance}`
    );
  }

  return { success: true, difference };
}

export async function upsertClientCopy(input: {
  iq_id: string;
  banca_inicial: number;
  data_inicio: string;
  telegram?: string;
}) {
  const { data, error } = await supabase.rpc('upsert_client_copy', {
    p_iq_id: input.iq_id,
    p_banca_inicial: input.banca_inicial,
    p_data_inicio: input.data_inicio,
    p_telegram: input.telegram ?? '',
  });
  assertNoError(error);
  return data as string;
}
