import { supabase, supabaseEnabled } from '../lib/supabase/client';

function assertSupabase() {
  if (!supabaseEnabled || !supabase) {
    throw new Error('Supabase is not configured.');
  }
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getDashboardMetrics(workspaceId) {
  assertSupabase();
  if (!workspaceId) {
    return {
      totalProfitLoss: 0,
      winRate: 0,
      activeSignals: 0,
      operations: 0,
      weeklyProfitLoss: Array.from({ length: 7 }, () => 0),
      recentLogs: []
    };
  }

  const now = new Date();
  const start = startOfDay(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000));
  const startIso = start.toISOString();

  const [allOpsResult, weekOpsResult] = await Promise.all([
    supabase
      .from('live_operations')
      .select('profit_loss, status, created_at, operation_time, asset, tf, dir')
      .eq('workspace_id', workspaceId),
    supabase
      .from('live_operations')
      .select('profit_loss, status, created_at, operation_time, asset, tf, dir')
      .eq('workspace_id', workspaceId)
      .gte('created_at', startIso)
  ]);

  if (allOpsResult.error) throw allOpsResult.error;
  if (weekOpsResult.error) throw weekOpsResult.error;

  const allOps = allOpsResult.data || [];
  const ended = allOps.filter((op) => op.status === 'ended');

  const totalProfitLoss = ended.reduce((acc, op) => acc + (Number(op.profit_loss) || 0), 0);
  const wins = ended.filter((op) => (Number(op.profit_loss) || 0) > 0).length;
  const losses = ended.filter((op) => (Number(op.profit_loss) || 0) < 0).length;
  const winRate = wins + losses ? Math.round((wins / (wins + losses)) * 1000) / 10 : 0;

  const activeSignals = allOps.filter((op) => op.status === 'active').length;
  const operations = allOps.length;

  const weeklyProfitLoss = Array.from({ length: 7 }, () => 0);
  const weekOps = weekOpsResult.data || [];
  weekOps.forEach((op) => {
    if (!op.created_at) return;
    const dayStart = startOfDay(op.created_at).getTime();
    const idx = Math.floor((dayStart - start.getTime()) / (24 * 60 * 60 * 1000));
    if (idx < 0 || idx > 6) return;
    if (op.status !== 'ended') return;
    weeklyProfitLoss[idx] += Number(op.profit_loss) || 0;
  });

  const recentLogs = [...ended]
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 8)
    .map((op) => {
      const pl = Number(op.profit_loss) || 0;
      const type = pl > 0 ? 'WIN' : pl < 0 ? 'LOSS' : 'FLAT';
      return {
        time: op.operation_time || '--:--',
        type,
        asset: op.asset || '-',
        tf: op.tf || '-',
        dir: op.dir || '-'
      };
    });

  return {
    totalProfitLoss,
    winRate,
    activeSignals,
    operations,
    weeklyProfitLoss,
    recentLogs
  };
}

