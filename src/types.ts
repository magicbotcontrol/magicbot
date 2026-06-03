export interface Indicador {
  id: string;
  nome: string;
  email: string;
  telegram: string;
  whatsapp: string;
  percentual: number; // e.g., 15 for quinzenal, 10 for semanal (calculated based on rules, or custom)
  status: 'Ativo' | 'Inativo';
  codigo_interno: string;
  observacoes?: string;
}

export interface UserCopy {
  id: string;
  nome: string;
  email: string;
  whatsapp: string;
  telegram: string;
  iq_id: string; // 9 numbers
  indicador_id: string; // references Indicador.id
  owner_id?: string | null; // references auth.users.id (cliente autenticado)
  banca_inicial: number;
  banca_atual: number;
  plano: 'QUINZENAL' | 'SEMANAL';
  percentual_cliente: number; // 70 or 80
  percentual_copy: number; // 30 or 20
  percentual_indicador: number; // 15 or 10
  receita_empresa: number; // 15 or 10
  data_inicio: string;
  proxima_cobranca: string;
  status: 'Ativo' | 'Pendente' | 'Pausado' | 'Cancelado';
  link_cadastro_utilizado?: string;
  link_copy_utilizado?: string;
  created_at: string;
}

export interface Cobranca {
  id: string;
  user_id: string;
  valor_lucro: number; // Lucro gerado no ciclo
  valor_devido: number; // valor total cobrado do copy (20% ou 30% do lucro_gerado)
  status: 'Pendente' | 'Pago' | 'Atrasado';
  data_vencimento: string;
  data_pagamento?: string;
  percentual_copy: number; // 20 ou 30
  valor_indicador: number; // comissão do indicador (10% ou 15% do lucro)
  valor_empresa: number; // receita líquida da empresa (lucro restante)
}

export interface HistoricoBanca {
  id: string;
  user_id: string;
  valor_anterior: number;
  valor_atual: number;
  lucro: number;
  percentual: number;
  created_at: string;
}

export interface Configuracoes {
  telegram_token: string;
  telegram_chat_id: string;
}

export type AccessLevel = 'Admin' | 'Indicador' | 'Cliente' | 'Operador' | 'Financeiro';

export interface UserAuth {
  id?: string;
  email: string;
  nome: string;
  level: AccessLevel;
  indicador_id?: string | null;
}

export interface PlatformUserProfile {
  id: string;
  email: string;
  nome: string;
  level: AccessLevel;
  whatsapp?: string;
  indicador_id?: string | null;
  indicador_nome?: string | null;
  indicador_codigo_interno?: string | null;
  created_at?: string;
}

export interface SystemLog {
  id: string;
  acao: string;
  detalhe: string;
  data: string;
  user: string;
}
