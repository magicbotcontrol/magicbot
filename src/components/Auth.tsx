import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  Mail, 
  User, 
  Lock, 
  Eye,
  EyeOff,
  ArrowRight, 
  CheckCircle2, 
  AlertCircle
} from 'lucide-react';
import { BRANDING } from '../branding';
import { UserAuth } from '../types';
import { ControlCopyDB } from '../lib/db';
import { getCurrentAuthProfile, sendPasswordReset, signInWithEmail, signUpWithEmail } from '../lib/auth';

interface AuthProps {
  onLoginSuccess: (auth: UserAuth) => void;
  sessionNotice?: string | null;
}

export default function Auth({ onLoginSuccess, sessionNotice }: AuthProps) {
  const defaultRegisterLevel = 'Operador' as const;
  const [screen, setScreen] = useState<'login' | 'register' | 'recover'>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [regNome, setRegNome] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  const [recEmail, setRecEmail] = useState('');
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (!sessionNotice) {
      return;
    }

    setAlertMsg({ type: 'error', text: sessionNotice });
    setScreen('login');
  }, [sessionNotice]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setAlertMsg({ type: 'error', text: 'Por favor preencha seu e-mail cadastrado.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const authData = await signInWithEmail(email, password);

      if (!authData) {
        throw new Error('Nao foi possivel recuperar o perfil do usuario autenticado.');
      }

      await ControlCopyDB.addLog('Login Realizado', `Sessão iniciada como ${authData.level}: ${authData.nome}`);
      onLoginSuccess(authData);
    } catch (error) {
      setAlertMsg({
        type: 'error',
        text: error instanceof Error ? error.message : 'Falha ao autenticar no Supabase.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNome || !regEmail || !regPassword) {
      setAlertMsg({ type: 'error', text: 'Preencha todos os campos obrigatórios.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const { session } = await signUpWithEmail({
        email: regEmail,
        password: regPassword,
        nome: regNome,
        level: defaultRegisterLevel,
      });

      if (!session) {
        setAlertMsg({
          type: 'success',
          text: 'Cadastro realizado. Se o projeto exigir confirmação por e-mail, confirme sua conta antes de entrar.',
        });
        setScreen('login');
        return;
      }

      const authData = await getCurrentAuthProfile();

      if (!authData) {
        throw new Error('Usuario criado, mas o perfil nao foi carregado corretamente.');
      }

      await ControlCopyDB.addLog('Cadastro Administrativo', `Novo operador registrado e logado: ${regNome}`);
      setAlertMsg({ type: 'success', text: 'Registro administrativo concluido com sucesso!' });
      setTimeout(() => onLoginSuccess(authData), 800);
    } catch (error) {
      setAlertMsg({
        type: 'error',
        text: error instanceof Error ? error.message : 'Falha ao criar a conta no Supabase.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recEmail) {
      setAlertMsg({ type: 'error', text: 'Preencha o e-mail de recuperação.' });
      return;
    }

    try {
      setIsSubmitting(true);
      await sendPasswordReset(recEmail);
      setAlertMsg({
        type: 'success',
        text: `Solicitacao de redefinicao registrada para ${recEmail}. Verifique caixa de entrada, spam e lixo eletronico.`,
      });

      setTimeout(() => {
        setScreen('login');
        setAlertMsg(null);
      }, 4500);
    } catch (error) {
      setAlertMsg({
        type: 'error',
        text: error instanceof Error ? error.message : 'Falha ao enviar a recuperacao de senha.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      {/* Background soft blobs for fintech aesthetics */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-[#FF5500]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#FF5500]/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white border border-zinc-150 rounded-3xl overflow-hidden shadow-2xl p-6 xl:p-8 space-y-6 relative"
      >
        {/* App Logo Header */}
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 bg-[#FF5500] text-black rounded-2xl flex items-center justify-center mx-auto font-black text-xl shadow-lg shadow-[#FF5500]/25">
            {BRANDING.shortName}
          </div>
          <h2 className="text-xl font-extrabold text-zinc-900 tracking-tight">
            {BRANDING.wordmark.prefix}<span className="text-[#FF5500]">{BRANDING.wordmark.accent}</span>
          </h2>
          <p className="text-xs text-zinc-400 font-medium">{BRANDING.loginDescription}</p>
        </div>

        {alertMsg && (
          <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            alertMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-red-50 text-red-800 border border-red-100'
          }`}>
            {alertMsg.type === 'success' ? <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" /> : <AlertCircle className="w-4.5 h-4.5 text-red-600" />}
            <span>{alertMsg.text}</span>
          </div>
        )}

        {/* 1. LOGIN SCREEN */}
        {screen === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4 text-xs font-semibold text-zinc-700">
            <div>
              <label className="block mb-1">E-mail Administrativo *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-[#FF5500]"
                  placeholder="E.g. aline@controlcopy.com"
                />
              </div>
            </div>

            <div>
              <label className="block mb-1">Senha de Acesso</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-[#FF5500]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-700 transition-colors"
                  aria-label={showPassword ? 'Ocultar senha' : 'Revelar senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center text-[11px] pt-1">
              <button 
                type="button" 
                onClick={() => { setScreen('recover'); setAlertMsg(null); }}
                className="text-zinc-500 hover:text-[#FF5500] transition"
              >
                Esqueceu sua senha?
              </button>
            </div>

            <button
              type="submit"
                disabled={isSubmitting}
              className="w-full py-3 bg-[#FF5500] hover:bg-[#FF4500] text-black rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1 shadow-md shadow-[#FF5500]/15 cursor-pointer"
            >
              {isSubmitting ? 'Entrando...' : BRANDING.loginCta}
              <ArrowRight className="w-4 h-4 text-black stroke-[3px]" />
            </button>

            <div className="text-center pt-2">
              <p className="text-[11px] text-zinc-400 font-medium">
                Novo por aqui?{' '}
                <button 
                  type="button" 
                  onClick={() => { setScreen('register'); setAlertMsg(null); }}
                  className="text-zinc-950 font-bold hover:underline"
                >
                  Cadastre sua plataforma SaaS
                </button>
              </p>
            </div>
          </form>
        )}

        {/* 2. REGISTER SCREEN */}
        {screen === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4 text-xs font-semibold text-zinc-700">
            <div>
              <label className="block mb-1">Nome Completo *</label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  required
                  value={regNome}
                  onChange={(e) => setRegNome(e.target.value)}
                  placeholder="E.g. Aline Evangelista"
                  className="w-full pl-9 pr-3 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block mb-1">E-mail Corporativo *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="aline@corporativo.com"
                  className="w-full pl-9 pr-3 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block mb-1">Senha de Acesso *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Minimo de 6 caracteres"
                  className="w-full pl-9 pr-10 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword((current) => !current)}
                  className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-700 transition-colors"
                  aria-label={showRegPassword ? 'Ocultar senha' : 'Revelar senha'}
                >
                  {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-150 bg-zinc-50 px-3.5 py-3 text-[11px] text-zinc-500 leading-relaxed">
              <span className="block font-bold text-zinc-700 mb-1">Nível de acesso</span>
              <span>
                O acesso inicial é criado como <strong className="text-zinc-900">Operador</strong>. Perfis
                administrativos e financeiros ficam sob gestão direta no banco.
              </span>
            </div>

            <button
              type="submit"
                disabled={isSubmitting}
              className="w-full py-3 bg-zinc-950 hover:bg-zinc-900 text-[#FF5500] rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1 shadow-md"
            >
              {isSubmitting ? 'Criando Conta...' : 'Criar Conta e Conectar'}
              <ArrowRight className="w-4 h-4 stroke-[3px]" />
            </button>

            <div className="text-center pt-2">
              <button 
                type="button" 
                onClick={() => { setScreen('login'); setAlertMsg(null); }}
                className="text-[11px] text-zinc-500 hover:text-zinc-900 font-bold"
              >
                &larr; Voltar para Login
              </button>
            </div>
          </form>
        )}

        {/* 3. RECOVER PASSWORD SCREEN */}
        {screen === 'recover' && (
          <form onSubmit={handleRecover} className="space-y-4 text-xs font-semibold text-zinc-700">
            <p className="text-xs text-zinc-400 mb-2 leading-relaxed font-normal">
              Digite o seu e-mail cadastrado. Enviaremos um link seguro para alteracao da senha.
              Se nao localizar a mensagem, verifique spam, lixo eletronico e promocoes.
            </p>
            
            <div>
              <label className="block mb-1">E-mail Cadastrado *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
                <input
                  type="email"
                  required
                  value={recEmail}
                  onChange={(e) => setRecEmail(e.target.value)}
                  placeholder="aline@controlcopy.com"
                  className="w-full pl-9 pr-3 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
                disabled={isSubmitting}
              className="w-full py-3 bg-zinc-950 hover:bg-zinc-900 text-[#FF5500] rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1 shadow-md"
            >
              {isSubmitting ? 'Enviando...' : 'Enviar Link de Redefinição'}
            </button>

            <div className="text-center pt-2">
              <button 
                type="button" 
                onClick={() => { setScreen('login'); setAlertMsg(null); }}
                className="text-[11px] text-zinc-500 hover:text-zinc-900 font-bold"
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
