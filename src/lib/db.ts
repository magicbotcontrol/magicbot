import {
  addIndicator,
  addLog,
  addUser,
  billUserCycle,
  dateUtils,
  deleteCobranca,
  deleteIndicator,
  deleteUser,
  getAuth,
  getCobrancas,
  getConfig,
  getHistoricos,
  getIndicators,
  getLogs,
  getManageableProfiles,
  getUsers,
  promoteProfileToIndicator,
  recordBalanceUpdate,
  revertIndicatorToOperator,
  runDailyAutomations,
  saveAuth,
  saveConfig,
  triggerTelegramNotification,
  updateCobrancaStatus,
  updateIndicator,
  updateUser,
  upsertClientCopy,
  type NewUserInput,
} from './services';
import { Indicador, UserCopy, Configuracoes, UserAuth, PlatformUserProfile } from '../types';

export { dateUtils };

export class ControlCopyDB {
  static async getIndicators(): Promise<Indicador[]> {
    return getIndicators();
  }

  static async getUsers(): Promise<UserCopy[]> {
    return getUsers();
  }

  static async getCobrancas() {
    return getCobrancas();
  }

  static async getHistoricos() {
    return getHistoricos();
  }

  static async getConfig(): Promise<Configuracoes> {
    return getConfig();
  }

  static async getAuth(): Promise<UserAuth | null> {
    return getAuth();
  }

  static async getLogs() {
    return getLogs();
  }

  static async getManageableProfiles(): Promise<PlatformUserProfile[]> {
    return getManageableProfiles();
  }

  static async saveConfig(data: Configuracoes) {
    return saveConfig(data);
  }

  static async saveAuth(data: UserAuth) {
    return saveAuth(data);
  }

  static async addLog(acao: string, detalhe: string) {
    return addLog(acao, detalhe);
  }

  static async addIndicator(input: Omit<Indicador, 'id'>): Promise<Indicador> {
    return addIndicator(input);
  }

  static async updateIndicator(updated: Indicador) {
    return updateIndicator(updated);
  }

  static async deleteIndicator(id: string) {
    return deleteIndicator(id);
  }

  static async promoteProfileToIndicator(profileId: string, codigoInterno: string) {
    return promoteProfileToIndicator(profileId, codigoInterno);
  }

  static async revertIndicatorToOperator(profileId: string) {
    return revertIndicatorToOperator(profileId);
  }

  static async addUser(input: NewUserInput): Promise<{ success: boolean; message?: string; user?: UserCopy }> {
    return addUser(input);
  }

  static async updateUser(updated: UserCopy) {
    return updateUser(updated);
  }

  static async deleteUser(id: string) {
    return deleteUser(id);
  }

  static async recordBalanceUpdate(userId: string, targetBalance: number) {
    return recordBalanceUpdate(userId, targetBalance);
  }

  static async upsertClientCopy(input: {
    iq_id: string;
    banca_inicial: number;
    data_inicio: string;
    telegram?: string;
  }) {
    return upsertClientCopy(input);
  }

  static async billUserCycle(userId: string, profit: number) {
    return billUserCycle(userId, profit);
  }

  static async updateCobrancaStatus(cobrancaId: string, newStatus: 'Pendente' | 'Pago' | 'Atrasado') {
    return updateCobrancaStatus(cobrancaId, newStatus);
  }

  static async deleteCobranca(id: string) {
    return deleteCobranca(id);
  }

  static async triggerTelegramNotification(message: string): Promise<{ sent: boolean; error?: string }> {
    return triggerTelegramNotification(message);
  }

  static async runDailyAutomations(): Promise<{ countAlerts: number; updatedCharges: number }> {
    return runDailyAutomations();
  }
}
