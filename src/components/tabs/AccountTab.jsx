import { useEffect, useMemo, useState } from 'react';
import { buildTimeZoneOptions } from '../../constants/timezones';

function formatDateTime(value) {
  if (!value) return '-';
  const time = Date.parse(String(value));
  if (!Number.isFinite(time)) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(time));
}

function formatBalance(value, currency = 'USD') {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '-';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2
  }).format(amount);
}

function getBrokerSessionMeta(broker) {
  const state = String(
    broker?.brokerSession?.state
      || (broker?.workerAuthReady ? 'credentials_ready' : broker?.status === 'Linked' ? 'linked' : 'unlinked')
  ).toLowerCase();

  switch (state) {
    case 'session_connected':
      return {
        label: 'Conectada',
        cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
      };
    case 'session_login_failed':
      return {
        label: 'Falha no login',
        cls: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
      };
    case 'credentials_ready':
    case 'session_ready':
    case 'linked':
      return {
        label: 'Reconectando',
        cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
      };
    case 'adapter_placeholder':
      return {
        label: 'Sem sessao',
        cls: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300'
      };
    default:
      return {
        label: 'Desvinculada',
        cls: 'bg-gray-100 text-gray-600 dark:bg-[#111827] dark:text-[#CBD5E1]'
      };
  }
}


