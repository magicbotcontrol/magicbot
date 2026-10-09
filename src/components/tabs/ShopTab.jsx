import { Icons } from '../../constants/icons';
import { networkSharePercent } from '../../constants/commercialModel';

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

function PackageCard({ title, price, description, highlight, statusLabel, isActive, note, features, onBuy, ctaLabel, tone = 'default', formatMoney }) {
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
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{highlight}</p>

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
  commercialConfig
}) {
  const boltName = commercialConfig?.boltName || 'BOT';
  const monthlyUsd = Number(commercialConfig?.monthlyUsd || 36);
  const minCapitalUsd = Number(commercialConfig?.minCapitalUsd || 250);
  const hasDetectedBankroll = Number.isFinite(Number(monthlyBankrollUsd)) && Number(monthlyBankrollUsd) > 0;
  const membershipOffer = {
    kind: 'membership',
    title: `Mensalidade ${boltName}`,
    description: `A mensalidade libera o acesso principal do ${boltName} por 30 dias. O capital inicial recomendado e de ${formatMoney(minCapitalUsd, 'USD')}.`,
    amount: monthlyUsd,
    days: 30,
    planName: 'membership-monthly-bot',
    tierId: 'bot',
    tierLabel: boltName,
    bankrollUsd: Number(monthlyBankrollUsd || 0),
    manualOverride: false,
    successMessage: `Mensalidade ${boltName} ativada por 30 dias.`
  };

  const packages = [
    {
      kind: 'package',
      packageCode: 'copy_trading_package',
      title: 'Pacote Copy Trading',
      amount: 40,
      description: 'Libera exclusivamente o produto Copy Trading para voce operar com mais confianca.',
      highlight: 'Conecte sua conta e acompanhe cada movimento com mais seguranca.',
      successMessage: 'Pacote Copy Trading ativado com sucesso.',
      statusLabel: hasCopyAccess ? 'Ativo' : 'Inativo',
      isActive: hasCopyAccess,
      note: isMembershipActive ? `Mensalidade ${boltName} validada. Este modulo operacional pode ser liberado.` : `Este modulo exige a mensalidade ${boltName} de ${formatMoney(monthlyUsd, 'USD')}.`,
      features: [
        'Acesso ao Copy Trading',
        'Entrada objetiva para o modo Copy',
        'Sem liberar Automatizador ou listas'
      ]
    }
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-fade-in">
      <div className="text-center space-y-3">
        <span className="inline-flex items-center rounded-full bg-orange-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#FF6B00] dark:bg-orange-950/30 dark:text-[#FF8A3D]">
          Loja de pacotes
        </span>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white md:text-3xl">BOT e o produto principal</h2>
        <p className="mx-auto max-w-3xl text-sm text-gray-500 dark:text-gray-400">
          Mensalidade fixa de {formatMoney(monthlyUsd, 'USD')}. Capital inicial recomendado de {formatMoney(minCapitalUsd, 'USD')}. {commercialConfig?.riskDisclaimer}
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
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/15 dark:text-amber-300">
              {commercialConfig?.riskDisclaimer} Capital recomendado: {formatMoney(minCapitalUsd, 'USD')}.
              {hasDetectedBankroll ? ` Banca informada: ${formatMoney(monthlyBankrollUsd, 'USD')}.` : ' A banca ainda nao foi lida da corretora.'}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/15 dark:text-emerald-300">
            Sem mensalidade ativa, nenhum pacote libera acesso operacional.
          </div>
        </div>

        <FeatureList items={[
          `Mensalidade ${boltName} de ${formatMoney(monthlyUsd, 'USD')}`,
          `Entrada recomendada de ${formatMoney(minCapitalUsd, 'USD')}`,
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
          {networkSharePercent(commercialConfig)}% de cada mensalidade de {formatMoney(monthlyUsd, 'USD')}
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
                {formatMoney(monthlyUsd * level.percent / 100, 'USD')}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6">
        {packages.map((pkg, index) => (
          <PackageCard
            key={pkg.packageCode}
            title={pkg.title}
            price={pkg.amount}
            description={pkg.description}
            highlight={pkg.highlight}
            statusLabel={pkg.statusLabel}
            isActive={pkg.isActive}
            note={pkg.note}
            features={pkg.features}
            ctaLabel="Ativar pacote agora"
            tone={index === 0 ? 'highlight' : 'default'}
            formatMoney={formatMoney}
            onBuy={() => buyDaysSimulate(pkg)}
          />
        ))}
      </div>

      <section className="rounded-[28px] border border-dashed border-[#FF6B00] bg-white p-7 shadow-sm dark:border-[#FF8A3D] dark:bg-[#1E293B]">
        <h3 className="text-lg font-black text-gray-900 dark:text-white">Como o acesso fica distribuído</h3>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-[#334155] dark:bg-[#0B1220]">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">Pacote 1</p>
            <p className="mt-2 text-sm font-bold text-gray-900 dark:text-white">Copy Trading</p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">A mensalidade {boltName} de {formatMoney(monthlyUsd, 'USD')} e o acesso principal. Este modulo operacional continua separado.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
