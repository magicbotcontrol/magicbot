import { useEffect, useMemo, useState } from 'react';
import { buildTimeZoneOptions } from '../../constants/timezones';

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

export function AccountTab({
  userEmail,
  selectedTimezone,
  saveSelectedTimezone,
  brokersList,
  triggerLinkBroker,
  disconnectBroker,
  showToast,
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
                {broker?.brokerSession?.hint ? (
                  <div className="text-[10px] text-gray-400 dark:text-[#64748B]">
                    {broker.brokerSession.hint}
                  </div>
                ) : null}
                {broker.credentialReference ? (
                  <div className="text-[10px] text-gray-400 dark:text-[#64748B]">
                    Ref segura: {broker.credentialReference}
                  </div>
                ) : null}
              </div>

              <div>
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
