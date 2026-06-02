import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Cobranca, UserCopy } from '../../types';

const mocks = vi.hoisted(() => ({
  fromMock: vi.fn(),
  getUsersMock: vi.fn(),
  getIndicatorsMock: vi.fn(),
  addLogMock: vi.fn(),
  triggerTelegramNotificationMock: vi.fn(),
}));

vi.mock('../supabase', () => ({
  supabase: {
    from: mocks.fromMock,
  },
}));

vi.mock('./users.service', () => ({
  getUsers: mocks.getUsersMock,
}));

vi.mock('./indicators.service', () => ({
  getIndicators: mocks.getIndicatorsMock,
}));

vi.mock('./logs.service', () => ({
  addLog: mocks.addLogMock,
}));

vi.mock('./notifications.service', () => ({
  triggerTelegramNotification: mocks.triggerTelegramNotificationMock,
}));

import {
  billUserCycle,
  buildPendingCobranca,
  calculateBillingBreakdown,
  updateCobrancaStatus,
} from './billing.service';

function createBillingUser(overrides: Partial<UserCopy> = {}): UserCopy {
  return {
    id: 'usr-1',
    nome: 'Cliente Billing',
    email: 'billing@example.com',
    whatsapp: '11999999999',
    telegram: '@billing',
    iq_id: '123456789',
    indicador_id: 'ind-1',
    banca_inicial: 1500,
    banca_atual: 1500,
    plano: 'SEMANAL',
    percentual_cliente: 80,
    percentual_copy: 20,
    percentual_indicador: 10,
    receita_empresa: 10,
    data_inicio: '2026-05-01',
    proxima_cobranca: '2026-05-08',
    status: 'Ativo',
    created_at: '2026-05-01',
    ...overrides,
  };
}

