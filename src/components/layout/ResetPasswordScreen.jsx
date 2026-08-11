import { Icons } from '../../constants/icons';
import { useEffect, useState } from 'react';
import { AUTH_FEEDBACK_STATUS } from '../../utils/authFeedback';

export function ResetPasswordScreen({ handleUpdatePassword, t, isAuthLoading, isRecoverySessionReady, authFeedback, clearAuthFeedback, onBackToLogin, onGoToForgotPassword }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  const isSuccess = authFeedback.status === AUTH_FEEDBACK_STATUS.success;

  useEffect(() => {
    if (!isSuccess) return undefined;
    const timer = setTimeout(() => {
      onBackToLogin();
    }, 1800);
    return () => clearTimeout(timer);
  }, [isSuccess, onBackToLogin]);

  const feedbackTone =
    authFeedback.status === AUTH_FEEDBACK_STATUS.success
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : authFeedback.status === AUTH_FEEDBACK_STATUS.blocked
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : authFeedback.status === AUTH_FEEDBACK_STATUS.error
          ? 'border-red-200 bg-red-50 text-red-600'
          : 'border-[#FFD7B5] bg-[#FFF7F0] text-[#B45309]';

  const validatePassword = () => {
    if (password.length < 6) {
      return t.passwordMinLength;
    }
    if (password !== confirmPassword) {
      return t.passwordsDoNotMatch;
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isRecoverySessionReady) {
      return;
    }

    const error = validatePassword();
    if (error) {
      setValidationError(error);
      return;
    }

    setValidationError('');
    setIsSubmitting(true);
    try {
      await handleUpdatePassword(password);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordKeyState = (event) => {
    setIsCapsLockOn(event.getModifierState('CapsLock'));
  };

  const handleEnterSubmit = (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    handleSubmit(event);
  };

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center font-sans bg-gray-50 p-4">
        <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-2xl max-w-md w-full space-y-6 text-center animate-fade-in">
          <div className="flex justify-center flex-col items-center">
            <Icons.Logo className="w-16 h-16 rounded-xl animate-pulse" />
            <h2 className="text-2xl font-black text-gray-900 mt-2 tracking-tight">
              MAGIC<span className="text-[#FF6B00]">BOT</span>
            </h2>
            <p className="text-sm text-gray-500 mt-3">{t.loadingSignals}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isRecoverySessionReady && !isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center font-sans bg-gray-50 p-4">
        <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-2xl max-w-md w-full space-y-6 text-center animate-fade-in">
          <div className="flex justify-center flex-col items-center">
            <Icons.Logo className="w-16 h-16 rounded-xl" />
            <h2 className="text-2xl font-black text-gray-900 mt-2 tracking-tight">
              MAGIC<span className="text-[#FF6B00]">BOT</span>
            </h2>
            <p className="text-sm text-gray-500 mt-1">{t.resetPasswordTitle}</p>
          </div>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-left">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-red-800">
                {t.linkInvalidTitle || 'Link inválido ou expirado'}
              </h3>
            </div>
            <p className="text-sm text-red-700 leading-relaxed">
              {t.linkInvalidDescription || 'Este link de redefinição de senha já foi utilizado, expirou ou é inválido. Solicite um novo link para continuar.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onGoToForgotPassword}
              className="w-full py-3.5 bg-[#FF6B00] text-white font-bold text-sm rounded-xl shadow-lg shadow-[#FF6B00]/20 hover:bg-[#FF7F1F] transition-all"
            >
              {t.sendResetLink || 'Solicitar novo link'}
            </button>
            <button
              type="button"
              onClick={onBackToLogin}
              className="w-full py-3.5 bg-gray-100 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-200 transition-all"
            >
              ← {t.backToLogin}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center font-sans bg-gray-50 p-4">
      <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-2xl max-w-md w-full space-y-6 text-center animate-fade-in">
        <div className="flex justify-center flex-col items-center">
          <Icons.Logo className="w-16 h-16 rounded-xl" />
          <h2 className="text-2xl font-black text-gray-900 mt-2 tracking-tight">
            MAGIC<span className="text-[#FF6B00]">BOT</span>
          </h2>
          <p className="text-sm text-gray-500 mt-1">{t.resetPasswordTitle}</p>
        </div>

        {isSuccess ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-left">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-emerald-600 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-emerald-800">{t.passwordUpdated}</h3>
                <p className="text-xs text-emerald-600 mt-0.5">
                  {t.redirectingToLogin || 'Redirecionando para o login...'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 text-left">
              {t.resetPasswordInstructions}
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="text-left">
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                  {t.newPassword}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setValidationError('');
                      clearAuthFeedback();
                    }}
                    onKeyDown={(event) => {
                      handlePasswordKeyState(event);
                      handleEnterSubmit(event);
                    }}
                    onKeyUp={handlePasswordKeyState}
                    onBlur={() => setIsCapsLockOn(false)}
                    placeholder="••••••••"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-[#FF6B00] focus:outline-none"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? t.hidePassword : t.showPassword}
                    title={showPassword ? t.hidePassword : t.showPassword}
                    className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-gray-400 transition-colors hover:text-[#FF6B00]"
                  >
                    {showPassword ? (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3l18 18" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.584 10.587A2 2 0 0012 14a2 2 0 001.414-.584" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.88 5.09A9.956 9.956 0 0112 4c5 0 9 4.5 9 8-1.003 1.88-2.34 3.443-3.91 4.57M6.228 6.228C4.017 7.574 2.313 9.61 1 12c2 3.5 6 8 11 8a10.96 10.96 0 004.772-1.228" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {isCapsLockOn ? (
                  <p className="mt-2 text-xs font-medium text-amber-600">{t.capsLockActive}</p>
                ) : null}
              </div>

              <div className="text-left">
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                  {t.confirmNewPassword}
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setValidationError('');
                      clearAuthFeedback();
                    }}
                    onKeyDown={handleEnterSubmit}
                    placeholder="••••••••"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-[#FF6B00] focus:outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((current) => !current)}
                    aria-label={showConfirmPassword ? t.hidePassword : t.showPassword}
                    title={showConfirmPassword ? t.hidePassword : t.showPassword}
                    className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-gray-400 transition-colors hover:text-[#FF6B00]"
                  >
                    {showConfirmPassword ? (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3l18 18" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.584 10.587A2 2 0 0012 14a2 2 0 001.414-.584" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.88 5.09A9.956 9.956 0 0112 4c5 0 9 4.5 9 8-1.003 1.88-2.34 3.443-3.91 4.57M6.228 6.228C4.017 7.574 2.313 9.61 1 12c2 3.5 6 8 11 8a10.96 10.96 0 004.772-1.228" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {validationError ? (
                <p className="text-sm font-medium text-red-500 text-left">{validationError}</p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting || isAuthLoading || !isRecoverySessionReady}
                className="w-full py-3.5 bg-[#FF6B00] text-white font-bold text-sm rounded-xl shadow-lg shadow-[#FF6B00]/20 hover:bg-[#FF7F1F] transition-all disabled:opacity-60"
              >
                {isSubmitting ? t.updatingPassword : t.updatePassword}
              </button>
            </form>

            {authFeedback.message ? (
              <div className={`rounded-2xl border px-4 py-3 text-sm font-medium text-left ${feedbackTone}`}>
                {authFeedback.message}
              </div>
            ) : null}
          </>
        )}

        <div className="pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onBackToLogin}
            className="text-sm text-[#FF6B00] font-semibold hover:text-[#FF7F1F] transition-colors"
          >
            ← {t.backToLogin}
          </button>
        </div>

        {!isSuccess ? (
          <p className="text-xs text-gray-400">
            {t.resetPasswordHint}
          </p>
        ) : null}
      </div>
    </div>
  );
}