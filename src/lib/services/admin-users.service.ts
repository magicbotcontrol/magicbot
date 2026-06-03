import { PlatformUserProfile } from '../../types';
import { supabase } from '../supabase';
import { assertNoError } from './shared';

function normalizeAdminRoleError(error: unknown, fallback: string) {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const message = error.message.toLowerCase();

  if (message.includes('admin_only')) {
    return 'Somente administradores podem executar esta ação.';
  }

  if (message.includes('codigo_interno_obrigatorio')) {
    return 'Informe o código interno do vendedor.';
  }

  if (message.includes('codigo_interno_em_uso')) {
    return 'Este código interno já está em uso por outro vendedor.';
  }

  if (message.includes('perfil_nao_encontrado')) {
    return 'Não foi possível localizar este usuário.';
  }

  if (message.includes('rpc')) {
    return 'A função administrativa ainda não está disponível no banco. Aplique o script do Supabase e tente novamente.';
  }

  return error.message || fallback;
}

export async function getManageableProfiles(): Promise<PlatformUserProfile[]> {
  try {
    const { data, error } = await supabase.rpc('admin_list_manageable_profiles');
    assertNoError(error);

    return ((data ?? []) as PlatformUserProfile[]).map((item) => ({
      ...item,
      level: item.level,
    }));
  } catch (error) {
    throw new Error(
      normalizeAdminRoleError(
        error,
        'Não foi possível carregar a lista administrativa de usuários agora.'
      )
    );
  }
}

export async function promoteProfileToIndicator(profileId: string, codigoInterno: string) {
  try {
    const normalizedCode = codigoInterno.trim().toUpperCase();

    const { data, error } = await supabase.rpc('admin_promote_profile_to_indicator', {
      p_profile_id: profileId,
      p_codigo_interno: normalizedCode,
    });

    assertNoError(error);
    return data;
  } catch (error) {
    throw new Error(
      normalizeAdminRoleError(error, 'Não foi possível transformar este usuário em vendedor agora.')
    );
  }
}

export async function revertIndicatorToOperator(profileId: string) {
  try {
    const { data, error } = await supabase.rpc('admin_revert_indicator_to_operator', {
      p_profile_id: profileId,
    });

    assertNoError(error);
    return data;
  } catch (error) {
    throw new Error(
      normalizeAdminRoleError(error, 'Não foi possível rebaixar este vendedor para usuário comum agora.')
    );
  }
}
