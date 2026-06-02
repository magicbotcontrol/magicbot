import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, ArrowRight, Lock, Mail, Phone, User } from 'lucide-react';
import { BRANDING } from '@/branding';
import { signUpWithEmail, signInWithEmail } from '../lib/auth';

interface PublicClientSignupProps {
  indicatorCode: string;
  onSuccess: () => void;
}

function normalizeIndicatorCode(value: string) {
  return value.trim().toUpperCase();
}

export default function PublicClientSignup({ indicatorCode, onSuccess }: PublicClientSignupProps) {
  const normalizedCode = useMemo(() => normalizeIndicatorCode(indicatorCode), [indicatorCode]);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlertMsg(null);

    if (!nome || !email || !whatsapp || !password) {
      setAlertMsg({ type: 'error', text: 'Preencha nome, e-mail, WhatsApp e senha.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const { session } = await signUpWithEmail({
        email,
        password,
        nome,
        whatsapp,
        level: 'Cliente',
        indicadorCodigo: normalizedCode,
      });

      if (!session) {
        setAlertMsg({
          type: 'success',
          text: 'Cadastro criado. Se o projeto exigir confirmação por e-mail, confirme sua conta antes de entrar.',
        });
        return;
      }

      await signInWithEmail(email, password);
      onSuccess();
    } catch (error) {
      setAlertMsg({
        type: 'error',
        text: error instanceof Error ? error.message : 'Falha ao criar a conta.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-zinc-50 flex items-center justify-center p-4">
      <div className="absolute top-10 left-10 w-72 h-72 bg-[#FF5500]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#FF5500]/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md bg-white border border-zinc-150 rounded-3xl overflow-hidden shadow-2xl p-6 xl:p-8 space-y-5 relative"
      >
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 bg-[#FF5500] text-black rounded-2xl flex items-center justify-center mx-auto font-black text-xl shadow-lg shadow-[#FF5500]/25">
            {BRANDING.shortName}
          </div>
          <h2 className="text-xl font-extrabold text-zinc-900 tracking-tight">
            {BRANDING.wordmark.prefix}
            <span className="text-[#FF5500]">{BRANDING.wordmark.accent}</span>
          </h2>
          <p className="text-[11px] text-zinc-500 font-semibold">
            Cadastro de cliente via parceiro <span className="font-mono font-black text-zinc-900">{normalizedCode}</span>
          </p>
        </div>

        {alertMsg && (
          <div
            className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              alertMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                : 'bg-red-50 text-red-800 border border-red-100'
            }`}
          >
            <AlertCircle
              className={`w-4.5 h-4.5 ${alertMsg.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}
            />
            <span>{alertMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold text-zinc-700">
          <div>
            <label className="block mb-1">Nome Completo *</label>
            <div className="relative">
              <User className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full pl-9 pr-3 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-[#FF5500]"
              />
            </div>
          </div>

          <div>
            <label className="block mb-1">E-mail *</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-[#FF5500]"
              />
            </div>
          </div>

          <div>
            <label className="block mb-1">WhatsApp *</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
              <input
                type="text"
                required
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full pl-9 pr-3 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-[#FF5500] font-mono"
                placeholder="Ex.: 11999998888"
              />
            </div>
          </div>

          <div>
            <label className="block mb-1">Senha *</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-[#FF5500]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-[#FF5500] hover:bg-[#FF4500] text-black rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1 shadow-md shadow-[#FF5500]/15 cursor-pointer"
          >
            {isSubmitting ? 'Criando...' : 'Criar minha conta'}
            <ArrowRight className="w-4 h-4 text-black stroke-[3px]" />
          </button>

          <p className="text-[11px] text-zinc-400 font-medium text-center">
            Após entrar, siga o passo a passo em <span className="font-bold text-zinc-800">Links</span> para conectar seu IQ ID.
          </p>
        </form>
      </motion.div>
    </div>
  );
}

