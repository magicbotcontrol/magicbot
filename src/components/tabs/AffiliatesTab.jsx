import { useMemo, useState } from 'react';
import { Icons } from '../../constants/icons';

function formatJoinedAt(value) {
  if (!value) return '--';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(value));
}

function fallbackMoney(amount) {
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(amount || 0));
  } catch {
    return `R$ ${Number(amount || 0).toFixed(2)}`;
  }
}

function resolveAccessLabel(node, t, labels) {
  if (node.isActive) return labels.activeStatus;
  if (node.accessType === 'admin') return t.adminSubscriptionAdmin;
  if (node.accessType === 'waiver') return t.adminSubscriptionWaiver;
  if (node.licenseStatus === 'trial') return t.adminSubscriptionTrial;
  if (node.licenseStatus === 'active') return t.adminSubscriptionSubscription;
  return t.affiliateExpiredAccess || labels.inactiveStatus;
}

function PersonPositionIcon({ isActive, className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="4" fill={isActive ? '#22C55E' : '#94A3B8'} opacity="0.22" />
      <circle cx="12" cy="8" r="3.2" stroke={isActive ? '#16A34A' : '#64748B'} strokeWidth="1.6" />
      <path d="M5.5 19.5c0-3.037 2.91-5.5 6.5-5.5s6.5 2.463 6.5 5.5" stroke={isActive ? '#16A34A' : '#64748B'} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="18.5" cy="18.5" r="2.5" fill={isActive ? '#16A34A' : '#64748B'} />
    </svg>
  );
}

function AffiliateMatrixIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="5" r="2.2" fill="#FF6B00" />
      <circle cx="5" cy="12" r="2.2" fill="#FDBA74" />
      <circle cx="12" cy="12" r="2.2" fill="#FB923C" />
      <circle cx="19" cy="12" r="2.2" fill="#FDBA74" />
      <circle cx="5" cy="19" r="2.2" fill="#FED7AA" />
      <circle cx="12" cy="19" r="2.2" fill="#FDBA74" />
      <circle cx="19" cy="19" r="2.2" fill="#FED7AA" />
      <path d="M12 7.2V9.8M12 9.8H5M12 9.8H19M5 14.2V16.8M12 14.2V16.8M19 14.2V16.8" stroke="#FF6B00" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon({ expanded }) {
  return (
    <svg className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0l-4.25-4.51a.75.75 0 01.02-1.06z" clipRule="evenodd" />
    </svg>
  );
}

function MetricCard({ title, value, subtitle, accent = 'text-[#FF6B00]' }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#334155] dark:bg-[#1E293B]">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">{title}</p>
      <p className={`mt-2 text-2xl font-black ${accent}`}>{value}</p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
    </div>
  );
}

function SummaryMiniStat({ title, value, accent = 'text-gray-900 dark:text-white' }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50/90 p-4 dark:border-[#334155] dark:bg-[#0F172A]">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">{title}</p>
      <p className={`mt-2 text-xl font-black ${accent}`}>{value}</p>
    </div>
  );
}

