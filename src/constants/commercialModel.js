export const DEFAULT_COMMERCIAL_CONFIG = {
  boltName: 'BOT',
  monthlyUsd: 36,
  minCapitalUsd: 250,
  riskDisclaimer: 'Rentabilidade nao e garantida e envolve riscos.',
  levels: [
    { level: 1, percent: 10 },
    { level: 2, percent: 5 },
    { level: 3, percent: 3 },
    { level: 4, percent: 2 }
  ],
  signalPlans: [
    { code: 'signal_single', name: 'Sinal avulso', amountUsd: 0, billing: 'one_time', active: true },
    { code: 'signal_subscription', name: 'Assinatura de sinais', amountUsd: 0, billing: 'subscription', active: true }
  ]
};

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeCommercialConfig(input) {
  const source = input && typeof input === 'object' ? input : {};
  const levels = Array.isArray(source.levels) && source.levels.length
    ? source.levels
    : DEFAULT_COMMERCIAL_CONFIG.levels;
  const signalPlans = Array.isArray(source.signalPlans) && source.signalPlans.length
    ? source.signalPlans
    : DEFAULT_COMMERCIAL_CONFIG.signalPlans;

  return {
    boltName: (() => {
      const name = String(source.boltName || DEFAULT_COMMERCIAL_CONFIG.boltName).trim();
      if (!name || name.toUpperCase() === 'BOLT') return 'BOT';
      return name;
    })(),
    monthlyUsd: Math.max(0, toNumber(source.monthlyUsd, DEFAULT_COMMERCIAL_CONFIG.monthlyUsd)),
    minCapitalUsd: Math.max(0, toNumber(source.minCapitalUsd, DEFAULT_COMMERCIAL_CONFIG.minCapitalUsd)),
    riskDisclaimer: String(source.riskDisclaimer || DEFAULT_COMMERCIAL_CONFIG.riskDisclaimer).trim(),
    levels: levels
      .map((item, index) => ({
        level: Math.max(1, Math.round(toNumber(item?.level, index + 1))),
        percent: Math.max(0, toNumber(item?.percent, 0))
      }))
      .filter((item) => item.level <= 10)
      .sort((a, b) => a.level - b.level),
    signalPlans: signalPlans.map((item, index) => ({
      code: String(item?.code || `signal_plan_${index + 1}`).trim(),
      name: String(item?.name || `Plano ${index + 1}`).trim(),
      amountUsd: Math.max(0, toNumber(item?.amountUsd, 0)),
      billing: item?.billing === 'subscription' ? 'subscription' : 'one_time',
      active: item?.active !== false
    }))
  };
}

export function networkSharePercent(config) {
  return (config?.levels || []).reduce((sum, item) => sum + Number(item.percent || 0), 0);
}

export function levelPercent(config, level) {
  const match = (config?.levels || []).find((item) => Number(item.level) === Number(level));
  return Number(match?.percent || 0);
}

export function applyCommercialOverview(overview, config) {
  const rules = normalizeCommercialConfig(config);
  const sourceLevels = Array.isArray(overview?.network?.levels) ? overview.network.levels : [];
  const byLevel = new Map(sourceLevels.map((item) => [Number(item.level), item]));

  const levels = rules.levels.map((rule) => {
    const source = byLevel.get(rule.level) || { nodes: [] };
    const rate = rule.percent / 100;
    const nodes = (source.nodes || []).map((node) => {
      const estimatedCommission = node?.isActive ? Math.round(rules.monthlyUsd * rate * 100) / 100 : 0;
      return { ...node, estimatedCommission };
    });
    const estimatedAmount = Math.round(nodes.reduce((sum, node) => sum + Number(node.estimatedCommission || 0), 0) * 100) / 100;
    return {
      level: rule.level,
      percent: `${rule.percent}%`,
      totalCount: nodes.length,
      activeCount: nodes.filter((node) => node.isActive).length,
      estimatedAmount,
      nodes
    };
  });

  const unilevelEstimatedAmount = Math.round(levels.reduce((sum, item) => sum + item.estimatedAmount, 0) * 100) / 100;
  const maxDepthReached = levels.reduce((max, item) => (item.totalCount > 0 ? Math.max(max, item.level) : max), 0);

  return {
    ...overview,
    summary: {
      ...(overview?.summary || {}),
      unilevelEstimatedAmount,
      matrixEstimatedAmount: 0,
      totalEstimatedAmount: unilevelEstimatedAmount,
      maxDepthReached
    },
    network: {
      ...(overview?.network || {}),
      level1: levels.find((item) => item.level === 1)?.nodes || [],
      level2: levels.find((item) => item.level === 2)?.nodes || [],
      levels
    }
  };
}
