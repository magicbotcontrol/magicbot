import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, ArrowRight, CheckCircle2, Link2, RefreshCw } from 'lucide-react';
import { ControlCopyDB, dateUtils } from '../lib/db';
import { UserAuth, UserCopy } from '../types';

interface MyCopyProps {
  auth: UserAuth;
  onNavigate: (tab: string) => void;
}

export default function MyCopy({ auth, onNavigate }: MyCopyProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [userCopy, setUserCopy] = useState<UserCopy | null>(null);
  const [iqId, setIqId] = useState('');
  const [telegram, setTelegram] = useState('');
  const [bancaInicial, setBancaInicial] = useState(100);
  const [dataInicio, setDataInicio] = useState(dateUtils.todayStr());
  const [novaBanca, setNovaBanca] = useState<number>(0);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isReady = useMemo(() => !!userCopy, [userCopy]);

  const load = async () => {
    setIsLoading(true);
    try {
      const users = await ControlCopyDB.getUsers();
      const current = users[0] || null;
      setUserCopy(current);
      if (current) {
        setNovaBanca(current.banca_atual);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlertMsg(null);

    if (!/^\d{9}$/.test(iqId)) {
      setAlertMsg({ type: 'error', text: 'O ID IQ Option deve possuir exatamente 9 algarismos numéricos.' });
      return;
    }

    if (!bancaInicial || bancaInicial <= 0) {
      setAlertMsg({ type: 'error', text: 'Informe uma banca inicial valida.' });
      return;
    }

    try {
      setIsSubmitting(true);
      await ControlCopyDB.upsertClientCopy({
        iq_id: iqId,
        banca_inicial: bancaInicial,
        data_inicio: dataInicio,
        telegram,
      });
      setAlertMsg({ type: 'success', text: 'Cadastro completado. Seu copy já pode ser acompanhado pelo painel.' });
      setIqId('');
      await load();
    } catch (error) {
      setAlertMsg({
        type: 'error',
        text: error instanceof Error ? error.message : 'Nao foi possivel completar o cadastro agora.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlertMsg(null);

    if (!userCopy) {
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await ControlCopyDB.recordBalanceUpdate(userCopy.id, novaBanca);
      if (!result.success) {
        setAlertMsg({ type: 'error', text: 'Nao foi possivel atualizar a banca agora.' });
        return;
      }
      setAlertMsg({ type: 'success', text: 'Banca atualizada com sucesso.' });
      await load();
    } catch (error) {
      setAlertMsg({
        type: 'error',
        text: error instanceof Error ? error.message : 'Falha ao atualizar banca.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-sm font-semibold text-zinc-500 flex items-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin" />
        Carregando seu copy...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-black tracking-tight text-zinc-900">Meu Copy</h1>
          <p className="text-xs text-zinc-500 font-medium">
            Conta: <span className="font-bold text-zinc-800">{auth.nome}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('links')}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-black text-zinc-700 hover:border-[#FF5500] hover:text-[#FF5500] transition-colors"
        >
          <Link2 className="w-4 h-4" />
          Ver Links
        </button>
      </div>

      {alertMsg && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            alertMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
              : 'bg-red-50 text-red-800 border border-red-100'
          }`}
        >
          {alertMsg.type === 'success' ? (
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4.5 h-4.5 text-red-600" />
          )}
          <span>{alertMsg.text}</span>
        </div>
      )}

      {!isReady ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-white border border-zinc-150 rounded-3xl shadow-sm p-5 space-y-4"
        >
          <div className="space-y-1">
            <h2 className="text-sm font-black text-zinc-900">Complete seu cadastro</h2>
            <p className="text-xs text-zinc-500 font-medium">
              Siga o passo a passo em <span className="font-bold text-zinc-800">Links</span> e depois informe seu IQ ID.
            </p>
          </div>

          <form onSubmit={handleComplete} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-zinc-700">
            <div className="md:col-span-2">
              <label className="block mb-1">ID IQ Option (9 dígitos) *</label>
              <input
                type="text"
                inputMode="numeric"
                value={iqId}
                onChange={(e) => setIqId(e.target.value.trim())}
                className="w-full px-3 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-[#FF5500] font-mono font-black tracking-wider"
              />
            </div>

            <div>
              <label className="block mb-1">Banca Inicial (USD) *</label>
              <input
                type="number"
                min={1}
                value={bancaInicial}
                onChange={(e) => setBancaInicial(Number(e.target.value))}
                className="w-full px-3 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-[#FF5500] font-mono font-black"
              />
              <span className={`mt-1 block text-[10px] ${bancaInicial >= 100 ? 'text-zinc-400' : 'text-amber-600 font-semibold'}`}>
                {bancaInicial >= 100
                  ? 'O ideal operacional e trabalhar com banca minima de $100.'
                  : 'Permitido abaixo de $100, mas o ideal operacional e banca minima de $100.'}
              </span>
            </div>

            <div>
              <label className="block mb-1">Data de Início *</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full px-3 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-[#FF5500] font-mono font-bold"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block mb-1">Telegram (opcional)</label>
              <input
                type="text"
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                className="w-full px-3 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-[#FF5500] font-mono font-bold"
                placeholder="@seuuser"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[#FF5500] hover:bg-[#FF4500] text-black rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1 shadow-md shadow-[#FF5500]/15 cursor-pointer"
              >
                {isSubmitting ? 'Salvando...' : 'Completar cadastro'}
                <ArrowRight className="w-4 h-4 text-black stroke-[3px]" />
              </button>
            </div>
          </form>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-white border border-zinc-150 rounded-3xl shadow-sm p-5 space-y-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-black text-zinc-900">{userCopy?.nome}</h2>
              <p className="text-[11px] text-zinc-500 font-semibold">
                IQ ID: <span className="font-mono font-black text-zinc-800">{userCopy?.iq_id}</span>
              </p>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-black text-[10px]">
              Acesso Cliente
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-2xl border border-zinc-150 bg-zinc-50 p-3">
              <span className="block text-[10px] uppercase font-mono text-zinc-400">Banca Atual</span>
              <strong className="block text-lg font-black text-zinc-900 mt-1">${userCopy?.banca_atual.toLocaleString('en-US')}</strong>
            </div>
            <div className="rounded-2xl border border-zinc-150 bg-zinc-50 p-3">
              <span className="block text-[10px] uppercase font-mono text-zinc-400">Próx. Cobrança</span>
              <strong className="block text-lg font-black text-zinc-900 mt-1">
                {userCopy?.proxima_cobranca ? dateUtils.formatBr(userCopy.proxima_cobranca) : '--'}
              </strong>
            </div>
          </div>

          <form onSubmit={handleUpdateBalance} className="space-y-3 text-xs font-semibold text-zinc-700">
            <div>
              <label className="block mb-1">Atualizar banca (USD)</label>
              <input
                type="number"
                min={0}
                value={novaBanca}
                onChange={(e) => setNovaBanca(Number(e.target.value))}
                className="w-full px-3 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-[#FF5500] font-mono font-black"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-zinc-950 hover:bg-black text-white rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1 shadow-md cursor-pointer"
            >
              {isSubmitting ? 'Atualizando...' : 'Salvar resultado'}
              <ArrowRight className="w-4 h-4 text-white stroke-[3px]" />
            </button>
          </form>
        </motion.div>
      )}
    </div>
  );
}

