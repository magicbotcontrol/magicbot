import { Icons } from '../../constants/icons';
import { DEFAULT_MONTHLY_AMOUNT, MONTHLY_PRICING_TIERS, resolveMonthlyTier } from '../../utils/monthlyPricing';

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

function PackageCard({ title, price, description, statusLabel, isActive, note, features, onBuy, ctaLabel, tone = 'default', formatMoney }) {
  const toneClass = tone === 'highlight'
    ? 'border-[#FF6B00] shadow-md'
    : 'border-gray-200 shadow-sm dark:border-[#334155]';

  return (
    <div className={`rounded-[28px] border bg-white p-7 dark:bg-[#1E293B] ${toneClass}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black text-gray-900 dark:text-white">{title}</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{description}</p>
        </div>
        <StatusBadge active={isActive} label={statusLabel} />
      </div>

      <p className="mt-5 text-4xl font-black text-orange-500 dark:text-orange-400">
        {formatMoney(price, 'USD')}
      </p>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">30 dias de acesso ao pacote.</p>

      {note ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/15 dark:text-amber-300">
          {note}
        </div>
      ) : null}

      <FeatureList items={features} />

      <button
        type="button"
        onClick={onBuy}
        className={`mt-8 w-full rounded-2xl px-5 py-3 text-sm font-bold transition-colors ${
          tone === 'highlight'
            ? 'bg-[#FF6B00] text-white hover:bg-[#FF7F1F]'
            : 'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-[#0B1220] dark:text-white dark:hover:bg-[#111827]'
        }`}
      >
        {ctaLabel}
      </button>
    </div>
  );
}

export function ShopTab({
  buyDaysSimulate,
  t,
  formatMoney,
  isMembershipActive,
  membershipExpirationDate,
  monthlyBankrollUsd,
  hasCopyAccess,
  hasSignalsPackageAccess,
  hasFullAccess
}) {
  const membershipTier = resolveMonthlyTier(monthlyBankrollUsd);
  const hasDetectedBankroll = Number.isFinite(Number(monthlyBankrollUsd)) && Number(monthlyBankrollUsd) > 0;
  const membershipOffer = {
    kind: 'membership',
    title: 'Mensalidade',
    description: hasDetectedBankroll
      ? `Ativa o workspace por 30 dias conforme a faixa da banca detectada. Ela e obrigatoria para qualquer pacote funcionar.`
      : `Ativa o workspace por 30 dias. Enquanto a banca nao estiver detectada, a faixa inicial de ${formatMoney(DEFAULT_MONTHLY_AMOUNT, 'USD')} sera usada.`,
    amount: membershipTier.amount,
    days: 30,
    planName: `membership-monthly-${membershipTier.id}`,
    tierId: membershipTier.id,
    tierLabel: membershipTier.label,
    bankrollUsd: Number(monthlyBankrollUsd || 0),
    manualOverride: false,
    successMessage: `Mensalidade ativada com sucesso por 30 dias na faixa ${membershipTier.label}.`
  };

  const packages = [
    {
      kind: 'package',
      packageCode: 'copy_trading_package',
      title: 'Pacote Copy Trading',
      amount: 40,
      description: 'Libera exclusivamente o produto Copy Trading por 30 dias.',
      successMessage: 'Pacote Copy Trading ativado com sucesso.',
      statusLabel: hasCopyAccess ? 'Ativo' : 'Inativo',
      isActive: hasCopyAccess,
      note: isMembershipActive ? 'Mensalidade validada. Este pacote ja pode liberar o Copy Trading.' : 'Este pacote exige a mensalidade conforme a tabela da banca.',
      features: [
        'Acesso ao Copy Trading',
        'Janela de uso por 30 dias',
        'Sem liberar Automatizador ou listas'
      ]
    },
    {
      kind: 'package',
      packageCode: 'automator_lists_package',
      title: 'Pacote Automatizador + Listas',
      amount: 60,
      description: 'Libera o AutoTrader (Lista) e as 3 listas: OB, Cripto e Forex.',
      successMessage: 'Pacote Automatizador + Listas ativado com sucesso.',
      statusLabel: hasSignalsPackageAccess ? 'Ativo' : 'Inativo',
      isActive: hasSignalsPackageAccess,
      note: isMembershipActive ? 'Mensalidade validada. O pacote cobre AutoTrader e as listas de sinais.' : 'Este pacote exige a mensalidade conforme a tabela da banca.',
      features: [
        'AutoTrader (Lista)',
        'Sinais Diários OB',
        'Sinais Diários Cripto',
        'Sinais Diários Forex'
      ]
    },
    {
      kind: 'package',
      packageCode: 'full_access_package',
      title: 'Pacote Full Access',
      amount: 80,
      description: 'Libera todos os produtos: Copy Trading, Automatizador e as 3 listas.',
      successMessage: 'Pacote Full Access ativado com sucesso.',
      statusLabel: hasFullAccess ? 'Ativo' : 'Inativo',
      isActive: hasFullAccess,
      note: isMembershipActive ? 'Mensalidade validada. Este e o pacote completo de 30 dias.' : 'Este pacote exige a mensalidade conforme a tabela da banca.',
      features: [
        'Copy Trading',
        'AutoTrader (Lista)',
        'Sinais Diários OB',
        'Sinais Diários Cripto',
        'Sinais Diários Forex'
      ]
    }
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-fade-in">
      <div className="text-center space-y-3">
        <span className="inline-flex items-center rounded-full bg-orange-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#FF6B00] dark:bg-orange-950/30 dark:text-[#FF8A3D]">
          Loja de pacotes
        </span>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white md:text-3xl">Ative sua mensalidade e escolha o pacote</h2>
        <p className="mx-auto max-w-3xl text-sm text-gray-500 dark:text-gray-400">
          A mensalidade agora segue a faixa da sua banca, com valor inicial de {formatMoney(DEFAULT_MONTHLY_AMOUNT, 'USD')}. Os demais pacotes permanecem com os mesmos valores.
        </p>
      </div>

      <section className="rounded-[28px] border border-[#FF6B00] bg-white p-7 shadow-md dark:border-[#FF8A3D] dark:bg-[#1E293B]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">{membershipOffer.title}</h3>
              <StatusBadge active={isMembershipActive} label={isMembershipActive ? 'Ativa' : 'Pendente'} />
            </div>
            <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">{membershipOffer.description}</p>
            <p className="mt-5 text-4xl font-black text-orange-500 dark:text-orange-400">{formatMoney(membershipOffer.amount, 'USD')}</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {isMembershipActive ? `Expira em ${membershipExpirationDate || '-'}` : 'Renovação de 30 dias da base do workspace.'}
            </p>
            <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-xs font-semibold text-orange-700 dark:border-orange-900/40 dark:bg-orange-950/15 dark:text-orange-300">
              {hasDetectedBankroll
                ? `Banca detectada: ${formatMoney(monthlyBankrollUsd, 'USD')} -> mensalidade atual ${formatMoney(membershipTier.amount, 'USD')}.`
                : `Banca ainda nao detectada. A faixa inicial de ${formatMoney(DEFAULT_MONTHLY_AMOUNT, 'USD')} sera usada ate a primeira leitura de saldo.`}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/15 dark:text-emerald-300">
            Sem mensalidade ativa, nenhum pacote libera acesso operacional.
          </div>
        </div>

        <FeatureList items={[
          `Mensalidade inicial de ${formatMoney(DEFAULT_MONTHLY_AMOUNT, 'USD')}`,
          'Tabela mensal conforme o valor da banca',
          'Obrigatoria para Copy Trading, AutoTrader e listas'
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
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#FF6B00]">Planos mensais</p>
            <h3 className="mt-2 text-xl font-black text-gray-900 dark:text-white">Escolha o plano de acordo com o valor da sua banca</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Mensalidade inicial: {formatMoney(DEFAULT_MONTHLY_AMOUNT, 'USD')}. Sem produtos. Tabela mensal conforme o valor da banca.
            </p>
          </div>
          <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-xs font-semibold text-orange-700 dark:border-orange-900/40 dark:bg-orange-950/15 dark:text-orange-300">
            Mais lucro para voce! Automatize. Opere. Escale.
          </div>
        </div>

        <div className="mt-6 space-y-3 md:hidden">
          {MONTHLY_PRICING_TIERS.map((tier) => {
            const isCurrent = tier.id === membershipTier.id;
            return (
              <div
                key={tier.id}
                className={`rounded-2xl border px-4 py-4 ${
                  isCurrent
                    ? 'border-[#FF6B00] bg-orange-50 dark:bg-orange-950/20'
                    : 'border-gray-200 bg-gray-50 dark:border-[#334155] dark:bg-[#0B1220]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-gray-400">Valor da banca</p>
                    <p className={`mt-1 text-sm font-bold ${isCurrent ? 'text-orange-700 dark:text-orange-300' : 'text-gray-900 dark:text-white'}`}>{tier.label}</p>
                  </div>
                  {isCurrent ? (
                    <span className="rounded-full bg-[#FF6B00] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-white">
                      Atual
                    </span>
                  ) : null}
                </div>
                <div className="mt-3">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-gray-400">Valor mensal</p>
                  <p className={`mt-1 text-2xl font-black ${isCurrent ? 'text-orange-600 dark:text-orange-300' : 'text-gray-900 dark:text-white'}`}>
                    {formatMoney(tier.amount, 'USD')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 hidden overflow-hidden rounded-3xl border border-gray-200 dark:border-[#334155] md:block">
          <div className="grid grid-cols-2 bg-gray-50 px-5 py-3 text-[11px] font-extrabold uppercase tracking-[0.16em] text-gray-500 dark:bg-[#0B1220] dark:text-[#94A3B8]">
            <span>Valor da banca</span>
            <span>Valor mensal</span>
          </div>
          {MONTHLY_PRICING_TIERS.map((tier) => {
            const isCurrent = tier.id === membershipTier.id;
            return (
              <div
                key={tier.id}
                className={`grid grid-cols-2 px-5 py-4 text-sm ${
                  isCurrent
                    ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-300'
                    : 'border-t border-gray-100 text-gray-700 dark:border-[#334155] dark:text-gray-300'
                }`}
              >
                <span className="font-semibold">{tier.label}</span>
                <span className="font-black">{formatMoney(tier.amount, 'USD')}</span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {packages.map((pkg, index) => (
          <PackageCard
            key={pkg.packageCode}
            title={pkg.title}
            price={pkg.amount}
            description={pkg.description}
            statusLabel={pkg.statusLabel}
            isActive={pkg.isActive}
            note={pkg.note}
            features={pkg.features}
            ctaLabel="Comprar pacote de 30 dias"
            tone={index === 2 ? 'highlight' : 'default'}
            formatMoney={formatMoney}
            onBuy={() => buyDaysSimulate(pkg)}
          />
        ))}
      </div>

      <section className="rounded-[28px] border border-dashed border-[#FF6B00] bg-white p-7 shadow-sm dark:border-[#FF8A3D] dark:bg-[#1E293B]">
        <h3 className="text-lg font-black text-gray-900 dark:text-white">Como o acesso fica distribuído</h3>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-[#334155] dark:bg-[#0B1220]">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">Pacote 1</p>
            <p className="mt-2 text-sm font-bold text-gray-900 dark:text-white">Copy Trading</p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Mensalidade conforme a banca + pacote de {formatMoney(40, 'USD')}.</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-[#334155] dark:bg-[#0B1220]">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">Pacote 2</p>
            <p className="mt-2 text-sm font-bold text-gray-900 dark:text-white">Automatizador + 3 Listas</p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Mensalidade conforme a banca + pacote de {formatMoney(60, 'USD')}.</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-[#334155] dark:bg-[#0B1220]">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">Pacote 3</p>
            <p className="mt-2 text-sm font-bold text-gray-900 dark:text-white">Acesso a todos os produtos</p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Mensalidade conforme a banca + pacote de {formatMoney(80, 'USD')}.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
