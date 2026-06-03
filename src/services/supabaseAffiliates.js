import { supabase, supabaseEnabled } from '../lib/supabase/client';

function assertSupabase() {
  if (!supabaseEnabled || !supabase) {
    throw new Error('Supabase is not configured.');
  }
}

function mapAffiliateNode(row) {
  return {
    profileId: row?.profileId || '',
    emailMasked: row?.emailMasked || 'sem-email',
    joinedAt: row?.joinedAt || null,
    licenseStatus: row?.licenseStatus || 'expired',
    accessType: row?.accessType || 'trial',
    planName: row?.planName || 'trial',
    expiresAt: row?.expiresAt || null,
    hasAccess: Boolean(row?.hasAccess)
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
      level1Count: Number(summary.level1Count || 0),
      level2Count: Number(summary.level2Count || 0),
      totalLeads: Number(summary.totalLeads || 0),
      activeCount: Number(summary.activeCount || 0),
      activeLevel1Count: Number(summary.activeLevel1Count || 0),
      activeLevel2Count: Number(summary.activeLevel2Count || 0)
    },
    network: {
      level1: Array.isArray(network.level1) ? network.level1.map(mapAffiliateNode) : [],
      level2: Array.isArray(network.level2) ? network.level2.map(mapAffiliateNode) : []
    }
  };
}
