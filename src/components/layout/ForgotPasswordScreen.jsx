import { Icons } from '../../constants/icons';
import { useState } from 'react';
import { AUTH_FEEDBACK_STATUS } from '../../utils/authFeedback';

export function ForgotPasswordScreen({ handleResetPassword, t, isAuthLoading, authFeedback, clearAuthFeedback, onBackToLogin }) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const feedbackTone =
    authFeedback.status === AUTH_FEEDBACK_STATUS.success
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : authFeedback.status === AUTH_FEEDBACK_STATUS.blocked
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : authFeedback.status === AUTH_FEEDBACK_STATUS.error
          ? 'border-red-200 bg-red-50 text-red-600'
          : 'border-[#FFD7B5] bg-[#FFF7F0] text-[#B45309]';

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await handleResetPassword(email);
      if (result?.ok) {
        setIsSuccess(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnterSubmit = (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    handleSubmit(event);
  };

  return (
    <div className="flex min-h-screen items-center justify-center font-sans bg-gray-50 p-4">
      <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-2xl max-w-md w-full space-y-6 text-center animate-fade-in">
        <div className="flex justify-center flex-col items-center">
          <Icons.Logo className="w-16 h-16 rounded-xl" />
          <h2 className="text-2xl font-black text-gray-900 mt-2 tracking-tight">
            MAGIC<span className="text-[#FF6B00]">BOT</span>
          </h2>
          <p className="text-sm text-gray-500 mt-1">{t.forgotPasswordTitle}</p>
        </div>

        {!isSuccess ? (
          <>
            <p className="text-sm text-gray-600 text-left">
              {t.forgotPasswordInstructions}
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="text-left">
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                  {t.email}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearAuthFeedback();
                  }}
                  onKeyDown={handleEnterSubmit}
                  placeholder="seu@email.com"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-[#FF6B00] focus:outline-none"
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || isAuthLoading}
                className="w-full py-3.5 bg-[#FF6B00] text-white font-bold text-sm rounded-xl shadow-lg shadow-[#FF6B00]/20 hover:bg-[#FF7F1F] transition-all disabled:opacity-60"
              >
                {isSubmitting ? t.sendingEmail : t.sendResetLink}
              </button>
            </form>

            {authFeedback.message ? (
              <div className={`rounded-2xl border px-4 py-3 text-sm font-medium text-left ${feedbackTone}`}>
                {authFeedback.message}
              </div>
            ) : null}
          </>
        ) : (
          <div className="space-y-5">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-left">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-emerald-800">{t.emailSentTitle}</h3>
              </div>
              <p className="text-sm text-emerald-700">
                {t.emailSentInstructions.replace('{email}', email)}
              </p>
              <p className="text-xs text-emerald-600 mt-3">
                {t.checkSpamFolder}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsSuccess(false);
                setEmail('');
                clearAuthFeedback();
              }}
              className="w-full py-3 bg-gray-100 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-200 transition-all"
            >
              {t.sendAnotherLink}
            </button>
          </div>
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

        <p className="text-xs text-gray-400">
          {t.forgotPasswordHint}
        </p>
      </div>
    </div>
  );
}
