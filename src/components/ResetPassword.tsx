import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { BRANDING } from '../branding';
import { completePasswordRecoveryFromUrl, updateCurrentUserPassword } from '../lib/auth';
import { APP_ROUTES, replaceBrowserPath } from '../lib/app-routes';
import SensitiveInputField from './SensitiveInputField';

interface ResetPasswordProps {
  onBackToLogin: () => void;
}

type ResetStatus = 'loading' | 'ready' | 'success' | 'error';

export default function ResetPassword({ onBackToLogin }: ResetPasswordProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState<ResetStatus>('loading');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const bootstrapRecovery = async () => {
      try {
        const hasRecoverySession = await completePasswordRecoveryFromUrl();

        if (!isMounted) {
          return;
        }

        if (!hasRecoverySession) {
          setStatus('error');
          setMessage('O link de redefinicao e invalido ou expirou. Solicite um novo e-mail.');
          return;
        }

        setStatus('ready');
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setStatus('error');
        setMessage(
          error instanceof Error
            ? error.message
            : 'Nao foi possivel validar o link de redefinicao.'
        );
      }
    };

    void bootstrapRecovery();

    return () => {
      isMounted = false;
    };
  }, []);

  const passwordHint = useMemo(() => {
    if (!password) {
      return 'Use pelo menos 6 caracteres.';
    }

    if (password.length < 6) {
      return 'A senha precisa ter no minimo 6 caracteres.';
    }

    if (confirmPassword && password !== confirmPassword) {
      return 'As senhas precisam ser identicas.';
    }

    return 'Senha pronta para ser atualizada.';
  }, [confirmPassword, password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (password.length < 6) {
      setStatus('error');
      setMessage('A nova senha precisa ter no minimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setStatus('error');
      setMessage('As duas senhas informadas nao conferem.');
      return;
    }

    try {
      setIsSubmitting(true);
      await updateCurrentUserPassword(password);
      setStatus('success');
      setMessage('Senha redefinida com sucesso. Voce ja pode voltar ao login.');
      window.setTimeout(() => {
        replaceBrowserPath(APP_ROUTES.home);
        onBackToLogin();
      }, 1200);
    } catch (error) {
      setStatus('error');
      setMessage(
        error instanceof Error ? error.message : 'Falha ao atualizar a senha agora.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="absolute top-10 left-10 h-72 w-72 rounded-full bg-[#FF5500]/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-[#FF5500]/5 blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-md space-y-6 overflow-hidden rounded-3xl border border-zinc-150 bg-white p-6 shadow-2xl xl:p-8"
      >
        <div className="space-y-1.5 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF5500] text-xl font-black text-black shadow-lg shadow-[#FF5500]/25">
            {BRANDING.shortName}
          </div>
          <h2 className="text-xl font-extrabold tracking-tight text-zinc-900">
            Redefinir <span className="text-[#FF5500]">Senha</span>
          </h2>
          <p className="text-xs font-medium text-zinc-400">
            Defina sua nova senha de acesso ao ControlCopy.
          </p>
        </div>

        {message && (
          <div
            className={`flex items-center gap-2 rounded-xl border p-3.5 text-xs font-semibold ${
              status === 'success'
                ? 'border-emerald-100 bg-emerald-50 text-emerald-800'
                : 'border-red-100 bg-red-50 text-red-800'
            }`}
          >
            {status === 'success' ? (
              <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4.5 w-4.5 text-red-600" />
            )}
            <span>{message}</span>
          </div>
        )}

        {status === 'loading' && (
          <div className="rounded-xl border border-zinc-150 bg-zinc-50 p-4 text-center text-xs font-semibold text-zinc-500">
            Validando link de redefinicao...
          </div>
        )}

        {(status === 'ready' || status === 'success' || status === 'error') && (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold text-zinc-700">
            <div>
              <label className="mb-1 block">Nova Senha *</label>
              <SensitiveInputField
                value={password}
                onChange={setPassword}
                revealed={showPassword}
                onToggleReveal={() => setShowPassword((current) => !current)}
                leftIcon={Lock}
                required
                minLength={6}
                placeholder="Minimo de 6 caracteres"
                disabled={status !== 'ready' || isSubmitting}
                ariaLabelReveal="Revelar senha"
                ariaLabelHide="Ocultar senha"
              />
            </div>

            <div>
              <label className="mb-1 block">Confirmar Nova Senha *</label>
              <SensitiveInputField
                value={confirmPassword}
                onChange={setConfirmPassword}
                revealed={showConfirmPassword}
                onToggleReveal={() => setShowConfirmPassword((current) => !current)}
                leftIcon={Lock}
                required
                minLength={6}
                placeholder="Repita a nova senha"
                disabled={status !== 'ready' || isSubmitting}
                ariaLabelReveal="Revelar confirmacao de senha"
                ariaLabelHide="Ocultar confirmacao de senha"
              />
            </div>

            <div className="rounded-xl border border-zinc-150 bg-zinc-50 px-3.5 py-3 text-[11px] leading-relaxed text-zinc-500">
              {passwordHint}
            </div>

            <button
              type="submit"
              disabled={status !== 'ready' || isSubmitting}
              className="flex w-full cursor-pointer items-center justify-center gap-1 rounded-xl bg-[#FF5500] py-3 text-xs font-black text-black shadow-md shadow-[#FF5500]/15 transition-all hover:bg-[#FF4500] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar Nova Senha'}
              <ArrowRight className="h-4 w-4 stroke-[3px] text-black" />
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  replaceBrowserPath(APP_ROUTES.home);
                  onBackToLogin();
                }}
                className="text-[11px] font-bold text-zinc-500 hover:text-zinc-900"
              >
                &larr; Voltar para Login
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
