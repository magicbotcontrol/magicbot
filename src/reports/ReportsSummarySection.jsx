import { Clock3, Landmark, Receipt, TrendingUp } from 'lucide-react';
import { fillTemplate, formatMoneyUsd } from '../i18n/i18n.js';

const summaryCards = [
  {
    key: 'earnings',
    icon: TrendingUp,
    accentClass: 'border-emerald-100 bg-emerald-50 text-emerald-600',
    amountClass: 'text-emerald-600',
    sign: '+',
    titleKey: 'reportsSummaryEarningsTitle',
    hintKey: 'reportsSummaryEarningsHint',
  },
  {
    key: 'pendingDeposits',
    icon: Clock3,
    accentClass: 'border-amber-100 bg-amber-50 text-amber-600',
    amountClass: 'text-amber-600',
    sign: '+',
    titleKey: 'reportsSummaryPendingTitle',
    hintKey: 'reportsSummaryPendingHint',
  },
  {
    key: 'debits',
    icon: Receipt,
    accentClass: 'border-rose-100 bg-rose-50 text-rose-600',
    amountClass: 'text-rose-600',
    sign: '-',
    titleKey: 'reportsSummaryDebitsTitle',
    hintKey: 'reportsSummaryDebitsHint',
  },
  {
    key: 'net',
    icon: Landmark,
    accentClass: 'border-violet-100 bg-violet-50 text-violet-600',
    amountClass: 'text-violet-600',
    sign: null,
    titleKey: 'reportsSummaryNetTitle',
    hintKey: 'reportsSummaryNetHint',
  },
];

const formatSignedMoney = (amount, lang, sign = null) => {
  const absolute = formatMoneyUsd(Math.abs(Number(amount || 0)), lang);
  if (sign) return `${sign}${absolute}`;
  return `${Number(amount || 0) >= 0 ? '+' : '-'}${absolute}`;
};

export default function ReportsSummarySection({ t, lang, summary }) {
  return (
    <div className="rm-neon-banner rm-neon-static rm-neon-light p-6 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.3)]" style={{ '--rm-neon-radius': '28px' }}>
      <div className="rm-neon-banner-content">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-xl font-black text-gray-900">{t.reportsSummaryTitle}</h3>
            <p className="mt-1 text-sm leading-6 text-gray-500">{t.reportsSummarySubtitle}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            const bucket = card.key === 'net' ? { count: null, total: summary.net } : summary[card.key];
            return (
              <div key={card.key} className="rounded-[24px] border border-gray-100 bg-white/85 p-5 shadow-[0_18px_40px_-36px_rgba(15,23,42,0.18)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-gray-900">{t[card.titleKey]}</p>
                    <p className="mt-1 text-xs leading-5 text-gray-500">{t[card.hintKey]}</p>
                  </div>
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${card.accentClass}`.trim()}>
                    <Icon className="h-5 w-5" />
                  </span>
                </div>
                <p className={`mt-5 text-3xl font-black ${card.amountClass}`}>{formatSignedMoney(bucket.total, lang, card.sign)}</p>
                {typeof bucket.count === 'number' ? (
                  <p className="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
                    {fillTemplate(t.reportsSummaryCountTemplate, { count: String(bucket.count) })}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50/80 px-5 py-5">
          <p className="text-sm font-black text-slate-900">{t.reportsSummaryNoticeTitle}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{t.reportsSummaryNoticeBody}</p>
        </div>
      </div>
    </div>
  );
}
