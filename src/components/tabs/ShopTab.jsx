import { colors } from '../../constants/colors';
import { Icons } from '../../constants/icons';

export function ShopTab({ shopCycle, setShopCycle, buyDaysSimulate, t, formatMoney }) {
  const isSemiannual = shopCycle === 'semiannual';
  const starter = {
    monthlyPrice: 89.9,
    semiannualPrice: 71.92,
    monthlyTotal: 89.9,
    semiannualTotal: 431.52,
    semiannualSave: 107.88
  };
  const pro = {
    monthlyPrice: 99.9,
    semiannualPrice: 79.9,
    monthlyTotal: 99.9,
    semiannualTotal: 479.4,
    semiannualSave: 120.0
  };

  const starterPrice = isSemiannual ? starter.semiannualPrice : starter.monthlyPrice;
  const starterTotal = isSemiannual ? starter.semiannualTotal : starter.monthlyTotal;
  const proPrice = isSemiannual ? pro.semiannualPrice : pro.monthlyPrice;
  const proTotal = isSemiannual ? pro.semiannualTotal : pro.monthlyTotal;

  const starterFeatures = [t.allFeatures, t.shopAllModes, t.shopAllBrokers, t.shopStarterExtra];
  const proFeatures = [t.allFeatures, t.shopAllModes, t.shopAllBrokers, t.shopProExtra];

  const renderFeatures = (items) => (
    <ul className="mt-6 space-y-3 border-t border-gray-100 dark:border-[#334155] pt-5">
      {items.map((feature) => (
        <li key={feature} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
          <span className="mt-0.5 text-green-500 dark:text-green-400">
            <Icons.CheckCircle />
          </span>
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-fade-in">
      <div className="text-center space-y-3">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-[0.2em] bg-orange-50 dark:bg-orange-950/30 text-[#FF6B00] dark:text-[#FF8A3D]">
          {t.shopPremiumTag}
        </span>
        <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">{t.acquireLicences}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">{t.selectPlan}</p>
      </div>

      <div className="flex justify-center">
        <div className="bg-white dark:bg-[#1E293B] p-1.5 rounded-2xl flex items-center space-x-1 border border-gray-200 dark:border-gray-700 shadow-sm">
          <button onClick={() => setShopCycle('monthly')} className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${shopCycle === 'monthly' ? 'bg-gray-100 dark:bg-[#0F172A] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'}`}>
            {t.monthly}
          </button>
          <button onClick={() => setShopCycle('semiannual')} className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center ${shopCycle === 'semiannual' ? 'bg-gray-100 dark:bg-[#0F172A] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'}`}>
            {t.semiannual}
            <span className="ml-2 bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">20% OFF</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 max-w-5xl mx-auto">
        <div className="bg-white dark:bg-[#1E293B] rounded-[28px] border border-gray-200 dark:border-[#334155] p-7 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-3xl font-black text-gray-900 dark:text-white">Starter</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{t.shopStarterSubtitle}</p>
              </div>
              {isSemiannual ? (
                <span className="inline-flex items-center bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300 text-[10px] font-extrabold px-3 py-1 rounded-full whitespace-nowrap">
                  {t.shopSaveLabel} {formatMoney(starter.semiannualSave, 'BRL')}
                </span>
              ) : null}
            </div>

            <p className="text-4xl font-black text-blue-600 dark:text-blue-400 mt-5">
              {formatMoney(starterPrice, 'BRL')} <span className="text-base font-semibold text-gray-400">{t.perMonth}</span>
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t.shopTotalLabel} {formatMoney(starterTotal, 'BRL')}</p>
            <span className={`inline-flex items-center text-[10px] font-bold px-3 py-1 rounded-full mt-4 ${isSemiannual ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-300' : 'bg-pink-50 dark:bg-pink-950/20 text-pink-600 dark:text-pink-300'}`}>
              {isSemiannual ? `${t.shopSaveLabel} ${formatMoney(starter.semiannualSave, 'BRL')}` : t.noDiscount}
            </span>

            {renderFeatures(starterFeatures)}
          </div>

          <div className="space-y-3 mt-8">
            <button onClick={() => buyDaysSimulate('Starter Subscribe', starterTotal)} className="w-full py-3 bg-green-100 hover:bg-green-200 dark:bg-green-950/30 dark:hover:bg-green-900/40 text-green-700 dark:text-green-300 font-bold text-sm rounded-2xl shadow-sm transition-colors flex items-center justify-center gap-2">
              <Icons.ShoppingBag /> {t.subscribe}
            </button>
            <button onClick={() => buyDaysSimulate('Starter Buy', starterTotal)} className="w-full py-3 bg-blue-100 hover:bg-blue-200 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold text-sm rounded-2xl transition-colors flex items-center justify-center gap-2">
              <Icons.ShoppingBag /> {t.buy}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E293B] rounded-[28px] border-2 border-[#FF6B00] p-7 shadow-md flex flex-col justify-between relative">
          <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#F4D18C] dark:bg-[#FFB347] text-[#8A4B00] text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wide whitespace-nowrap">
            {t.bestOption}
          </span>

          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-3xl font-black text-gray-900 dark:text-white">Pro</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{t.shopProSubtitle}</p>
              </div>
              {isSemiannual ? (
                <span className="inline-flex items-center bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300 text-[10px] font-extrabold px-3 py-1 rounded-full whitespace-nowrap">
                  {t.shopSaveLabel} {formatMoney(pro.semiannualSave, 'BRL')}
                </span>
              ) : null}
            </div>

            <p className="text-4xl font-black text-orange-500 mt-5">
              {formatMoney(proPrice, 'BRL')} <span className="text-base font-semibold text-gray-400">{t.perMonth}</span>
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t.shopTotalLabel} {formatMoney(proTotal, 'BRL')}</p>
            <span className={`inline-flex items-center text-[10px] font-bold px-3 py-1 rounded-full mt-4 ${isSemiannual ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-300' : 'bg-pink-50 dark:bg-pink-950/20 text-pink-600 dark:text-pink-300'}`}>
              {isSemiannual ? `${t.shopSaveLabel} ${formatMoney(pro.semiannualSave, 'BRL')}` : t.noDiscount}
            </span>

            {renderFeatures(proFeatures)}

            <div className="mt-6 rounded-2xl border border-orange-200 dark:border-orange-900/40 bg-orange-50 dark:bg-orange-950/15 p-4">
              <p className="text-sm font-extrabold text-orange-500">{t.twoAccounts}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-5">{t.shopProCallout}</p>
            </div>
          </div>

          <div className="space-y-3 mt-8">
            <button onClick={() => buyDaysSimulate('Pro Subscribe', proTotal)} className="w-full py-3 hover:bg-[#f59f0b] text-white font-bold text-sm rounded-2xl shadow-md transition-colors flex items-center justify-center gap-2" style={{ backgroundColor: colors.primary }}>
              <Icons.ShoppingBag /> {t.subscribe}
            </button>
            <button onClick={() => buyDaysSimulate('Pro Buy', proTotal)} className="w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white font-bold text-sm rounded-2xl transition-colors flex items-center justify-center gap-2">
              <Icons.ShoppingBag /> {t.buy}
            </button>
          </div>
        </div>
      </div>

      <div className="pt-2">
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-gray-200 dark:bg-[#334155]" />
          <span className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-gray-400 dark:text-gray-500">{t.shopModesTitle}</span>
          <div className="h-px flex-1 bg-gray-200 dark:bg-[#334155]" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
          <div className="rounded-3xl border border-green-200 dark:border-green-900/40 bg-green-50/70 dark:bg-green-950/10 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#0F172A] border border-green-100 dark:border-green-900/40 flex items-center justify-center text-green-500">
                  <Icons.Activity />
                </div>
                <h3 className="text-base font-black text-gray-900 dark:text-white">{t.shopSubscriptionTitle}</h3>
              </div>
              <span className="text-[10px] font-extrabold px-3 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300">{t.shopSubscriptionBadge}</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 leading-6">{t.shopSubscriptionDescription}</p>
          </div>

          <div className="rounded-3xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/70 dark:bg-blue-950/10 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#0F172A] border border-blue-100 dark:border-blue-900/40 flex items-center justify-center text-blue-500">
                  <Icons.ShoppingBag />
                </div>
                <h3 className="text-base font-black text-gray-900 dark:text-white">{t.shopPurchaseTitle}</h3>
              </div>
              <span className="text-[10px] font-extrabold px-3 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">{t.shopPurchaseBadge}</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 leading-6">{t.shopPurchaseDescription}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
