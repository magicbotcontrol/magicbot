export function AiTab({ showToast, t }) {
  const aiSignals = [];
  return (
    <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-gray-200 dark:border-[#334155] p-6 shadow-sm animate-fade-in space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">{t.aiHighProbability}</h2>
        <span className="bg-green-100 text-green-700 text-[10px] font-bold px-3 py-1 rounded-full">{t.realTimeAnalysis}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {aiSignals.length ? aiSignals.map((item, i) => (
          <div key={i} className="border border-gray-100 dark:border-gray-700 rounded-xl p-4 bg-gray-50/50 dark:bg-[#334155]">
            <div className="flex justify-between items-center mb-3">
              <span className="font-bold text-sm text-gray-800 dark:text-white">{item.asset}</span>
              <span className="text-[10px] font-bold font-mono bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-600 px-2 py-0.5 rounded">{item.tf}</span>
            </div>
            <div className="flex justify-between items-center text-xs mb-3">
              <span className="text-gray-500 dark:text-gray-400">{t.probability}</span>
              <span className="font-bold text-green-600 dark:text-green-400">{item.prob}%</span>
            </div>
            <button onClick={() => showToast(t.autoSignalAdded)} className="w-full py-2 bg-[#FF6B00] text-white text-xs font-bold rounded-lg hover:bg-opacity-90">{t.autoExecute}</button>
          </div>
        )) : (
          <div className="col-span-full rounded-2xl border border-gray-200 bg-white p-6 text-sm font-semibold text-gray-500 dark:border-[#334155] dark:bg-[#334155] dark:text-[#CBD5E1]">
            Sinais IA indisponíveis no momento.
          </div>
        )}
      </div>
    </div>
  );
}