describe('billing.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-29T12:00:00Z'));
    mocks.getUsersMock.mockResolvedValue([createBillingUser()]);
    mocks.getIndicatorsMock.mockResolvedValue([{ id: 'ind-1', nome: 'Indicador 1' }]);
    mocks.addLogMock.mockResolvedValue(undefined);
    mocks.triggerTelegramNotificationMock.mockResolvedValue({ sent: true });
  });

  it('calcula valores de cobranca e repasse corretamente', () => {
    const breakdown = calculateBillingBreakdown(800, {
      percentual_copy: 20,
      percentual_indicador: 10,
    });

    expect(breakdown).toEqual({
      valor_devido: 160,
      valor_indicador: 80,
      valor_empresa: 80,
    });
  });

  it('monta cobranca pendente com vencimento em 3 dias', () => {
    const cobranca = buildPendingCobranca(
      'usr-1',
      800,
      { percentual_copy: 20, percentual_indicador: 10 },
      'cob-test'
    );

    expect(cobranca).toEqual({
      id: 'cob-test',
      user_id: 'usr-1',
      valor_lucro: 800,
      valor_devido: 160,
      status: 'Pendente',
      data_vencimento: '2026-06-01',
      percentual_copy: 20,
      valor_indicador: 80,
      valor_empresa: 80,
    });
  });

  it('gera cobranca, atualiza proxima cobranca e dispara notificacao', async () => {
    const insertedCobranca: Cobranca = {
      id: 'cob-test',
      user_id: 'usr-1',
      valor_lucro: 800,
      valor_devido: 160,
      status: 'Pendente',
      data_vencimento: '2026-06-01',
      percentual_copy: 20,
      valor_indicador: 80,
      valor_empresa: 80,
    };

    const singleMock = vi.fn().mockResolvedValue({ data: insertedCobranca, error: null });
    const selectMock = vi.fn(() => ({ single: singleMock }));
    const insertMock = vi.fn(() => ({ select: selectMock }));
    const updateEqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn(() => ({ eq: updateEqMock }));

    mocks.fromMock.mockImplementation((table: string) => {
      if (table === 'cobrancas') {
        return {
          insert: insertMock,
        };
      }

      if (table === 'users_copy') {
        return {
          update: updateMock,
        };
      }

      throw new Error(`Tabela não mockada: ${table}`);
    });

    const result = await billUserCycle('usr-1', 800);

    expect(result).toEqual(insertedCobranca);
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'usr-1',
        valor_devido: 160,
        valor_indicador: 80,
        valor_empresa: 80,
      })
    );
    expect(updateMock).toHaveBeenCalledWith({ proxima_cobranca: '2026-06-05' });
    expect(updateEqMock).toHaveBeenCalledWith('id', 'usr-1');
    expect(mocks.addLogMock).toHaveBeenCalledWith(
      'Geração de Cobrança',
      'Fatura de $160 gerada para Cliente Billing (Lucro: $800)'
    );
    expect(mocks.triggerTelegramNotificationMock).toHaveBeenCalledWith(
      expect.stringContaining('Valor Devido (20%):* $160')
    );
  });

  it('nao gera cobranca para lucro zero ou negativo', async () => {
    const result = await billUserCycle('usr-1', 0);

    expect(result).toBeNull();
    expect(mocks.fromMock).not.toHaveBeenCalled();
    expect(mocks.addLogMock).not.toHaveBeenCalled();
    expect(mocks.triggerTelegramNotificationMock).not.toHaveBeenCalled();
  });

  it('nao gera cobranca quando o usuario nao existe', async () => {
    mocks.getUsersMock.mockResolvedValue([]);

    const result = await billUserCycle('usr-ausente', 500);

    expect(result).toBeNull();
    expect(mocks.fromMock).not.toHaveBeenCalled();
    expect(mocks.addLogMock).not.toHaveBeenCalled();
    expect(mocks.triggerTelegramNotificationMock).not.toHaveBeenCalled();
  });

  it('marca cobranca como paga e envia notificacao de pagamento', async () => {
    const selectOrderMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'cob-1',
          user_id: 'usr-1',
          valor_lucro: 800,
          valor_devido: 160,
          status: 'Pendente',
          data_vencimento: '2026-06-01',
          percentual_copy: 20,
          valor_indicador: 80,
          valor_empresa: 80,
        },
      ],
      error: null,
    });
    const updateEqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn(() => ({ eq: updateEqMock }));

    mocks.fromMock.mockImplementation((table: string) => {
      if (table === 'cobrancas') {
        return {
          select: () => ({ order: selectOrderMock }),
          update: updateMock,
        };
      }

      throw new Error(`Tabela não mockada: ${table}`);
    });

    await updateCobrancaStatus('cob-1', 'Pago');

    expect(updateMock).toHaveBeenCalledWith({
      status: 'Pago',
      data_pagamento: '2026-05-29',
    });
    expect(updateEqMock).toHaveBeenCalledWith('id', 'cob-1');
    expect(mocks.addLogMock).toHaveBeenCalledWith(
      'Pagamento de Fatura',
      'Cobrança de Cliente Billing no valor de $160 marcada como PAGO'
    );
    expect(mocks.triggerTelegramNotificationMock).toHaveBeenCalledWith(
      expect.stringContaining('Pagamento Confirmado!')
    );
  });

  it('marca cobranca como atrasada sem enviar notificacao de pagamento', async () => {
    const selectOrderMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'cob-2',
          user_id: 'usr-1',
          valor_lucro: 400,
          valor_devido: 80,
          status: 'Pendente',
          data_vencimento: '2026-05-28',
          percentual_copy: 20,
          valor_indicador: 40,
          valor_empresa: 40,
        },
      ],
      error: null,
    });
    const updateEqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn(() => ({ eq: updateEqMock }));

    mocks.fromMock.mockImplementation((table: string) => {
      if (table === 'cobrancas') {
        return {
          select: () => ({ order: selectOrderMock }),
          update: updateMock,
        };
      }

      throw new Error(`Tabela não mockada: ${table}`);
    });

    await updateCobrancaStatus('cob-2', 'Atrasado');

    expect(updateMock).toHaveBeenCalledWith({
      status: 'Atrasado',
      data_pagamento: undefined,
    });
    expect(mocks.addLogMock).toHaveBeenCalledWith(
      'Fatura Atualizada',
      'Cobrança ID cob-2 marcada como Atrasado'
    );
    expect(mocks.triggerTelegramNotificationMock).not.toHaveBeenCalled();
  });

  it('propaga erro quando o insert da cobranca falha no supabase', async () => {
    const singleMock = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'insert cobrancas failed' },
    });
    const selectMock = vi.fn(() => ({ single: singleMock }));
    const insertMock = vi.fn(() => ({ select: selectMock }));

    mocks.fromMock.mockImplementation((table: string) => {
      if (table === 'cobrancas') {
        return {
          insert: insertMock,
        };
      }

      if (table === 'users_copy') {
        return {
          update: vi.fn(() => ({ eq: vi.fn() })),
        };
      }

      throw new Error(`Tabela não mockada: ${table}`);
    });

    await expect(billUserCycle('usr-1', 800)).rejects.toThrow('insert cobrancas failed');
    expect(mocks.addLogMock).not.toHaveBeenCalled();
    expect(mocks.triggerTelegramNotificationMock).not.toHaveBeenCalled();
  });

  it('propaga erro quando o insert funciona mas o update da proxima cobranca falha', async () => {
    const insertedCobranca: Cobranca = {
      id: 'cob-parcial',
      user_id: 'usr-1',
      valor_lucro: 800,
      valor_devido: 160,
      status: 'Pendente',
      data_vencimento: '2026-06-01',
      percentual_copy: 20,
      valor_indicador: 80,
      valor_empresa: 80,
    };
    const singleMock = vi.fn().mockResolvedValue({ data: insertedCobranca, error: null });
    const selectMock = vi.fn(() => ({ single: singleMock }));
    const insertMock = vi.fn(() => ({ select: selectMock }));
    const updateEqMock = vi.fn().mockResolvedValue({
      error: { message: 'update users_copy failed' },
    });
    const updateMock = vi.fn(() => ({ eq: updateEqMock }));

    mocks.fromMock.mockImplementation((table: string) => {
      if (table === 'cobrancas') {
        return {
          insert: insertMock,
        };
      }

      if (table === 'users_copy') {
        return {
          update: updateMock,
        };
      }

      throw new Error(`Tabela não mockada: ${table}`);
    });

    await expect(billUserCycle('usr-1', 800)).rejects.toThrow('update users_copy failed');
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledWith({ proxima_cobranca: '2026-06-05' });
    expect(mocks.addLogMock).not.toHaveBeenCalled();
    expect(mocks.triggerTelegramNotificationMock).not.toHaveBeenCalled();
  });

  it('propaga erro quando o update de status da cobranca falha no supabase', async () => {
    const selectOrderMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'cob-erro',
          user_id: 'usr-1',
          valor_lucro: 500,
          valor_devido: 100,
          status: 'Pendente',
          data_vencimento: '2026-05-30',
          percentual_copy: 20,
          valor_indicador: 50,
          valor_empresa: 50,
        },
      ],
      error: null,
    });
    const updateEqMock = vi.fn().mockResolvedValue({
      error: { message: 'update cobrancas failed' },
    });
    const updateMock = vi.fn(() => ({ eq: updateEqMock }));

    mocks.fromMock.mockImplementation((table: string) => {
      if (table === 'cobrancas') {
        return {
          select: () => ({ order: selectOrderMock }),
          update: updateMock,
        };
      }

      throw new Error(`Tabela não mockada: ${table}`);
    });

    await expect(updateCobrancaStatus('cob-erro', 'Pago')).rejects.toThrow('update cobrancas failed');
    expect(mocks.addLogMock).not.toHaveBeenCalled();
    expect(mocks.triggerTelegramNotificationMock).not.toHaveBeenCalled();
  });
});
