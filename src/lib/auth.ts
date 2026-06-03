import { supabase } from './supabase';
import { AccessLevel, UserAuth } from '../types';
import { APP_ROUTES, buildAppUrl, replaceBrowserPath } from './app-routes';

interface SignUpInput {
  email: string;
  password: string;
  nome: string;
  level?: AccessLevel;
  indicadorCodigo?: string;
  whatsapp?: string;
}

const AUTH_STORAGE_KEY_PATTERN = /^sb-/;
const LEGACY_STORAGE_KEY_PATTERNS = [
  /^controlcopy/i,
  /^control-copy/i,
  /^magicbot/i,
  /^ai-studio/i,
];
const SESSION_RECOVERY_ERROR_PATTERN = /refresh token|invalid|jwt|session|storage|token|timeout|expired/i;
const PROFILE_RECOVERY_ERROR_PATTERN = /refresh token|invalid|jwt|session|storage|token|timeout|expired|network|fetch|auth/i;
const NETWORK_RECOVERY_ERROR_PATTERN = /network|fetch|load failed|offline|network request failed/i;
const EXPIRED_CREDENTIAL_ERROR_PATTERN = /refresh token|invalid|jwt|token|timeout|expired/i;
const SESSION_EXPIRED_NOTICE = 'Sua sessão expirou. Entre novamente.';
let pendingAuthNotice: string | null = null;

type AuthRecoveryStage = 'session' | 'profile';
type AuthRecoveryCause =
  | 'credencial_expirada'
  | 'falha_rede'
  | 'inconsistencia_perfil'
  | 'erro_desconhecido';

function removeStoredKeys(patterns: RegExp[]) {
  if (typeof window === 'undefined') {
    return;
  }

  [window.localStorage, window.sessionStorage].forEach((storage) => {
    const keysToRemove: string[] = [];

    for (let index = 0; index < storage.length; index += 1) {
      const currentKey = storage.key(index);

      if (currentKey && patterns.some((pattern) => pattern.test(currentKey))) {
        keysToRemove.push(currentKey);
      }
    }

    keysToRemove.forEach((key) => storage.removeItem(key));
  });
}

function clearStoredSupabaseSession() {
  removeStoredKeys([AUTH_STORAGE_KEY_PATTERN]);
}

export function clearLegacyBrowserStorage() {
  removeStoredKeys(LEGACY_STORAGE_KEY_PATTERNS);
}

function registerAuthNotice(message: string) {
  pendingAuthNotice = message;
}

export function consumeAuthNotice() {
  const currentNotice = pendingAuthNotice;
  pendingAuthNotice = null;
  return currentNotice;
}

export function classifyAuthRecoveryFailure(
  message: string,
  stage: AuthRecoveryStage
): AuthRecoveryCause {
  if (NETWORK_RECOVERY_ERROR_PATTERN.test(message)) {
    return 'falha_rede';
  }

  if (EXPIRED_CREDENTIAL_ERROR_PATTERN.test(message)) {
    return 'credencial_expirada';
  }

  if (stage === 'profile') {
    return 'inconsistencia_perfil';
  }

  return 'erro_desconhecido';
}

function buildAuthRecoveryTelemetryDetail(
  stage: AuthRecoveryStage,
  cause: AuthRecoveryCause,
  message: string
) {
  const stageLabel = stage === 'session' ? 'restauracao_sessao' : 'restauracao_perfil';
  return `Etapa: ${stageLabel}. Causa: ${cause}. Mensagem: ${message}`;
}

async function recordAuthRecoveryTelemetry(
  stage: AuthRecoveryStage,
  error: unknown,
  sessionUser?: {
    email?: string | null;
    user_metadata?: Record<string, unknown>;
  } | null
) {
  const message =
    error instanceof Error && error.message
      ? error.message
      : 'Falha desconhecida ao recuperar autenticacao.';
  const cause = classifyAuthRecoveryFailure(message, stage);
  const userName = String(
    sessionUser?.user_metadata?.nome || sessionUser?.email || 'Sistema/Auth'
  );
  const payload = {
    id: `auth-log-${Date.now()}`,
    acao: 'Auth: Sessao Descartada',
    detalhe: buildAuthRecoveryTelemetryDetail(stage, cause, message),
    data: new Date().toISOString().split('T')[0],
    user_name: userName,
  };

  try {
    const { error: logError } = await withTimeout(
      supabase.from('app_logs').insert(payload),
      1500,
      'Auth telemetry timeout.'
    );

    if (logError) {
      throw logError;
    }
  } catch (logError) {
    console.warn('Falha ao registrar telemetria de autenticacao.', logError);
  }
}

