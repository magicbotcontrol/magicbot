import { Icons } from '../../constants/icons';
import { useState } from 'react';
import { AUTH_FEEDBACK_STATUS } from '../../utils/authFeedback';

export function LoginScreen({ handleLogIn, t, isAuthLoading, isAuthSubmitting, authFeedback, clearAuthFeedback, onForgotPassword }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const [mode, setMode] = useState('signin');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');

  const feedbackTone =
    authFeedback.status === AUTH_FEEDBACK_STATUS.success
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : authFeedback.status === AUTH_FEEDBACK_STATUS.blocked
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : authFeedback.status === AUTH_FEEDBACK_STATUS.error
          ? 'border-red-200 bg-red-50 text-red-600'
          : 'border-[#FFD7B5] bg-[#FFF7F0] text-[#B45309]';

  const handleEnterSubmit = (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    handleSubmit(mode);
  };

  const handlePasswordKeyState = (event) => {
    setIsCapsLockOn(event.getModifierState('CapsLock'));
  };

  const handleSubmit = async (nextMode = mode) => {
    setMode(nextMode);

    if (!email.trim() || !password.trim()) {
      setValidationMessage(t.authEmailPasswordRequired);
      return;
    }

    setValidationMessage('');
    setIsSubmitting(true);
    try {
      await handleLogIn({
        email,
        password,
        mode: nextMode,
        referralCode: referralCode.trim().toUpperCase()
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center font-sans bg-gray-50 p-4">
      <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-2xl max-w-sm w-full space-y-6 text-center animate-fade-in">
        <div className="flex justify-center flex-col items-center">
          <Icons.Logo className="w-16 h-16 rounded-xl" />
          <h2 className="text-2xl font-black text-gray-900 mt-2 tracking-tight">
            MAGIC<span className="text-[#FF6B00]">BOT</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">{t.loginTagline}</p>
        </div>

        <div className="space-y-4 text-left">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{t.email}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setValidationMessage('');
                clearAuthFeedback();
              }}
              onKeyDown={handleEnterSubmit}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-[#FF6B00] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{t.password}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setValidationMessage('');
                  clearAuthFeedback();
                }}
                onKeyDown={(event) => {
                  handlePasswordKeyState(event);
                  handleEnterSubmit(event);
                }}
                onKeyUp={handlePasswordKeyState}
                onBlur={() => setIsCapsLockOn(false)}
                placeholder="........"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-xs focus:ring-1 focus:ring-[#FF6B00] focus:outline-none"
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
              <p className="mt-2 text-[11px] font-medium text-amber-600">{t.capsLockActive}</p>
            ) : null}
          </div>
          {mode === 'signup' ? (
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{t.referralCode}</label>
              <input
                type="text"
                value={referralCode}
                onChange={(e) => {
                  setReferralCode(e.target.value.toUpperCase());
                  setValidationMessage('');
                  clearAuthFeedback();
                }}
                onKeyDown={handleEnterSubmit}
                placeholder={t.referralCodePlaceholder}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-xs uppercase tracking-[0.08em] focus:ring-1 focus:ring-[#FF6B00] focus:outline-none"
              />
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || isAuthLoading || isAuthSubmitting}
            className="w-full py-3.5 bg-[#FF6B00] text-white font-bold text-xs rounded-xl shadow-lg shadow-[#FF6B00]/20 hover:bg-[#FF7F1F] transition-all disabled:opacity-60"
          >
            {t.loginAccess}
          </button>
          <button
            type="button"
            onClick={() => {
              handleSubmit('signup');
            }}
            disabled={isSubmitting || isAuthLoading || isAuthSubmitting}
            className="w-full py-3.5 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200 transition-all disabled:opacity-60"
          >
            {t.createAccount}
          </button>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-xs text-[#FF6B00] font-semibold hover:text-[#FF7F1F] transition-colors"
          >
            {t.forgotPasswordTitle}
          </button>
        </div>
        {authFeedback.message ? (
          <div className={`rounded-2xl border px-4 py-3 text-[11px] font-medium text-left ${feedbackTone}`}>
            {authFeedback.message}
          </div>
        ) : null}
        {validationMessage ? (
          <p className="text-[11px] font-medium text-red-500">{validationMessage}</p>
        ) : null}
        <p className="text-[11px] text-gray-400">
          {mode === 'signup' ? t.signupHint : t.loginHint}
        </p>
        <p className="text-[11px] text-gray-400">
          {t.referralProgramSignupHint}
        </p>
      </div>
    </div>
  );
}
