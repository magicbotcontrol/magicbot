import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Bot, 
  Settings as SettingsIcon, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle,
  Clock,
  KeyRound,
  Eye,
  EyeOff
} from 'lucide-react';
import { BRANDING } from '../branding';
import { Configuracoes, UserAuth } from '../types';
import { ControlCopyDB } from '../lib/db';

export default function Settings() {
  const [config, setConfig] = useState<Configuracoes>({ telegram_token: '', telegram_chat_id: '' });
  const [auth, setAuth] = useState<UserAuth>({ email: '', nome: '', level: 'Admin' });
  const [showSavedSuccess, setShowSavedSuccess] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Testing dispatch triggers
  const [testSent, setTestSent] = useState<boolean | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const [dbConfig, dbAuth] = await Promise.all([
        ControlCopyDB.getConfig(),
        ControlCopyDB.getAuth(),
      ]);

      setConfig(dbConfig);
      if (dbAuth) {
        setAuth(dbAuth);
      }
    };

    loadData();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    await ControlCopyDB.saveConfig(config);
    await ControlCopyDB.addLog('Configurações Atualizadas', 'Token e Chat ID do bot do Telegram editados no console');
    setShowSavedSuccess(true);
    setTimeout(() => {
      setShowSavedSuccess(false);
    }, 4000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await ControlCopyDB.saveAuth(auth);
    await ControlCopyDB.addLog('Perfil Atualizado', 'Nível de permissão administrativa persistido');
    setShowSavedSuccess(true);
    setTimeout(() => {
      setShowSavedSuccess(false);
    }, 4000);
  };

  // Dispatch live API challenge message to Telegram bot hook
  const handleTestBot = async () => {
    setIsTesting(true);
    setTestSent(null);
    setTestError(null);

    const testMsg = `🧪 *${BRANDING.telegramTestTitle}*\n\nParabéns! Se você está lendo esta mensagem, o seu chatbot do Telegram está integrado e as credenciais foram validadas com sucesso para o canal de alertas e repasses operacionais.`;

    const result = await ControlCopyDB.triggerTelegramNotification(testMsg);
    setIsTesting(false);
    if (result.sent) {
      setTestSent(true);
      await ControlCopyDB.addLog('Mensagem de Teste Disparada', 'Fired test connection test webhook to Telegram Bot successfully');
    } else {
      setTestSent(false);
      setTestError(result.error || 'Erro desconhecido');
    }
  };

  const isTelegramConfigured = Boolean(config.telegram_token && config.telegram_chat_id);
  const maskedTelegramToken = config.telegram_token
    ? `${'•'.repeat(Math.min(12, config.telegram_token.length))}${config.telegram_token.slice(-6)}`
    : '';

  return (
    <div className="space-y-6 max-w-4xl pb-16">
      <div>
        <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Preferências Gerais & Integração</h1>
        <p className="text-sm text-zinc-500">Configure tokens do chatbot do Telegram, níveis de acesso internos e credenciais operacionais.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Telegram bot configurations */}
        <div className="bg-white border border-zinc-150 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
            <Bot className="w-5 h-5 text-[#FF5500]" />
            <div>
              <h3 className="font-bold text-sm text-zinc-900">Configuração do Telegram Bot</h3>
              <p className="text-[10px] text-zinc-400 font-mono">Disparador automático de faturamentos e alertas de banca</p>
            </div>
          </div>

          {showSavedSuccess && (
            <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
              <span>Configurações persistidas com sucesso!</span>
            </div>
          )}

          <form onSubmit={handleSaveConfig} className="space-y-4 text-xs font-semibold">
            <div>
              <label className="block text-zinc-700 mb-1">Token do Telegram Bot</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={config.telegram_token}
                  onChange={(e) => setConfig({ ...config, telegram_token: e.target.value })}
                  placeholder="E.g. 1789234199:AAHGu9xy..."
                  className="w-full pl-3 pr-10 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-mono text-zinc-750 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-zinc-700 mb-1">ID do Chat (Canal / Grupo / Privado)</label>
              <input
                type="text"
                value={config.telegram_chat_id}
                onChange={(e) => setConfig({ ...config, telegram_chat_id: e.target.value })}
                placeholder="E.g. -1001928374112 ou 9821734"
                className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-mono text-zinc-750 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-4.5 py-2.5 bg-zinc-950 text-[#FF5500] hover:bg-zinc-900 rounded-xl font-bold font-mono text-xs cursor-pointer"
              >
                Salvar Configurações
              </button>
              
              <button
                type="button"
                onClick={handleTestBot}
                disabled={isTesting || !config.telegram_token}
                className={`px-4 py-2.5 border rounded-xl flex items-center gap-1.5 transition-all text-xs font-bold cursor-pointer ${
                  !config.telegram_token 
                    ? 'opacity-40 cursor-not-allowed bg-zinc-100 border-zinc-205 text-zinc-400' 
                    : 'bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-800'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                {isTesting ? 'Disparando...' : 'Testar Conexão Bot'}
              </button>
            </div>
          </form>

          {/* Test connection report feedback feedback */}
          {testSent === true && (
            <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl text-xs flex flex-col gap-1 font-semibold leading-relaxed">
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Alerta de Teste Despachado!
              </span>
              <p className="font-normal text-[11px] text-emerald-700">O robô enviou uma mensagem de teste para o chat {config.telegram_chat_id} com sucesso.</p>
            </div>
          )}

          {testSent === false && (
            <div className="p-3 bg-red-50 text-red-800 border border-red-100 rounded-xl text-xs flex flex-col gap-1 font-semibold leading-relaxed">
              <span className="flex items-center gap-1 text-red-600">
                <AlertCircle className="w-4 h-4" /> Falha no envio!
              </span>
              <p className="font-normal text-[11px] text-red-700 font-mono italic">Detalhe: {testError}</p>
              <span className="font-normal text-[10px] text-zinc-400 block mt-1">Verifique se o token é válido e se o bot é administrador do canal indicado.</span>
            </div>
          )}
        </div>

        {/* User security access level card */}
        <div className="bg-white border border-zinc-150 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
            <KeyRound className="w-5 h-5 text-zinc-650 text-zinc-900" />
            <div>
              <h3 className="font-bold text-sm text-zinc-900">Segurança de Perfil de Login</h3>
              <p className="text-[10px] text-zinc-400 font-mono">Simulador de credenciais de operadores</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs font-semibold">
            <div>
              <label className="block text-zinc-700 mb-1">Nome de Exibição</label>
              <input
                type="text"
                required
                value={auth.nome}
                onChange={(e) => setAuth({ ...auth, nome: e.target.value })}
                className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-zinc-700 mb-1">E-mail Administrativo</label>
              <input
                type="email"
                required
                value={auth.email}
                onChange={(e) => setAuth({ ...auth, email: e.target.value })}
                className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-zinc-700 mb-1">Nível de Permissão Realizado</label>
              <select
                value={auth.level}
                onChange={(e) => setAuth({ ...auth, level: e.target.value as any })}
                className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl cursor-pointer"
              >
                <option value="Admin">Admin (Acesso Total)</option>
                <option value="Operador">Operador (Apenas Bancas)</option>
                <option value="Financeiro">Financeiro (Apenas Repasses)</option>
              </select>
            </div>

            <div>
              <button
                type="submit"
                className="px-4.5 py-2.5 bg-zinc-950 text-white hover:bg-zinc-900 rounded-xl font-bold font-mono text-xs cursor-pointer"
              >
                Atualizar Meu Perfil
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Bot tutorial help box */}
      {isTelegramConfigured ? (
        <div className="p-5 bg-white border border-zinc-150 rounded-2xl shadow-sm space-y-3 text-xs text-zinc-650">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <div>
              <h4 className="font-extrabold text-zinc-900">Telegram configurado</h4>
              <p className="text-[11px] text-zinc-500">Integração pronta para alertas e faturamento. Não é necessário seguir o guia de API.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-zinc-150 bg-zinc-50 px-3 py-2.5">
              <span className="block text-[10px] uppercase font-mono text-zinc-400">Token</span>
              <span className="block font-mono text-[11px] font-bold text-zinc-700 break-all">{maskedTelegramToken}</span>
            </div>
            <div className="rounded-xl border border-zinc-150 bg-zinc-50 px-3 py-2.5">
              <span className="block text-[10px] uppercase font-mono text-zinc-400">Chat ID</span>
              <span className="block font-mono text-[11px] font-bold text-zinc-700 break-all">{config.telegram_chat_id}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500 font-semibold">
            <span>Use “Testar Conexão Bot” para validar quando quiser.</span>
            <span className="text-zinc-400">Para trocar credenciais, edite os campos acima e salve.</span>
          </div>
        </div>
      ) : (
        <div className="p-5 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-3 font-medium text-xs leading-relaxed text-zinc-650">
          <h4 className="font-extrabold text-[#FF5500] uppercase font-mono text-[10px] tracking-widest flex items-center gap-1">
            <HelpCircle className="w-4 h-4" />
            Como obter as credenciais do Telegram?
          </h4>
          <ol className="list-decimal list-inside space-y-1 pl-1 text-zinc-550">
            <li>Fale com o <strong className="text-zinc-900">@BotFather</strong> no Telegram e digite <code className="bg-zinc-150 py-0.5 px-1 rounded text-zinc-800">/newbot</code>. Defina nome e usuário e guarde o <code className="bg-zinc-150 py-0.5 px-1 rounded text-zinc-800">API TOKEN</code> gerado.</li>
            <li>Crie um canal de alertas ou grupo público/privado onde você receberá as notificações de faturamento.</li>
            <li>Adicione o seu robô recém-criado como administrador no grupo ou canal (com permissões de postar mensagens).</li>
            <li>Para descobrir seu Chat ID, envie um teste no grupo e acesse <code className="bg-zinc-150 py-0.5 px-1 rounded text-zinc-800 font-mono">https://api.telegram.org/bot[TOKEN_AQUI]/getUpdates</code> ou use bots do Telegram como <strong className="text-zinc-900">@ShowJsonBot</strong> adicionando-o lá.</li>
          </ol>
        </div>
      )}
    </div>
  );
}
