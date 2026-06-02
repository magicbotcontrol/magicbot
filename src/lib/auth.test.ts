import { describe, expect, it } from 'vitest';
import { classifyAuthRecoveryFailure } from './auth';

describe('classifyAuthRecoveryFailure', () => {
  it('classifica falhas de rede na recuperacao de sessao', () => {
    expect(classifyAuthRecoveryFailure('Failed to fetch auth session.', 'session')).toBe(
      'falha_rede'
    );
  });

  it('classifica credencial expirada na recuperacao da sessao', () => {
    expect(classifyAuthRecoveryFailure('refresh token expired', 'session')).toBe(
      'credencial_expirada'
    );
  });

  it('classifica inconsistencias de perfil quando a sessao existe, mas o perfil falha', () => {
    expect(classifyAuthRecoveryFailure('permission denied for relation profiles', 'profile')).toBe(
      'inconsistencia_perfil'
    );
  });

  it('mantem erro desconhecido quando nao encontra uma assinatura conhecida', () => {
    expect(classifyAuthRecoveryFailure('unexpected authentication branch', 'session')).toBe(
      'erro_desconhecido'
    );
  });
});
