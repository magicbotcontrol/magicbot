import { Configuracoes, UserAuth } from '../../types';
import { getCurrentAuthProfile } from '../auth';
import { supabase } from '../supabase';
import { AppSettingsRow, assertNoError, EMPTY_CONFIG, requireSessionUser } from './shared';

export async function getConfig(): Promise<Configuracoes> {
  const sessionUser = await getCurrentAuthProfile();

  if (!sessionUser?.id) {
    return EMPTY_CONFIG;
  }

  const { data, error } = await supabase
    .from('app_settings')
    .select('owner_id, telegram_token, telegram_chat_id')
    .eq('owner_id', sessionUser.id)
    .maybeSingle<AppSettingsRow>();

  assertNoError(error);

  if (!data) {
    return EMPTY_CONFIG;
  }

  return {
    telegram_token: data.telegram_token || '',
    telegram_chat_id: data.telegram_chat_id || '',
  };
}

export async function saveConfig(data: Configuracoes) {
  const sessionUser = await requireSessionUser();

  const { error } = await supabase.from('app_settings').upsert(
    {
      owner_id: sessionUser.id,
      telegram_token: data.telegram_token,
      telegram_chat_id: data.telegram_chat_id,
    },
    { onConflict: 'owner_id' }
  );

  assertNoError(error);
}

export async function getAuth(): Promise<UserAuth | null> {
  return getCurrentAuthProfile();
}

export async function saveAuth(data: UserAuth) {
  const sessionUser = await requireSessionUser();
  const updates: {
    email?: string;
    data?: {
      nome: string;
      level: UserAuth['level'];
    };
  } = {
    data: {
      nome: data.nome,
      level: data.level,
    },
  };

  if (data.email && data.email !== sessionUser.email) {
    updates.email = data.email;
  }

  const { error: authError } = await supabase.auth.updateUser(updates);
  assertNoError(authError);

  const { error } = await supabase.from('profiles').upsert(
    {
      id: sessionUser.id,
      email: data.email || sessionUser.email || '',
      nome: data.nome,
      level: data.level,
    },
    { onConflict: 'id' }
  );

  assertNoError(error);
}
