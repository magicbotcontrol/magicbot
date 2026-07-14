import { colors } from '../../constants/colors';

export function BrokerLinkModal({
  activeBrokerLinking,
  setActiveBrokerLinking,
  submitLinkBroker,
  brokerEmailInput,
  setBrokerEmailInput,
  brokerPassInput,
  setBrokerPassInput,
  isLinkingLoading,
  t
}) {
  if (!activeBrokerLinking) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <form onSubmit={submitLinkBroker} className="bg-white dark:bg-[#1E293B] rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl relative border border-gray-100 dark:border-gray-700">
        <button type="button" onClick={() => setActiveBrokerLinking(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-lg">✕</button>

        <div className="text-center space-y-1">
          <h3 className="text-base font-extrabold text-gray-900 dark:text-white">{t.secureBrokerTitle} {activeBrokerLinking.name}</h3>
          <p className="text-xs text-gray-400 dark:text-gray-300">{t.secureBrokerSubtitle}</p>
          {activeBrokerLinking?.emailMasked ? (
            <p className="text-[11px] text-emerald-600 dark:text-emerald-300">
              Credencial atual de referência: {activeBrokerLinking.emailMasked}
            </p>
          ) : null}
        </div>

        <div className="space-y-3 pt-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">{t.email} *</label>
            <input
              type="email"
              value={brokerEmailInput}
              onChange={(e) => setBrokerEmailInput(e.target.value)}
              placeholder={t.brokerEmailPlaceholder}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-[#FF6B00] bg-gray-50 dark:bg-[#334155] dark:text-white focus:outline-none"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">{t.password} *</label>
            <input
              type="password"
              value={brokerPassInput}
              onChange={(e) => setBrokerPassInput(e.target.value)}
              placeholder={t.brokerPasswordPlaceholder}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-[#FF6B00] bg-gray-50 dark:bg-[#334155] dark:text-white focus:outline-none"
              required
            />
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-[11px] leading-5 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
          O app envia esse login para a camada segura do backend. A interface passa a mostrar apenas referência mascarada para uso do worker externo.
        </div>

        <button type="submit" disabled={isLinkingLoading} className="w-full mt-4 py-3 bg-[#FF6B00] text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center" style={{ backgroundColor: colors.primary }}>
          {isLinkingLoading ? t.checkingSsl : t.linkBroker}
        </button>
      </form>
    </div>
  );
}
