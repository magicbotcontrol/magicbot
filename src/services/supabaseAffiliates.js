import { supabase, supabaseEnabled } from '../lib/supabase/client';

function assertSupabase() {
  if (!supabaseEnabled || !supabase) {
    throw new Error('Supabase is not configured.');
  }
}

function mapAffiliateNode(row) {
  return {
    profileId: row?.profileId || '',
    username: row?.username || 'user',
    emailMasked: row?.emailMasked || 'sem-email',
    joinedAt: row?.joinedAt || null,
    licenseStatus: row?.licenseStatus || 'expired',
    accessType: row?.accessType || 'trial',
    planName: row?.planName || 'trial',
    expiresAt: row?.expiresAt || null,
    hasAccess: Boolean(row?.hasAccess),
    isActive: Boolean(row?.isActive),
    monthlyFeeAmount: Number(row?.monthlyFeeAmount || 0),
    estimatedCommission: Number(row?.estimatedCommission || 0),
    positionOrder: Number(row?.positionOrder || 0),
    levelSlot: Number(row?.levelSlot || 0),
    childPosition: Number(row?.childPosition || 0),
    matrixParentProfileId: row?.matrixParentProfileId || null,
    receiverProfileId: row?.receiverProfileId || null,
    receiverUsername: row?.receiverUsername || '',
    paysCurrentUser: Boolean(row?.paysCurrentUser)
  };
}

function mapUnilevelLevel(row) {
  return {
    level: Number(row?.level || 0),
    totalCount: Number(row?.totalCount || 0),
    activeCount: Number(row?.activeCount || 0),
    estimatedAmount: Number(row?.estimatedAmount || 0),
    nodes: Array.isArray(row?.nodes) ? row.nodes.map(mapAffiliateNode) : []
  };
}

function mapMatrixRow(row) {
  return {
    level: Number(row?.level || 0),
    capacity: Number(row?.capacity || 0),
    filledCount: Number(row?.filledCount || 0),
    emptyCount: Number(row?.emptyCount || 0),
    estimatedAmount: Number(row?.estimatedAmount || 0),
    nodes: Array.isArray(row?.nodes) ? row.nodes.map(mapAffiliateNode) : []
  };
}

export async function getAffiliateOverview() {
  assertSupabase();

  const result = await supabase.rpc('get_my_affiliate_overview');
  if (result.error) {
    throw result.error;
  }

  const payload = result.data || {};
  const summary = payload.summary || {};
  const network = payload.network || {};

  return {
    summary: {
      canReceiveBonuses: Boolean(summary.canReceiveBonuses),
      level1Count: Number(summary.level1Count || 0),
      level2Count: Number(summary.level2Count || 0),
      totalLeads: Number(summary.totalLeads || 0),
      networkCount: Number(summary.networkCount || 0),
      activeCount: Number(summary.activeCount || 0),
      activeNetworkCount: Number(summary.activeNetworkCount || 0),
      activeLevel1Count: Number(summary.activeLevel1Count || 0),
      activeLevel2Count: Number(summary.activeLevel2Count || 0),
      maxDepthReached: Number(summary.maxDepthReached || 0),
      matrixFilledCount: Number(summary.matrixFilledCount || 0),
      matrixCapacity: Number(summary.matrixCapacity || 0),
      unilevelEstimatedAmount: Number(summary.unilevelEstimatedAmount || 0),
      matrixEstimatedAmount: Number(summary.matrixEstimatedAmount || 0),
      totalEstimatedAmount: Number(summary.totalEstimatedAmount || 0)
    },
    network: {
      level1: Array.isArray(network.level1) ? network.level1.map(mapAffiliateNode) : [],
      level2: Array.isArray(network.level2) ? network.level2.map(mapAffiliateNode) : [],
      levels: Array.isArray(network.levels) ? network.levels.map(mapUnilevelLevel) : []
    },
    matrix: {
      rows: Array.isArray(payload.matrix?.rows) ? payload.matrix.rows.map(mapMatrixRow) : []
    }
  };
}
