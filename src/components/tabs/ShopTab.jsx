import { useEffect, useState } from 'react';
import { Icons } from '../../constants/icons';
import { networkSharePercent } from '../../constants/commercialModel';
import { BOT_MIN_CAPITAL_USD, MONTHLY_PRICING_TIERS, resolveMonthlyTier } from '../../utils/monthlyPricing';

function StatusBadge({ active, label }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] ${
      active
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
    }`}>
      {label}
    </span>
  );
}

function FeatureList({ items }) {
  return (
    <ul className="mt-5 space-y-3 border-t border-gray-100 pt-5 dark:border-[#334155]">
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
}

export function ShopTab({
  buyDaysSimulate,
  t,
  formatMoney,
  isMembershipActive,
  membershipExpirationDate,
  monthlyBankrollUsd,
  commercialConfig
}) {
  const boltName = commercialConfig?.boltName || 'BOT';
  const minCapitalUsd = Number(commercialConfig?.minCapitalUsd || BOT_MIN_CAPITAL_USD);
  const hasDetectedBankroll = Number.isFinite(Number(monthlyBankrollUsd)) && Number(monthlyBankrollUsd) > 0;
  const membershipTier = resolveMonthlyTier(monthlyBankrollUsd);
  const [tierChoice, setTierChoice] = useState(() => {
    const fallbackId = membershipTier.id;
    if (typeof window === 'undefined') return { id: fallbackId, touched: false };
    const stored = window.sessionStorage.getItem('magicbot.selectedMonthlyTier');
    window.sessionStorage.removeItem('magicbot.selectedMonthlyTier');
    if (stored && MONTHLY_PRICING_TIERS.some((tier) => tier.id === stored)) {
      return { id: stored, touched: true };
    }
    return { id: fallbackId, touched: false };
  });

  useEffect(() => {
    if (!tierChoice.touched) {
      setTierChoice({ id: membershipTier.id, touched: false });
    }
  }, [membershipTier.id, tierChoice.touched]);

  const selectedTier = MONTHLY_PRICING_TIERS.find((tier) => tier.id === tierChoice.id) || membershipTier;
  const monthlyUsd = selectedTier.amount;
  const choseAnotherTier = selectedTier.id !== membershipTier.id;
  const membershipOffer = {
    kind: 'membership',
    title: `Mensalidade ${boltName}`,
    description: `A mensalidade do ${boltName} acompanha o capital. A faixa escolhida e ${selectedTier.label}, por ${formatMoney(selectedTier.amount, 'USD')}.`,
    amount: monthlyUsd,
    days: 30,
    planName: `membership-monthly-${selectedTier.id}`,
    tierId: selectedTier.id,
    tierLabel: selectedTier.label,
    bankrollUsd: Number(monthlyBankrollUsd || 0),
    manualOverride: choseAnotherTier,
    successMessage: `Mensalidade ${boltName} ativada por 30 dias na faixa ${selectedTier.label}.`
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-fade-in">
      <div className="text-center space-y-3">
        <span className="inline-flex items-center rounded-full bg-orange-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#FF6B00] dark:bg-orange-950/30 dark:text-[#FF8A3D]">
          Loja de planos
        </span>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white md:text-3xl">BOT e o produto principal</h2>
        <p className="mx-auto max-w-3xl text-sm text-gray-500 dark:text-gray-400">
          A mensalidade segue o capital, de {formatMoney(MONTHLY_PRICING_TIERS[0].amount, 'USD')} a partir de {formatMoney(minCapitalUsd, 'USD')} ate {formatMoney(MONTHLY_PRICING_TIERS[MONTHLY_PRICING_TIERS.length - 1].amount, 'USD')} na faixa de {formatMoney(10000, 'USD')} a {formatMoney(100000, 'USD')}. {commercialConfig?.riskDisclaimer}
        </p>
      </div>

      <section className="rounded-[28px] border border-gray-200 bg-white p-7 shadow-sm dark:border-[#334155] dark:bg-[#1E293B]">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#FF6B00]">Planos do BOT</p>
        <h3 className="mt-2 text-xl font-black text-gray-900 dark:text-white">Mensalidade conforme o capital</h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Escolha a faixa do seu capital. O valor da mensalidade e o pagamento usam a faixa selecionada.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          {MONTHLY_PRICING_TIERS.map((tier) => {
            const isSelected = tier.id === selectedTier.id;
            const isSuggested = tier.id === membershipTier.id;
            return (
              <button
                key={tier.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setTierChoice({ id: tier.id, touched: true })}
                className={`rounded-2xl border p-4 text-left transition-colors ${
                  isSelected
                    ? 'border-[#FF6B00] bg-orange-50 dark:bg-orange-950/20'
                    : 'border-gray-200 bg-gray-50 hover:border-[#FF6B00]/40 dark:border-[#334155] dark:bg-[#0B1220]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-gray-400">{tier.label}</p>
                  {isSuggested ? (
                    <span className="rounded-full bg-[#FF6B00] px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white">Atual</span>
                  ) : null}
                </div>
                <p className={`mt-3 text-2xl font-black ${isSelected ? 'text-orange-600 dark:text-orange-300' : 'text-gray-900 dark:text-white'}`}>
                  {formatMoney(tier.amount, 'USD')}
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">por mes</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-[28px] border border-[#FF6B00] bg-white p-7 shadow-md dark:border-[#FF8A3D] dark:bg-[#1E293B]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">{membershipOffer.title}</h3>
              <StatusBadge active={isMembershipActive} label={isMembershipActive ? 'Ativa' : 'Pendente'} />
            </div>
            <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">{membershipOffer.description}</p>
            <p className="mt-5 text-4xl font-black text-orange-500 dark:text-orange-400">{formatMoney(membershipOffer.amount, 'USD')}</p>
            <p className="mt-1 text-sm font-semibold text-gray-700 dark:text-gray-300">{selectedTier.label}</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {isMembershipActive ? `Expira em ${membershipExpirationDate || '-'}` : 'Renovação de 30 dias da base do workspace.'}
            </p>
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/15 dark:text-amber-300">
              {commercialConfig?.riskDisclaimer} Capital minimo da primeira faixa: {formatMoney(minCapitalUsd, 'USD')}.
              {hasDetectedBankroll ? ` Banca informada: ${formatMoney(monthlyBankrollUsd, 'USD')}.` : ' Sem banca lida, a sugestao fica na faixa inicial.'}
              {choseAnotherTier ? ` Voce escolheu ${selectedTier.label} em vez da faixa sugerida (${membershipTier.label}).` : ''}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/15 dark:text-emerald-300">
            Sem a mensalidade do BOT, o Copy operacional nao libera.
          </div>
        </div>

        <FeatureList items={[
          `Faixa escolhida: ${selectedTier.label}`,
          `Mensalidade desta faixa: ${formatMoney(monthlyUsd, 'USD')}`,
          `${networkSharePercent(commercialConfig)}% da mensalidade paga segue para a rede em ${commercialConfig?.levels?.length || 4} niveis`
        ]} />

        <button
          type="button"
          onClick={() => buyDaysSimulate(membershipOffer)}
          className="mt-8 w-full rounded-2xl bg-[#FF6B00] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#FF7F1F] lg:w-auto"
        >
          Pagar mensalidade
        </button>
      </section>

      <section className="rounded-[28px] border border-gray-200 bg-white p-7 shadow-sm dark:border-[#334155] dark:bg-[#1E293B]">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#FF6B00]">Bonificacao da rede</p>
        <h3 className="mt-2 text-xl font-black text-gray-900 dark:text-white">
          {networkSharePercent(commercialConfig)}% da mensalidade da faixa paga
        </h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Os 80% restantes, ou o que ficar fora desses niveis, seguem para a operacao da plataforma. Os percentuais podem ser alterados no painel administrativo.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {(commercialConfig?.levels || []).map((level) => (
            <div key={level.level} className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-[#334155] dark:bg-[#0B1220]">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-gray-400">Nivel {level.level}</p>
              <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{level.percent}%</p>
              <p className="mt-1 text-sm font-semibold text-orange-600 dark:text-orange-300">
                {formatMoney(monthlyUsd * level.percent / 100, 'USD')} na sua faixa
              </p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