async function signOutLocally() {
  try {
    await withTimeout(
      supabase.auth.signOut({ scope: 'local' }),
      1500,
      'Local sign out timeout while clearing session.'
    );
  } catch {
    // Segue com limpeza local mesmo que o cliente não consiga invalidar a sessão remota.
  }

  clearStoredSupabaseSession();
}

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);

    Promise.resolve(promise)
      .then((result) => {
        window.clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });
}

async function getSessionWithTimeout(timeoutMs = 4000) {
  return withTimeout(
    supabase.auth.getSession(),
    timeoutMs,
    'Session timeout while restoring auth state.'
  );
}

function normalizeUserAuth(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): UserAuth {
  return {
    id: user.id,
    email: user.email || '',
    nome: String(user.user_metadata?.nome || user.email?.split('@')[0] || 'Operador'),
    level: (user.user_metadata?.level as AccessLevel) || 'Cliente',
    indicador_id: (user.user_metadata?.indicador_id as string) || null,
  };
}

export async function getCurrentSessionUser() {
  try {
    const {
      data: { session },
      error,
    } = await getSessionWithTimeout();

    if (error) {
      throw error;
    }

    return session?.user ?? null;
  } catch (error) {
    if (error instanceof Error && SESSION_RECOVERY_ERROR_PATTERN.test(error.message)) {
      await recordAuthRecoveryTelemetry('session', error);
      registerAuthNotice(SESSION_EXPIRED_NOTICE);
      await signOutLocally();
      return null;
    }

    throw error;
  }
}

async function resolveAuthProfileFromSessionUser(sessionUser: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): Promise<UserAuth | null> {
  try {
    const { data, error } = await withTimeout(
      supabase
        .from('profiles')
        .select('id, email, nome, level, indicador_id')
        .eq('id', sessionUser.id)
        .maybeSingle(),
      4000,
      'Profile timeout while restoring auth state.'
    );

    if (error) {
      throw error;
    }

    if (!data) {
      return normalizeUserAuth(sessionUser);
    }

    return {
      id: data.id,
      email: data.email,
      nome: data.nome,
      level: data.level as AccessLevel,
      indicador_id: (data as { indicador_id?: string | null }).indicador_id ?? null,
    };
  } catch (error) {
    if (error instanceof Error && PROFILE_RECOVERY_ERROR_PATTERN.test(error.message)) {
      console.warn('Falha ao restaurar perfil autenticado. Limpando sessão local.', error.message);
      await recordAuthRecoveryTelemetry('profile', error, sessionUser);
      registerAuthNotice(SESSION_EXPIRED_NOTICE);
      await signOutLocally();
      return null;
    }

    throw error;
  }
}

export async function getCurrentAuthProfile(): Promise<UserAuth | null> {
  const sessionUser = await getCurrentSessionUser();

  if (!sessionUser) {
    return null;
  }

  return resolveAuthProfileFromSessionUser(sessionUser);
}

export async function signInWithEmail(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
  }

  return getCurrentAuthProfile();
}

export async function signUpWithEmail(input: SignUpInput) {
  const desiredLevel = input.level ?? 'Cliente';

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: buildAppUrl(APP_ROUTES.home),
      data: {
        nome: input.nome,
        level: desiredLevel,
        indicador_codigo: input.indicadorCodigo,
        whatsapp: input.whatsapp,
      },
    },
  });

  if (error) {
    throw error;
  }

  return {
    user: data.user,
    session: data.session,
  };
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: buildAppUrl(APP_ROUTES.resetPassword),
  });

  if (error) {
    throw error;
  }
}

export async function completePasswordRecoveryFromUrl() {
  if (typeof window === 'undefined') {
    return false;
  }

  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const query = new URLSearchParams(window.location.search);

  const accessToken = hash.get('access_token') || query.get('access_token');
  const refreshToken = hash.get('refresh_token') || query.get('refresh_token');
  const type = hash.get('type') || query.get('type');
  const code = query.get('code');

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      throw error;
    }
    return true;
  }

  if (type !== 'recovery' || !accessToken || !refreshToken) {
    return false;
  }

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    throw error;
  }

  replaceBrowserPath(APP_ROUTES.resetPassword);
  return true;
}

export async function updateCurrentUserPassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    throw error;
  }
}

export async function signOutCurrentUser() {
  await signOutLocally();
}

function scheduleAuthStateResolution(task: () => void) {
  if (typeof window === 'undefined') {
    task();
    return;
  }

  window.setTimeout(task, 0);
}

export function subscribeToAuthChanges(callback: (auth: UserAuth | null) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    scheduleAuthStateResolution(() => {
      if (!session?.user) {
        callback(null);
        return;
      }

      void resolveAuthProfileFromSessionUser(session.user)
        .then((profile) => callback(profile))
        .catch(() => {
          callback(normalizeUserAuth(session.user));
        });
    });
  });
}
