export function PixModal({ showPixModal, pixAmount, pixTitle, pixDescription, handlePixSuccess, setShowPixModal, t, formatMoney }) {
  if (!showPixModal) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-[#1E293B] rounded-3xl w-full max-w-xs p-6 space-y-4 shadow-2xl text-center">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t.pixPayment}</h3>
        {pixTitle ? (
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">{pixTitle}</p>
        ) : null}
        <p className="text-xs text-gray-500">
          {t.amountToPay}: <span className="font-bold text-orange-600">{formatMoney(pixAmount, 'USD')}</span>
        </p>
        {pixDescription ? (
          <p className="text-[11px] leading-5 text-gray-500 dark:text-gray-400">{pixDescription}</p>
        ) : null}

        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center">
          <svg width="100" height="100" viewBox="0 0 24 24" className="bg-white p-1 rounded-md">
            <rect width="24" height="24" fill="white" />
            <rect x="2" y="2" width="6" height="6" fill="black" />
            <rect x="16" y="2" width="6" height="6" fill="black" />
            <rect x="2" y="16" width="6" height="6" fill="black" />
            <rect x="10" y="10" width="4" height="4" fill="black" />
            <rect x="14" y="14" width="4" height="4" fill="black" />
          </svg>
          <span className="text-[9px] text-gray-400 dark:text-gray-400 mt-2">{t.awaitingBank}</span>
        </div>

        <button onClick={handlePixSuccess} className="w-full py-2.5 bg-green-500 hover:bg-green-600 text-white font-bold text-xs rounded-xl transition-all">
          {t.confirmPayment}
        </button>
        <button onClick={() => setShowPixModal(false)} className="w-full text-[10px] text-gray-400 dark:text-gray-400 font-bold uppercase hover:underline">
          {t.cancel}
        </button>
      </div>
    </div>
  );
}
