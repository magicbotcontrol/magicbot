import { addLog } from './logs.service';
import { triggerTelegramNotification } from './notifications.service';
import { dateUtils } from './shared';
import { getCobrancas, updateCobrancaStatus } from './billing.service';
import { getUsers } from './users.service';

export async function runDailyAutomations(): Promise<{ countAlerts: number; updatedCharges: number }> {
  const today = dateUtils.todayStr();
  const users = await getUsers();
  const cobrancas = await getCobrancas();
  let updatedCharges = 0;
  let countAlerts = 0;

  for (const cobranca of cobrancas) {
    if (cobranca.status === 'Pendente' && cobranca.data_vencimento < today) {
      await updateCobrancaStatus(cobranca.id, 'Atrasado');
      updatedCharges++;
    }
  }

  if (updatedCharges > 0) {
    await addLog(
      'Automação Diária',
      `Verificação concluída. ${updatedCharges} faturas vencidas marcadas como em atraso.`
    );
  }

  const usersExpiringToday = users.filter((user) => user.proxima_cobranca === today);

  for (const user of usersExpiringToday) {
    await triggerTelegramNotification(
      `🚨 *Aviso de Ciclo Vencendo Hoje*\n👤 *Usuário:* ${user.nome}\n🆔 *ID IQ:* ${user.iq_id}\n⏰ *O ciclo expira hoje!* Favor atualizar saldo para gerar faturamento correspondente.`
    );
    countAlerts++;
  }

  return { countAlerts, updatedCharges };
}
