import { Cobranca, HistoricoBanca } from '../../types';
import { supabase } from '../supabase';
import { getIndicators } from './indicators.service';
import { addLog } from './logs.service';
import { triggerTelegramNotification } from './notifications.service';
import { assertNoError, dateUtils } from './shared';
import { getUsers } from './users.service';

export function calculateBillingBreakdown(profit: number, user: Pick<Cobranca, 'percentual_copy'> & {
  percentual_indicador: number;
}) {
  const valor_devido = parseFloat(((profit * user.percentual_copy) / 100).toFixed(2));
  const valor_indicador = parseFloat(((profit * user.percentual_indicador) / 100).toFixed(2));
  const valor_empresa = parseFloat((valor_devido - valor_indicador).toFixed(2));

  return {
    valor_devido,
    valor_indicador,
    valor_empresa,
  };
}

export function buildPendingCobranca(
  userId: string,
  profit: number,
  user: {
    percentual_copy: number;
    percentual_indicador: number;
  },
  generatedId = `cob-${Date.now()}`
): Cobranca {
  const breakdown = calculateBillingBreakdown(profit, user);

  return {
    id: generatedId,
    user_id: userId,
    valor_lucro: profit,
    valor_devido: breakdown.valor_devido,
    status: 'Pendente',
    data_vencimento: dateUtils.addDays(dateUtils.todayStr(), 3),
    percentual_copy: user.percentual_copy,
    valor_indicador: breakdown.valor_indicador,
    valor_empresa: breakdown.valor_empresa,
  };
}

export async function getCobrancas(): Promise<Cobranca[]> {
  const { data, error } = await supabase
    .from('cobrancas')
    .select('*')
    .order('data_vencimento', { ascending: false });

  assertNoError(error);
  return data ?? [];
}

export async function getHistoricos(): Promise<HistoricoBanca[]> {
  const { data, error } = await supabase
    .from('historico_banca')
    .select('*')
    .order('created_at', { ascending: false });

  assertNoError(error);
  return data ?? [];
}

export async function billUserCycle(userId: string, profit: number): Promise<Cobranca | null> {
  if (profit <= 0) {
    return null;
  }

  const users = await getUsers();
  const user = users.find((item) => item.id === userId);

  if (!user) {
    return null;
  }

  const newCob = buildPendingCobranca(userId, profit, user);

  const { data, error } = await supabase.from('cobrancas').insert(newCob).select().single();
  assertNoError(error);

  const proxima_cobranca = dateUtils.addDays(
    dateUtils.todayStr(),
    user.plano === 'QUINZENAL' ? 15 : 7
  );
  const { error: userError } = await supabase
    .from('users_copy')
    .update({ proxima_cobranca })
    .eq('id', userId);
  assertNoError(userError);

  const indicators = await getIndicators();
  const indicator = indicators.find((item) => item.id === user.indicador_id);
  const indicatorName = indicator ? indicator.nome : 'Sem indicador';

  await addLog('Geração de Cobrança', `Fatura de $${newCob.valor_devido} gerada para ${user.nome} (Lucro: $${profit})`);
  await triggerTelegramNotification(
    `⚠️ *Cobrança Pendente Gerada*\n👤 *Usuário:* ${user.nome}\n🆔 *ID IQ:* ${user.iq_id}\n📊 *Plano:* ${user.plano}\n💰 *Lucro Ciclo:* $${profit}\n💵 *Valor Devido (${user.percentual_copy}%):* $${newCob.valor_devido}\n📣 *Indicador:* ${indicatorName}\n⏰ *Vencimento:* ${dateUtils.formatBr(newCob.data_vencimento)}`
  );

  return data;
}

export async function updateCobrancaStatus(
  cobrancaId: string,
  newStatus: 'Pendente' | 'Pago' | 'Atrasado'
) {
  const cobrancas = await getCobrancas();
  const cobranca = cobrancas.find((item) => item.id === cobrancaId);

  if (!cobranca) {
    return;
  }

  const changes: Partial<Cobranca> = {
    status: newStatus,
    data_pagamento: newStatus === 'Pago' ? dateUtils.todayStr() : undefined,
  };

  const { error } = await supabase.from('cobrancas').update(changes).eq('id', cobrancaId);
  assertNoError(error);

  if (newStatus === 'Pago') {
    const users = await getUsers();
    const user = users.find((item) => item.id === cobranca.user_id);
    const name = user ? user.nome : 'Desconhecido';

    await addLog(
      'Pagamento de Fatura',
      `Cobrança de ${name} no valor de $${cobranca.valor_devido} marcada como PAGO`
    );
    await triggerTelegramNotification(
      `✅ *Pagamento Confirmado!*\n👤 *Usuário:* ${name}\n💰 *Valor Pago:* $${cobranca.valor_devido}\n💼 *Receita Líquida:* $${cobranca.valor_empresa}\n📣 *Ref Indicator:* $${cobranca.valor_indicador}`
    );
    return;
  }

  await addLog('Fatura Atualizada', `Cobrança ID ${cobrancaId} marcada como ${newStatus}`);
}

export async function deleteCobranca(id: string) {
  const { error } = await supabase.from('cobrancas').delete().eq('id', id);
  assertNoError(error);
  await addLog('Exclusão Cobrança', `Cobrança ID ${id} removida`);
}