function MatrixNodeCard({ node, t, labels, formatMoney }) {
  const statusClass = node.isActive
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
  const hasMatrixPosition = Number(node.positionOrder || 0) > 0;

  return (
    <div className="w-44 shrink-0 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-[#334155] dark:bg-[#0F172A]">
      <div className="flex items-start justify-between gap-3">
        <div className={`inline-flex rounded-2xl p-2 ${node.isActive ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
          <PersonPositionIcon isActive={node.isActive} className="h-6 w-6" />
        </div>
        {hasMatrixPosition ? (
          <div className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-500 dark:bg-slate-800 dark:text-slate-300">
            #{node.levelSlot || node.positionOrder}
          </div>
        ) : null}
      </div>

      <p className="mt-3 truncate text-sm font-bold text-gray-900 dark:text-white">@{node.username || 'user'}</p>
      <p className="mt-1 truncate text-[11px] text-gray-500 dark:text-gray-400">{node.emailMasked}</p>

      <div className="mt-3 space-y-2 text-[11px]">
        <span className={`inline-flex rounded-full px-2.5 py-1 font-bold ${statusClass}`}>
          {resolveAccessLabel(node, t, labels)}
        </span>
        <p className="text-gray-500 dark:text-gray-400">{labels.enteredOn}: {formatJoinedAt(node.joinedAt)}</p>
        {hasMatrixPosition ? (
          <p className="text-gray-500 dark:text-gray-400">{labels.positionLabel}: #{node.positionOrder}</p>
        ) : null}
        {hasMatrixPosition ? (
          <p className="text-gray-500 dark:text-gray-400">{labels.paymentLabel}: {node.receiverUsername ? `@${node.receiverUsername}` : '--'}</p>
        ) : null}
        <p className={`font-bold ${Number(node.estimatedCommission || 0) > 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-gray-500 dark:text-gray-400'}`}>
          {labels.bonusLabel}: {formatMoney(node.estimatedCommission || 0)}
        </p>
      </div>
    </div>
  );
}

function UnilevelLevelCard({ item, t, labels, formatMoney }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-[#334155] dark:bg-[#1E293B]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-gray-900 dark:text-white">
            {labels.levelWord} {item.level}
          </h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {labels.unilevelLineSubtitle.replace('{percent}', '3%')}
          </p>
        </div>
        <div className="rounded-2xl bg-orange-50 px-3 py-2 text-right dark:bg-orange-950/20">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-500">{labels.estimatedMonthly}</p>
          <p className="mt-1 text-sm font-black text-orange-600 dark:text-orange-300">{formatMoney(item.estimatedAmount || 0)}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-2xl bg-gray-50 p-3 dark:bg-[#0F172A]">
          <p className="text-[11px] text-gray-400 dark:text-gray-500">{labels.people}</p>
          <p className="mt-1 text-lg font-black text-gray-900 dark:text-white">{item.totalCount || 0}</p>
        </div>
        <div className="rounded-2xl bg-emerald-50 p-3 dark:bg-emerald-950/20">
          <p className="text-[11px] text-emerald-600 dark:text-emerald-300">{labels.activeStatus}</p>
          <p className="mt-1 text-lg font-black text-emerald-700 dark:text-emerald-200">{item.activeCount || 0}</p>
        </div>
        <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-800">
          <p className="text-[11px] text-slate-500 dark:text-slate-300">{labels.inactiveStatus}</p>
          <p className="mt-1 text-lg font-black text-slate-700 dark:text-slate-100">{Math.max((item.totalCount || 0) - (item.activeCount || 0), 0)}</p>
        </div>
      </div>

      {item.nodes?.length ? (
        <div className="mt-5 flex gap-3 overflow-x-auto pb-2">
          {item.nodes.map((node) => (
            <MatrixNodeCard
              key={`unilevel-${item.level}-${node.profileId}`}
              node={node}
              t={t}
              labels={labels}
              formatMoney={formatMoney}
            />
          ))}
        </div>
      ) : (
        <p className="mt-5 text-xs text-gray-500 dark:text-gray-400">{labels.noUsersInLevel}</p>
      )}
    </div>
  );
}

function MatrixRowAccordion({ row, expanded, onToggle, t, labels, formatMoney }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-[#334155] dark:bg-[#1E293B]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center rounded-full bg-orange-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-orange-600 dark:bg-orange-950/20 dark:text-orange-300">
              {labels.rowWord} {row.level}
            </span>
            <span className="text-sm font-black text-gray-900 dark:text-white">
              {row.filledCount}/{row.capacity} {labels.filledWord}
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {labels.matrixCapacityLine
              .replace('{capacity}', String(row.capacity))
              .replace('{empty}', String(row.emptyCount || 0))}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-right dark:bg-emerald-950/20">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">{labels.estimatedMonthly}</p>
            <p className="mt-1 text-sm font-black text-emerald-700 dark:text-emerald-200">{formatMoney(row.estimatedAmount || 0)}</p>
          </div>
          <span className="text-gray-500 dark:text-gray-300">
            <ChevronIcon expanded={expanded} />
          </span>
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-gray-100 px-5 pb-5 pt-4 dark:border-[#334155]">
          {row.nodes?.length ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {row.nodes.map((node) => (
                <MatrixNodeCard
                  key={`matrix-${row.level}-${node.profileId}-${node.positionOrder}`}
                  node={node}
                  t={t}
                  labels={labels}
                  formatMoney={formatMoney}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">{labels.emptyMatrixRow}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function buildLabels(t) {
  return {
    affiliateProgram: t.affiliateProgramme || 'Programa de Afiliados',
    unilevelTitle: t.affiliateUnilevelTitle || 'Unilevel 10 niveis',
    matrixTitle: t.affiliateMatrixTitle || 'Matriz 3x10',
    hybridTitle: t.affiliateHybridTitle || 'Ganhos recorrentes da rede',
    hybridSubtitle: t.affiliateHybridSubtitle || 'Acompanhe o unilevel de 10 niveis e a matriz fixa 3x10 com bonus de 3% por usuario elegivel.',
    unilevelDescription: t.affiliateUnilevelDescription || 'Do 1 ao 10 nivel, cada usuario ativo abaixo da sua rede gera 3% sobre a mensalidade.',
    matrixDescription: t.affiliateMatrixDescription || 'A matriz preenche da esquerda para a direita. As posicoes sao fixas e o pagamento sobe ate encontrar um usuario ativo.',
    estimatedMonthly: t.affiliateEstimatedMonthly || 'Estimativa mensal',
    receiveRequirement: t.affiliateReceiveRequirement || 'Para receber bonus, o usuario precisa estar ativo e em dia com a mensalidade.',
    receiveBlocked: t.affiliateReceiveBlocked || 'Sua conta precisa estar ativa para receber bonus da rede e da matriz.',
    activeStatus: t.active || 'Ativo',
    inactiveStatus: t.affiliateInactive || 'Inativo',
    enteredOn: t.affiliateJoinedAt || 'Entrou em',
    positionLabel: t.affiliateMatrixPosition || 'Posicao',
    paymentLabel: t.affiliatePaymentTo || 'Paga para',
    bonusLabel: t.affiliateBonusLabel || 'Bonus',
    rowWord: t.affiliateRowWord || 'Linha',
    levelWord: t.affiliateLevelWord || 'Nivel',
    filledWord: t.affiliateFilledWord || 'preenchidos',
    people: t.affiliatePeople || 'Pessoas',
    matrixCapacityLine: t.affiliateMatrixCapacityLine || 'Capacidade total: {capacity} posicoes. Vazias agora: {empty}.',
    unilevelLineSubtitle: t.affiliateUnilevelLineSubtitle || '{percent} sobre cada mensalidade elegivel deste nivel.',
    noUsersInLevel: t.affiliateNoUsersLevel || 'Nenhum usuario nesta linha ainda.',
    emptyMatrixRow: t.affiliateEmptyMatrixRow || 'Nenhuma posicao preenchida nesta linha da matriz.',
    statusReady: t.affiliateStatusReady || 'Liberado para receber bonus',
    statusPending: t.affiliateStatusPending || 'Regularize a mensalidade para voltar a receber',
    networkDepth: t.affiliateNetworkDepth || 'Profundidade atual da rede',
    matrixFilled: t.affiliateMatrixFilled || 'Posicoes preenchidas na matriz'
  };
}

export function AffiliatesTab({
  handleCopyText,
  t,
  formatMoney: formatMoneyProp,
  username,
  referralCode,
  summary,
  network,
  matrix,
  isLoading
}) {
  const [expandedRows, setExpandedRows] = useState(() => ({ 1: true, 2: true }));
  const resolvedUsername = String(username || '').trim().toLowerCase();
  const resolvedReferralCode = String(referralCode || '').trim().toUpperCase();
  const configuredUrl = import.meta.env.VITE_APP_URL?.trim();
  const fallbackUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const baseUrl = (configuredUrl || fallbackUrl).replace(/\/$/, '');
  const referralReference = resolvedUsername || resolvedReferralCode;
  const referralLink = referralReference ? `${baseUrl}/cadastro/${encodeURIComponent(referralReference)}` : '';
  const safeSummary = summary || {};
  const safeNetwork = network || {};
  const safeMatrix = matrix || {};
  const formatMoney = (amount) => (typeof formatMoneyProp === 'function' ? formatMoneyProp(amount, 'BRL') : fallbackMoney(amount));
  const labels = buildLabels(t);

  const levels = useMemo(() => {
    if (Array.isArray(safeNetwork.levels) && safeNetwork.levels.length) {
      return safeNetwork.levels;
    }

    return Array.from({ length: 10 }, (_, index) => ({
      level: index + 1,
      totalCount: 0,
      activeCount: 0,
      estimatedAmount: 0,
      nodes: []
    }));
  }, [safeNetwork.levels]);

  const matrixRows = useMemo(() => {
    if (Array.isArray(safeMatrix.rows) && safeMatrix.rows.length) {
      return safeMatrix.rows;
    }

    return Array.from({ length: 10 }, (_, index) => ({
      level: index + 1,
      capacity: Math.pow(3, index + 1),
      filledCount: 0,
      emptyCount: Math.pow(3, index + 1),
      estimatedAmount: 0,
      nodes: []
    }));
  }, [safeMatrix.rows]);

  const toggleRow = (level) => {
    setExpandedRows((current) => ({
      ...current,
      [level]: !current[level]
    }));
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8 rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm dark:border-[#334155] dark:bg-[#1E293B]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full bg-orange-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#FF6B00] dark:bg-orange-950/30 dark:text-orange-300">
                <span className="mr-2 inline-flex rounded-full bg-white/70 p-1 dark:bg-[#0F172A]">
                  <AffiliateMatrixIcon className="h-4 w-4" />
                </span>
                {labels.affiliateProgram}
              </div>
              <h2 className="mt-4 text-2xl font-black text-gray-900 dark:text-white xl:text-[2rem]">{labels.hybridTitle}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">{labels.hybridSubtitle}</p>
            </div>
            <div className={`rounded-2xl px-4 py-3 text-sm font-bold ${safeSummary.canReceiveBonuses ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-300'}`}>
              {safeSummary.canReceiveBonuses ? labels.statusReady : labels.statusPending}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-5 dark:border-orange-900/40 dark:bg-orange-950/10">
              <div className="flex items-center gap-3">
                <span className="inline-flex rounded-2xl bg-white p-2 text-orange-500 shadow-sm dark:bg-[#0F172A]">
                  {Icons.Users()}
                </span>
                <div>
                  <h3 className="text-base font-black text-gray-900 dark:text-white">{labels.unilevelTitle}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">3% do 1 ao 10 nivel</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-gray-600 dark:text-gray-300">{labels.unilevelDescription}</p>
            </div>

            <div className="rounded-3xl border border-blue-200 bg-blue-50/70 p-5 dark:border-blue-900/40 dark:bg-blue-950/10">
              <div className="flex items-center gap-3">
                <span className="inline-flex rounded-2xl bg-white p-2 text-blue-500 shadow-sm dark:bg-[#0F172A]">
                  <AffiliateMatrixIcon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-gray-900 dark:text-white">{labels.matrixTitle}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">3 na linha 1, 9 na linha 2, ate a linha 10</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-gray-600 dark:text-gray-300">{labels.matrixDescription}</p>
            </div>

            <div className={`rounded-3xl border p-5 lg:col-span-2 2xl:col-span-1 ${safeSummary.canReceiveBonuses ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-950/10' : 'border-rose-200 bg-rose-50/70 dark:border-rose-900/40 dark:bg-rose-950/10'}`}>
              <p className={`text-[10px] font-extrabold uppercase tracking-[0.18em] ${safeSummary.canReceiveBonuses ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}`}>
                {labels.estimatedMonthly}
              </p>
              <p className={`mt-3 text-3xl font-black ${safeSummary.canReceiveBonuses ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}`}>
                {formatMoney(safeSummary.totalEstimatedAmount || 0)}
              </p>
              <p className={`mt-3 text-sm leading-6 ${safeSummary.canReceiveBonuses ? 'text-emerald-700 dark:text-emerald-200' : 'text-rose-700 dark:text-rose-200'}`}>
                {safeSummary.canReceiveBonuses ? labels.receiveRequirement : labels.receiveBlocked}
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <SummaryMiniStat title={labels.networkDepth} value={String(safeSummary.maxDepthReached || 0)} accent="text-[#FF6B00] dark:text-orange-300" />
            <SummaryMiniStat title={t.leads || 'Leads'} value={String(safeSummary.networkCount || safeSummary.totalLeads || 0)} accent="text-[#FF6B00] dark:text-orange-300" />
            <SummaryMiniStat title={t.active || labels.activeStatus} value={String(safeSummary.activeNetworkCount || safeSummary.activeCount || 0)} accent="text-emerald-600 dark:text-emerald-300" />
            <SummaryMiniStat title={labels.matrixFilled} value={String(safeSummary.matrixFilledCount || 0)} accent="text-blue-600 dark:text-blue-300" />
          </div>
        </div>

        <div className="xl:col-span-4 space-y-6">
          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm dark:border-[#334155] dark:bg-[#1E293B]">
            <h3 className="text-sm font-black text-gray-900 dark:text-white">{t.yourReferralLink || 'Seu Link de Indicacao'}</h3>
            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-[#334155] dark:bg-[#0F172A]">
              <span className="truncate text-xs font-mono text-gray-500 dark:text-gray-300">
                {referralLink || (t.affiliateLinkUnavailable || 'Seu codigo de indicacao ainda nao esta disponivel. Atualize a sessao em alguns instantes.')}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (!referralLink) return;
                  handleCopyText(referralLink, t.affiliateLink || 'Link de Afiliado');
                }}
                disabled={!referralLink}
                className="rounded-xl p-2 text-[#FF6B00] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-[#1E293B]"
              >
                {Icons.CopyText()}
              </button>
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-gray-50 p-3 dark:bg-[#0F172A]">
              <svg width="42" height="42" viewBox="0 0 24 24" className="shrink-0 rounded-xl border border-gray-200 bg-white p-1 dark:border-[#334155] dark:bg-[#1E293B]">
                <rect width="24" height="24" fill="white" />
                <rect x="2" y="2" width="6" height="6" fill="black" />
                <rect x="16" y="2" width="6" height="6" fill="black" />
                <rect x="2" y="16" width="6" height="6" fill="black" />
                <rect x="4" y="4" width="2" height="2" fill="white" />
                <rect x="18" y="4" width="2" height="2" fill="white" />
                <rect x="4" y="18" width="2" height="2" fill="white" />
                <rect x="10" y="10" width="4" height="4" fill="black" />
              </svg>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">{t.shareQr || 'Divulgue usando o QR Code da sua rede.'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <MetricCard
              title="Unilevel mensal"
              value={formatMoney(safeSummary.unilevelEstimatedAmount || 0)}
              subtitle="Estimativa somada dos 10 niveis do unilevel."
              accent="text-orange-600 dark:text-orange-300"
            />
            <MetricCard
              title="Matriz mensal"
              value={formatMoney(safeSummary.matrixEstimatedAmount || 0)}
              subtitle="Estimativa dos pagamentos capturados pela matriz 3x10."
              accent="text-blue-600 dark:text-blue-300"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title={labels.estimatedMonthly}
          value={formatMoney(safeSummary.totalEstimatedAmount || 0)}
          subtitle="Projecao combinada do unilevel com a matriz no ciclo atual."
          accent="text-emerald-600 dark:text-emerald-300"
        />
        <MetricCard
          title="Unilevel"
          value={formatMoney(safeSummary.unilevelEstimatedAmount || 0)}
          subtitle="Estimativa mensal dos 10 niveis da rede."
          accent="text-orange-600 dark:text-orange-300"
        />
        <MetricCard
          title="Matriz"
          value={formatMoney(safeSummary.matrixEstimatedAmount || 0)}
          subtitle="Estimativa mensal capturada pela matriz 3x10."
          accent="text-blue-600 dark:text-blue-300"
        />
        <MetricCard
          title="Posicoes livres"
          value={String(Math.max((safeSummary.matrixCapacity || 0) - (safeSummary.matrixFilledCount || 0), 0))}
          subtitle={`${safeSummary.matrixCapacity || 0} posicoes totais na matriz 3x10.`}
          accent="text-slate-700 dark:text-slate-200"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white">{labels.unilevelTitle}</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Visualize os 10 niveis, os usuarios ativos em cada um e a estimativa mensal por nivel.
              </p>
            </div>
            {isLoading ? <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t.affiliateLoading || 'Carregando...'}</span> : null}
          </div>

          <div className="space-y-4">
            {levels.map((item) => (
              <UnilevelLevelCard
                key={`level-card-${item.level}`}
                item={item}
                t={t}
                labels={labels}
                formatMoney={formatMoney}
              />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm dark:border-[#334155] dark:bg-[#1E293B]">
            <div className="flex items-center gap-3">
              <span className="inline-flex rounded-2xl bg-orange-50 p-2 text-[#FF6B00] dark:bg-orange-950/20 dark:text-orange-300">
                <AffiliateMatrixIcon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-white">{labels.matrixTitle}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Bonus de 3% por entrada validada abaixo da sua matriz.</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-gray-50 p-4 dark:bg-[#0F172A]">
                <p className="text-[11px] text-gray-400 dark:text-gray-500">{labels.estimatedMonthly}</p>
                <p className="mt-2 text-xl font-black text-emerald-600 dark:text-emerald-300">{formatMoney(safeSummary.matrixEstimatedAmount || 0)}</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4 dark:bg-[#0F172A]">
                <p className="text-[11px] text-gray-400 dark:text-gray-500">{labels.matrixFilled}</p>
                <p className="mt-2 text-xl font-black text-blue-600 dark:text-blue-300">{safeSummary.matrixFilledCount || 0}</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {matrixRows.map((row) => (
                <button
                  key={`matrix-mini-${row.level}`}
                  type="button"
                  onClick={() => toggleRow(row.level)}
                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors ${expandedRows[row.level] ? 'border-orange-200 bg-orange-50 dark:border-orange-900/40 dark:bg-orange-950/10' : 'border-gray-200 bg-gray-50 dark:border-[#334155] dark:bg-[#0F172A]'}`}
                >
                  <div>
                    <p className="text-sm font-black text-gray-900 dark:text-white">{labels.rowWord} {row.level}</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">{row.filledCount}/{row.capacity} preenchidos</p>
                  </div>
                  <ChevronIcon expanded={Boolean(expandedRows[row.level])} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-black text-gray-900 dark:text-white">{labels.matrixTitle}</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Clique em cada linha para ampliar e acompanhar os bonecos, o username e para quem cada entrada esta pagando.
          </p>
        </div>

        {matrixRows.map((row) => (
          <MatrixRowAccordion
            key={`matrix-row-${row.level}`}
            row={row}
            expanded={Boolean(expandedRows[row.level])}
            onToggle={() => toggleRow(row.level)}
            t={t}
            labels={labels}
            formatMoney={formatMoney}
          />
        ))}
      </div>
    </div>
  );
}