function getConfirmationMeta(session) {
  const status = String(session?.account_confirmation_status || '').toLowerCase();
  switch (status) {
    case 'confirmed':
      return {
        label: 'Confirmada',
        cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
      };
    case 'mismatch':
      return {
        label: 'Divergente',
        cls: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
      };
    case 'pending':
      return {
        label: 'Pendente',
        cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
      };
    default:
      return {
        label: 'Nao exigida',
        cls: 'bg-slate-100 text-slate-700 dark:bg-slate-950/40 dark:text-slate-300'
      };
  }
}
export function AccountTab({
  userEmail,
  selectedTimezone,
  saveSelectedTimezone,
  brokersList,
  triggerLinkBroker,
  disconnectBroker,
  showToast,
  syncBrokerOperationalSession,
  confirmBrokerOperationalAccount,
  clearBrokerOperationalAccount,
  brokerActionLoading,
  t
}) {
  const [timezoneQuery, setTimezoneQuery] = useState('');
  const [timezoneDraft, setTimezoneDraft] = useState(selectedTimezone);

  useEffect(() => {
    setTimezoneDraft(selectedTimezone);
  }, [selectedTimezone]);

  const timezoneOptions = useMemo(() => buildTimeZoneOptions(new Date()), []);
  const filteredTimezoneOptions = useMemo(() => {
    const q = timezoneQuery.trim().toLowerCase();
    if (!q) return timezoneOptions;
    return timezoneOptions.filter((opt) => opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q));
  }, [timezoneOptions, timezoneQuery]);

  const handleSaveTimezone = async () => {
    const saved = await saveSelectedTimezone(timezoneDraft);
    if (saved) {
      showToast(t.timezoneSaved);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-gray-200 dark:border-[#334155] p-6 shadow-sm flex flex-col items-center text-center">
        <svg width="80" height="80" viewBox="0 0 40 40" className="rounded-full shadow-lg border-4 border-[#00B0FF] mb-3">
          <circle cx="20" cy="20" r="20" fill="#009688" />
          <path d="M12 25c2-4 6-6 8-6s6 2 8 6" stroke="#FFFFFF" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <circle cx="20" cy="13" r="4.5" fill="#FFFFFF" />
          <circle cx="14" cy="20" r="2" fill="#00E676" />
          <circle cx="26" cy="20" r="2" fill="#00E676" />
        </svg>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t.myAccount}</h2>
        <p className="text-xs text-gray-500 font-mono mt-1">{userEmail || '-'}</p>

        <div className="mt-6 w-full max-w-sm space-y-2 text-left">
          <label className="text-[10px] font-bold text-gray-400 uppercase">{t.accountTimezone}</label>
          <div className="space-y-2">
            <input
              value={timezoneQuery}
              onChange={(e) => setTimezoneQuery(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs bg-gray-50 dark:bg-[#334155] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
              placeholder={t.timezoneSearchPlaceholder}
            />
            <div className="flex space-x-2">
              <select
                value={timezoneDraft}
                onChange={(e) => setTimezoneDraft(e.target.value)}
                className="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs bg-gray-50 dark:bg-[#334155] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
              >
                {filteredTimezoneOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button onClick={handleSaveTimezone} className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors">{t.save}</button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {brokersList.map((broker) => {
          const isLinked = broker.status === 'Linked';
          const brokerSessionMeta = getBrokerSessionMeta(broker);
          const confirmationMeta = getConfirmationMeta(broker?.brokerSession);
          const detectedAccountType = broker?.brokerSession?.account_mode_detected || '-';
          const confirmedAccountType = broker?.brokerSession?.account_mode_confirmed || broker?.confirmedAccountType || '-';
          const sessionSource = String(broker?.brokerSession?.session_source || 'unknown');
          const canTrade = Boolean(broker?.brokerSession?.can_trade);
          const isIqOption = String(broker.id || '').toLowerCase() === 'iqoption';
          const syncLoading = Boolean(brokerActionLoading?.[broker.id]?.sync);
          const confirmDemoLoading = Boolean(brokerActionLoading?.[broker.id]?.confirm_demo);
          const confirmRealLoading = Boolean(brokerActionLoading?.[broker.id]?.confirm_real);
          const clearConfirmationLoading = Boolean(brokerActionLoading?.[broker.id]?.clear_confirmation);
          const canConfirmDetectedAccount = isLinked
            && String(broker?.brokerSession?.state || '').toLowerCase() === 'session_connected'
            && sessionSource === 'iqoption_real'
            && Boolean(broker?.brokerSession?.account_mode_detected);

          return (
            <div key={broker.id} className="bg-white dark:bg-[#1E293B] rounded-2xl border border-gray-200 dark:border-[#334155] p-6 shadow-sm flex flex-col justify-between space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: broker.logoColor }} />
                <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">{broker.name}</h3>
              </div>

              <div className="text-center py-2">
                {isLinked ? (
                  <span className="bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300 text-[10px] font-extrabold px-3 py-1 rounded-full">{t.linked}</span>
                ) : (
                  <span className="bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300 text-[10px] font-extrabold px-3 py-1 rounded-full">{t.unlinked}</span>
                )}
              </div>

              <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 text-[11px] text-gray-500 dark:border-[#334155] dark:bg-[#0F172A] dark:text-[#94A3B8]">
                <div className="flex items-center justify-between gap-3">
                  <span>Auth mode</span>
                  <span className="font-bold text-gray-700 dark:text-[#E2E8F0]">{broker.authMode === 'email_password' ? 'Email + senha' : '-'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Referência</span>
                  <span className="font-bold text-gray-700 dark:text-[#E2E8F0]">{broker.emailMasked || '-'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Worker externo</span>
                  <span className={`font-bold ${broker.workerAuthReady ? 'text-emerald-600 dark:text-emerald-300' : 'text-gray-400 dark:text-[#64748B]'}`}>
                    {broker.workerAuthReady ? 'Pronto' : 'Pendente'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Sessão operacional</span>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${brokerSessionMeta.cls}`}>
                    {brokerSessionMeta.label}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Adapter</span>
                  <span className="font-bold text-gray-700 dark:text-[#E2E8F0]">{broker?.brokerSession?.adapter_key || '-'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Origem da sessão</span>
                  <span className="font-bold text-gray-700 dark:text-[#E2E8F0]">{sessionSource}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Conta detectada</span>
                  <span className="font-bold text-gray-700 dark:text-[#E2E8F0]">{detectedAccountType}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Conta confirmada</span>
                  <span className="font-bold text-gray-700 dark:text-[#E2E8F0]">{confirmedAccountType}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Confirmação</span>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${confirmationMeta.cls}`}>
                    {confirmationMeta.label}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Pode operar</span>
                  <span className={`font-bold ${canTrade ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}`}>
                    {canTrade ? 'Sim' : 'Nao'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Saldo snapshot</span>
                  <span className="font-bold text-gray-700 dark:text-[#E2E8F0]">
                    {broker?.brokerSession?.account_balance !== null && broker?.brokerSession?.account_balance !== undefined
                      ? formatBalance(broker.brokerSession.account_balance, broker?.brokerSession?.account_currency || broker.baseCurrency)
                      : '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Última leitura</span>
                  <span className="font-bold text-gray-700 dark:text-[#E2E8F0]">{formatDateTime(broker?.brokerSession?.checked_at)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Hora da corretora</span>
                  <span className="font-bold text-gray-700 dark:text-[#E2E8F0]">{formatDateTime(broker?.brokerSession?.server_time)}</span>
                </div>
                {broker?.brokerSession?.hint ? (
                  <div className="text-[10px] text-gray-400 dark:text-[#64748B]">
                    {broker.brokerSession.hint}
                  </div>
                ) : null}
                {broker?.brokerSession?.block_reason ? (
                  <div className="text-[10px] text-amber-600 dark:text-amber-300">
                    Bloqueio: {broker.brokerSession.block_reason}
                  </div>
                ) : null}
                {broker?.brokerSession?.confirmed_account_at ? (
                  <div className="text-[10px] text-gray-400 dark:text-[#64748B]">
                    Confirmada em {formatDateTime(broker.brokerSession.confirmed_account_at)}
                  </div>
                ) : null}
                {broker.credentialReference ? (
                  <div className="text-[10px] text-gray-400 dark:text-[#64748B]">
                    Ref segura: {broker.credentialReference}
                  </div>
                ) : null}
                {isIqOption && sessionSource !== 'iqoption_real' ? (
                  <div className="text-[10px] text-amber-600 dark:text-amber-300">
                    O adapter real da IQ Option ainda precisa estar ativo no worker para liberar operacao automatica.
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                {isLinked ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => syncBrokerOperationalSession?.(broker.id)}
                      disabled={syncLoading}
                      className="py-2 rounded-xl border border-sky-200 bg-sky-50 text-sky-700 text-[11px] font-bold hover:bg-sky-100 disabled:opacity-50 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-300"
                    >
                      {syncLoading ? 'Sincronizando...' : 'Sincronizar'}
                    </button>
                    <button
                      onClick={() => clearBrokerOperationalAccount?.(broker.id)}
                      disabled={clearConfirmationLoading || !broker?.brokerSession?.account_mode_confirmed}
                      className="py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-[11px] font-bold hover:bg-slate-100 disabled:opacity-50 dark:border-slate-900/40 dark:bg-slate-950/20 dark:text-slate-300"
                    >
                      {clearConfirmationLoading ? 'Limpando...' : 'Limpar confirm.'}
                    </button>
                  </div>
                ) : null}
                {isLinked && isIqOption ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => confirmBrokerOperationalAccount?.(broker.id, 'Demo')}
                      disabled={confirmDemoLoading || !canConfirmDetectedAccount || broker?.brokerSession?.account_mode_detected !== 'Demo'}
                      className="py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-[11px] font-bold hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300"
                    >
                      {confirmDemoLoading ? 'Confirmando...' : 'Confirmar Demo'}
                    </button>
                    <button
                      onClick={() => confirmBrokerOperationalAccount?.(broker.id, 'Real')}
                      disabled={confirmRealLoading || !canConfirmDetectedAccount || broker?.brokerSession?.account_mode_detected !== 'Real'}
                      className="py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-[11px] font-bold hover:bg-amber-100 disabled:opacity-50 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300"
                    >
                      {confirmRealLoading ? 'Confirmando...' : 'Confirmar Real'}
                    </button>
                  </div>
                ) : null}
                {!canConfirmDetectedAccount && isLinked && isIqOption ? (
                  <div className="text-[10px] text-gray-400 dark:text-[#64748B]">
                    A confirmação Demo/Real só libera quando a sessão estiver conectada por adapter real e a conta ativa já tiver sido detectada.
                  </div>
                ) : null}
                {isLinked ? (
                  <button onClick={() => disconnectBroker(broker.name, broker.id)} className="w-full py-2 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl hover:bg-red-100 dark:hover:bg-red-900 transition-colors">
                    {t.disconnect}
                  </button>
                ) : (
                  <button onClick={() => triggerLinkBroker(broker.id)} className="w-full py-2 bg-[#E1F5FE] dark:bg-sky-950/30 text-[#0288D1] dark:text-sky-300 text-xs font-bold rounded-xl hover:bg-[#B3E5FC] dark:hover:bg-sky-900 transition-colors">
                    + {t.connect}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
