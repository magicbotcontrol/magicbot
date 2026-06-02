import { getCurrentSessionUser } from '../auth';
import { Configuracoes, Cobranca, HistoricoBanca, SystemLog, UserCopy } from '../../types';

export type NewUserInput = Omit<
  UserCopy,
  | 'id'
  | 'plano'
  | 'percentual_cliente'
  | 'percentual_copy'
  | 'percentual_indicador'
  | 'receita_empresa'
  | 'proxima_cobranca'
  | 'banca_atual'
  | 'created_at'
>;

export interface AppSettingsRow {
  owner_id: string;
  telegram_token: string;
  telegram_chat_id: string;
}

export interface SystemLogRow {
  id: string;
  acao: string;
  detalhe: string;
  data: string;
  user_name: string;
  created_at?: string;
}

export interface BalanceUpdateResult {
  success: boolean;
  difference: number;
  cobrancaGerada?: Cobranca;
}

export const EMPTY_CONFIG: Configuracoes = {
  telegram_token: '',
  telegram_chat_id: '',
};

export const dateUtils = {
  todayStr(): string {
    return new Date().toISOString().split('T')[0];
  },
  addDays(dateStr: string, days: number): string {
    const d = new Date(`${dateStr}T00:00:00`);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  },
  daysUntil(dateStr: string): number {
    const today = new Date(`${this.todayStr()}T00:00:00`).getTime();
    const target = new Date(`${dateStr}T00:00:00`).getTime();
    return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
  },
  formatBr(dateStr: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  },
};

export async function requireSessionUser() {
  const sessionUser = await getCurrentSessionUser();

  if (!sessionUser) {
    throw new Error('Sessao expirada. Faca login novamente.');
  }

  return sessionUser;
}

export function assertNoError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
}

export function mapLogRow(log: SystemLogRow): SystemLog {
  return {
    id: log.id,
    acao: log.acao,
    detalhe: log.detalhe,
    data: log.data,
    user: log.user_name,
  };
}

export function calculatePlanFields(baseValue: number, hasIndicator: boolean) {
  const plano: UserCopy['plano'] = baseValue < 1000 ? 'QUINZENAL' : 'SEMANAL';
  const percentual_cliente = baseValue < 1000 ? 70 : 80;
  const percentual_copy = baseValue < 1000 ? 30 : 20;
  const percentual_indicador = hasIndicator ? (baseValue < 1000 ? 15 : 10) : 0;
  const receita_empresa = percentual_copy - percentual_indicador;

  return {
    plano,
    percentual_cliente,
    percentual_copy,
    percentual_indicador,
    receita_empresa,
  };
}

export function buildBalanceHistory(
  userId: string,
  previousBalance: number,
  targetBalance: number
): HistoricoBanca {
  const difference = targetBalance - previousBalance;
  const growthPercent = parseFloat(((difference / previousBalance) * 100).toFixed(2));

  return {
    id: `hist-${Date.now()}`,
    user_id: userId,
    valor_anterior: previousBalance,
    valor_atual: targetBalance,
    lucro: difference,
    percentual: growthPercent,
    created_at: dateUtils.todayStr(),
  };
}
