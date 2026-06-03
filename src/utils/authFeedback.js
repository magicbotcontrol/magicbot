export const AUTH_FEEDBACK_STATUS = {
  idle: 'idle',
  submitting: 'submitting',
  success: 'success',
  blocked: 'blocked',
  error: 'error'
};

export function createAuthFeedback(status = AUTH_FEEDBACK_STATUS.idle, message = '') {
  return { status, message };
}

export function resolveAuthErrorFeedback(error, t) {
  const rawMessage = error?.message || error?.msg || '';
  const normalized = rawMessage.toLowerCase();

  if (normalized.includes('email rate limit exceeded')) {
    return createAuthFeedback(AUTH_FEEDBACK_STATUS.blocked, t.authSignupRateLimit);
  }

  if (normalized.includes('invalid login credentials')) {
    return createAuthFeedback(AUTH_FEEDBACK_STATUS.error, t.authInvalidCredentials);
  }

  return createAuthFeedback(AUTH_FEEDBACK_STATUS.error, rawMessage || t.authUnavailable);
}
