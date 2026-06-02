import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  TrendingUp, 
  Coins, 
  AlertTriangle, 
  Clock, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  Activity, 
  CheckCircle2,
  ListRestart,
  HelpCircle,
  BellRing
} from 'lucide-react';
import { UserCopy, Cobranca, Indicador, HistoricoBanca, SystemLog } from '../types';
import { ControlCopyDB, dateUtils } from '../lib/db';

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

type LogQuickFilter = 'todos' | 'auth' | 'rede' | 'perfil' | 'sessao_expirada';
type AuthLogCauseBadge = 'rede' | 'perfil' | 'credencial' | 'desconhecido';

const LOG_QUICK_FILTERS: Array<{
  id: LogQuickFilter;
  label: string;
  helper: string;
}> = [
  { id: 'todos', label: 'Todos', helper: 'Visao geral' },
  { id: 'auth', label: 'Auth', helper: 'Eventos de autenticacao' },
  { id: 'rede', label: 'Rede', helper: 'Falhas de conectividade' },
  { id: 'perfil', label: 'Perfil', helper: 'Inconsistencias em profiles' },
  { id: 'sessao_expirada', label: 'Sessao Expirada', helper: 'Tokens expirados ou invalidos' },
];

function isAuthLog(log: SystemLog) {
  return /auth/i.test(log.acao) || /restauracao_|sessao|credencial|perfil|falha_rede/i.test(log.detalhe);
}

function matchesLogQuickFilter(log: SystemLog, filter: LogQuickFilter) {
  const detail = log.detalhe.toLowerCase();

  if (filter === 'todos') {
    return true;
  }

  if (filter === 'auth') {
    return isAuthLog(log);
  }

  if (filter === 'rede') {
    return isAuthLog(log) && detail.includes('falha_rede');
  }

  if (filter === 'perfil') {
    return isAuthLog(log) && detail.includes('inconsistencia_perfil');
  }

  return isAuthLog(log) && (detail.includes('credencial_expirada') || detail.includes('sessao expirou'));
}

function getAuthLogCause(log: SystemLog): AuthLogCauseBadge | null {
  if (!isAuthLog(log)) {
    return null;
  }

  const detail = log.detalhe.toLowerCase();

  if (detail.includes('falha_rede')) {
    return 'rede';
  }

  if (detail.includes('inconsistencia_perfil')) {
    return 'perfil';
  }

  if (detail.includes('credencial_expirada') || detail.includes('sessao expirou')) {
    return 'credencial';
  }

  return 'desconhecido';
}

function getAuthBadgePresentation(cause: AuthLogCauseBadge) {
  if (cause === 'rede') {
    return {
      label: 'Rede',
      className: 'bg-sky-50 text-sky-700 border-sky-100',
      rowClassName: 'bg-sky-50/40',
    };
  }

  if (cause === 'perfil') {
    return {
      label: 'Perfil',
      className: 'bg-violet-50 text-violet-700 border-violet-100',
      rowClassName: 'bg-violet-50/40',
    };
  }

  if (cause === 'credencial') {
    return {
      label: 'Credencial',
      className: 'bg-amber-50 text-amber-700 border-amber-100',
      rowClassName: 'bg-amber-50/40',
    };
  }

  return {
    label: 'Auth',
    className: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    rowClassName: 'bg-zinc-50/60',
  };
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [users, setUsers] = useState<UserCopy[]>([]);
  const [indicators, setIndicators] = useState<Indicador[]>([]);
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [histories, setHistories] = useState<HistoricoBanca[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [logQuickFilter, setLogQuickFilter] = useState<LogQuickFilter>('todos');
  const [showCronResult, setShowCronResult] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [dbUsers, dbIndicators, dbCobrancas, dbHistoricos, dbLogs] = await Promise.all([
      ControlCopyDB.getUsers(),
      ControlCopyDB.getIndicators(),
      ControlCopyDB.getCobrancas(),
      ControlCopyDB.getHistoricos(),
      ControlCopyDB.getLogs(),
    ]);

    setUsers(dbUsers);
    setIndicators(dbIndicators);
    setCobrancas(dbCobrancas);
    setHistories(dbHistoricos);
    setLogs(dbLogs);
  };

  // Run Cron simulation
  const handleRunCron = async () => {
    const res = await ControlCopyDB.runDailyAutomations();
    await loadData();
    setShowCronResult(
      `Verificação diária executada com sucesso! ${res.updatedCharges} faturas vencidas marcadas como atrasadas e alertas de ciclos enviados.`
    );
    setTimeout(() => {
      setShowCronResult(null);
    }, 6000);
  };

  // Math metrics
  const activeUsersCount = users.filter(u => u.status === 'Ativo').length;
  const usersUnder1k = users.filter(u => u.banca_atual < 1000).length;
  const usersAbove1k = users.filter(u => u.banca_atual >= 1000).length;

  const totalReceivables = cobrancas
    .filter(c => c.status === 'Pendente' || c.status === 'Atrasado')
    .reduce((acc, curr) => acc + curr.valor_devido, 0);

  const totalCommissionsPaid = cobrancas
    .filter(c => c.status === 'Pago')
    .reduce((acc, curr) => acc + curr.valor_indicador, 0);

  const totalFirmRevenue = cobrancas
    .filter(c => c.status === 'Pago')
    .reduce((acc, curr) => acc + curr.valor_empresa, 0);

  // Today and Late issues count
  const todayStr = dateUtils.todayStr();
  const alertDueToday = users.filter(u => u.proxima_cobranca === todayStr);
  const lateCharges = cobrancas.filter(c => c.status === 'Atrasado');

  // Evolution monthly sum simulation for beautiful SVG plot
  // We can plot the profit history over previous balance updates
  const recentUpdates = [...histories]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(-7);
  const filteredLogs = logs.filter((log) => matchesLogQuickFilter(log, logQuickFilter)).slice(0, 8);
  const authLogCount = logs.filter((log) => matchesLogQuickFilter(log, 'auth')).length;

  return (
    <div className="space-y-6 pb-20">
      {/* Top Welcome Title & Automation row */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">
            Resumos Operacionais
          </h1>
          <p className="text-sm text-zinc-500">
            Gestão inteligente de banca, indicadores de copy trading e repasses financeiros.
          </p>
        </div>
        
        {/* Quick run automation */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunCron}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-950 hover:bg-zinc-900 text-white rounded-xl text-xs font-bold transition-all border border-zinc-800 shadow-sm"
          >
            <ListRestart className="w-4 h-4 text-[#FF5500]" />
            Simular Cron de Cobrança
          </button>
        </div>
      </div>

      {showCronResult && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl text-xs flex items-center gap-2"
        >
          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 flex-shrink-0" />
          <span>{showCronResult}</span>
        </motion.div>
      )}

      {/* Grid of Main KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Users */}
        <div className="bg-white border border-zinc-150 rounded-2xl p-4 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="w-1.5 h-full bg-[#FF5500] absolute left-0 top-0" />
          <div className="flex items-center justify-between mb-3 pl-1">
            <span className="text-xs font-bold text-zinc-500 tracking-wide uppercase">Copy Ativos</span>
            <div className="p-2 rounded-xl bg-[#FF5500]/10 text-[#FF5500]">
              <Users className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="pl-1">
            <h3 className="text-2xl font-black tracking-tight text-zinc-900">{activeUsersCount}</h3>
            <div className="flex items-center gap-1.5 mt-2 text-[11px]">
              <span className="font-mono text-zinc-500">⚡ Ativo & Rodando</span>
            </div>
          </div>
        </div>

        {/* Card 2: Segregation Under / over 1k */}
        <div className="bg-white border border-zinc-150 rounded-2xl p-4 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="w-1.5 h-full bg-zinc-950 absolute left-0 top-0" />
          <div className="flex items-center justify-between mb-3 pl-1">
            <span className="text-xs font-bold text-zinc-500 tracking-wide uppercase">Segmentação</span>
            <div className="p-2 rounded-xl bg-zinc-100 text-zinc-700">
              <TrendingUp className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="pl-1">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500 font-medium">Bancas &lt; $1k (Quinzenal):</span>
                <span className="text-xs font-extrabold text-[#FF5500] font-mono">{usersUnder1k}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500 font-medium">Bancas &ge; $1k (Semanal):</span>
                <span className="text-xs font-extrabold text-zinc-950 font-mono">{usersAbove1k}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Receivables */}
        <div className="bg-white border border-zinc-150 rounded-2xl p-4 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="w-1.5 h-full bg-orange-600 absolute left-0 top-0" />
          <div className="flex items-center justify-between mb-3 pl-1">
            <span className="text-xs font-bold text-zinc-500 tracking-wide uppercase">Contas a Receber</span>
            <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
              <Clock className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="pl-1">
            <h3 className="text-2xl font-black tracking-tight text-zinc-900">${totalReceivables.toLocaleString('en-US', { minimumFractionDigits: 0 })}</h3>
            <p className="text-[10px] text-zinc-400 mt-2 font-mono">Faturas Pendentes/Atrasadas</p>
          </div>
        </div>

        {/* Card 4: Shared Revenue */}
        <div className="bg-white border border-zinc-150 rounded-2xl p-4 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="w-1.5 h-full bg-emerald-500 absolute left-0 top-0" />
          <div className="flex items-center justify-between mb-3 pl-1">
            <span className="text-xs font-bold text-zinc-500 tracking-wide uppercase">Receita Líquida</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Coins className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="pl-1">
            <h3 className="text-2xl font-black tracking-tight text-emerald-600">${totalFirmRevenue.toLocaleString('en-US', { minimumFractionDigits: 0 })}</h3>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[9px] text-zinc-500 font-mono font-bold">Repassado Indicadores:</span>
              <span className="text-[10px] text-orange-600 font-extrabold font-mono">${totalCommissionsPaid}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mid row: Charts and active alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Graphics block */}
        <div className="bg-white border border-zinc-150 rounded-2xl p-5 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] lg:col-span-2">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-100">
            <div>
              <h3 className="font-bold text-sm tracking-tight text-zinc-900">Histórico de Performance Recente</h3>
              <p className="text-[11px] text-zinc-400 font-mono">Últimas 7 atualizações de banca faturadas com lucros / prejuízos</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#FF5500] inline-block" />
              <span className="text-[10px] text-zinc-500 font-mono">Lucro ($)</span>
            </div>
          </div>

          {/* Custom SVG line Chart */}
          {recentUpdates.length > 0 ? (
            <div className="w-full h-56 mt-4 relative">
              <svg className="w-full h-full" viewBox="0 0 500 200">
                <defs>
                  <linearGradient id="gradient-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF5500" stopOpacity="0.3"></stop>
                    <stop offset="100%" stopColor="#FF5500" stopOpacity="0.0"></stop>
                  </linearGradient>
                </defs>
                
                {/* Grid Lines */}
                <line x1="50" y1="20" x2="480" y2="20" stroke="#F1F1F5" strokeWidth="1" />
                <line x1="50" y1="70" x2="480" y2="70" stroke="#F1F1F5" strokeWidth="1" />
                <line x1="50" y1="120" x2="480" y2="120" stroke="#F1F1F5" strokeWidth="1" />
                <line x1="50" y1="170" x2="480" y2="170" stroke="#F1F1F5" strokeWidth="1" />

                {/* Plot Path */}
                {(() => {
                  const paddingLeft = 50;
                  const paddingRight = 30;
                  const chartWidth = 500 - paddingLeft - paddingRight;
                  const chartHeight = 150; // height inside SVG
                  const maxLucro = Math.max(...recentUpdates.map(u => Math.abs(u.lucro)), 100);
                  
                  // Map values to coordinates
                  const points = recentUpdates.map((u, idx) => {
                    const x = paddingLeft + (idx / (recentUpdates.length - 1)) * chartWidth;
                    // center around y=95 (150/2 + 20)
                    const profitScaled = (u.lucro / maxLucro) * 60;
                    const y = 95 - profitScaled;
                    return { x, y, lucro: u.lucro, date: u.created_at };
                  });

                  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                  const areaD = `${pathD} L ${points[points.length - 1].x} 170 L ${points[0].x} 170 Z`;

                  return (
                    <>
                      {/* Area beneath chart */}
                      <path d={areaD} fill="url(#gradient-area)" />
                      {/* Line plot */}
                      <path d={pathD} fill="none" stroke="#FF5500" strokeWidth="3" strokeLinecap="round" />
                      
                      {/* Circle markers */}
                      {points.map((p, idx) => (
                        <g key={idx} className="group cursor-pointer">
                          <circle cx={p.x} cy={p.y} r="5" fill="#FFFFFF" stroke="#FF5500" strokeWidth="3" />
                          <circle cx={p.x} cy={p.y} r="10" fill="#FF5500" fillOpacity="0" className="hover:fill-opacity-10 transition-all" />
                          
                          {/* Rich inline label */}
                          <text x={p.x} y={p.y - 12} textAnchor="middle" className="text-[10px] font-mono font-extrabold fill-zinc-900 bg-white">
                            {p.lucro > 0 ? `+$${p.lucro}` : `-$${Math.abs(p.lucro)}`}
                          </text>
                          <text x={p.x} y="190" textAnchor="middle" className="text-[8px] font-mono fill-zinc-400">
                            {p.date.substring(5)}
                          </text>
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-400 text-xs">
              Nenhuma alteração de banca registrada recentemente.
            </div>
          )}
        </div>

        {/* Operational Indicators and Warnings right column */}
        <div className="space-y-4">
          {/* Urgent Billing / Warnings Box */}
          <div className="bg-zinc-950 text-white rounded-2xl p-5 border border-zinc-800 shadow-md">
            <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-1.5 mb-3.5">
              <AlertTriangle className="w-4.5 h-4.5 text-[#FF5500]" />
              Painel de Alertas Rápidos
            </h3>

            <div className="space-y-2 text-xs">
              {/* Vencem hoje */}
              <div className="p-3 bg-zinc-900 border border-zinc-805 rounded-xl flex flex-col gap-1.5 justify-start">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-400">Ciclos de Ativos Vencendo Hoje:</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${alertDueToday.length > 0 ? 'bg-[#FF5500]/20 text-[#FF5500]' : 'bg-zinc-800 text-zinc-400'}`}>
                    {alertDueToday.length}
                  </span>
                </div>
                {alertDueToday.length > 0 ? (
                  <div className="space-y-1 mt-1 border-t border-zinc-800/50 pt-1.5">
                    {alertDueToday.map(u => (
                      <div key={u.id} className="flex items-center justify-between text-[11px] text-zinc-300">
                        <span className="truncate max-w-[120px]">● {u.nome}</span>
                        <span className="font-mono text-[#FF5500] font-bold">ID IQ: {u.iq_id}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-[10px] text-zinc-500 italic">Evolução e cobranças estáveis para hoje.</span>
                )}
              </div>

              {/* Contas em atraso */}
              <div className="p-3 bg-zinc-900 border border-zinc-805 rounded-xl flex flex-col gap-1.5 justify-start">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-400">Cobranças Atuais em Atraso:</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${lateCharges.length > 0 ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-zinc-800 text-zinc-400'}`}>
                    {lateCharges.length}
                  </span>
                </div>
                {lateCharges.length > 0 ? (
                  <div className="space-y-1.5 mt-1 border-t border-zinc-800/50 pt-1.5">
                    {lateCharges.map(c => {
                      const userObj = users.find(u => u.id === c.user_id);
                      return (
                        <div key={c.id} className="flex items-center justify-between text-[11px] text-zinc-300">
                          <span className="truncate max-w-[120px] text-red-300">⚠ {userObj?.nome || 'Cliente'}</span>
                          <span className="font-mono text-zinc-200 font-bold">${c.valor_devido}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-[10px] text-zinc-500 italic">Nenhum repasse de cliente em atraso.</span>
                )}
              </div>
            </div>
          </div>

          {/* Quick links shortcut redirect */}
          <div className="bg-white border border-zinc-150 rounded-2xl p-5 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)]">
            <h3 className="font-bold text-sm text-zinc-900 mb-2">Setup Operacional</h3>
            <p className="text-xs text-zinc-400 mb-4 font-mono">Como novos integrados de copy trading se comportam na grade empresarial.</p>
            
            <div className="space-y-2.5">
              <button 
                onClick={() => onNavigate('links')} 
                className="w-full flex items-center justify-between text-xs font-semibold p-3 hover:bg-zinc-55 hover:bg-zinc-50 border border-zinc-100 rounded-xl text-zinc-800 transition-colors"
              >
                <span>🚀 Ativar Novo Copy / Enviar Links</span>
                <span className="text-zinc-400">&rarr;</span>
              </button>
              <button 
                onClick={() => onNavigate('users')}
                className="w-full flex items-center justify-between text-xs font-semibold p-3 hover:bg-zinc-55 hover:bg-zinc-50 border border-zinc-100 rounded-xl text-zinc-800 transition-colors"
              >
                <span>📊 Lançar Novo Saldo em Lote</span>
                <span className="text-[#FF5500]">&rarr;</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* System Action Audit logs bottom table */}
      <div className="bg-white border border-zinc-150 rounded-2xl p-5 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col gap-4 mb-4">
          <div>
            <h3 className="font-bold text-sm text-zinc-900">Histórico de Eventos & Auditoria Geral</h3>
            <p className="text-[11px] text-zinc-400 font-mono">Últimas ações e alertas do chatbot do Telegram despachados</p>
          </div>

          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {LOG_QUICK_FILTERS.map((filter) => {
                const isActive = logQuickFilter === filter.id;
                const count =
                  filter.id === 'todos'
                    ? logs.length
                    : logs.filter((log) => matchesLogQuickFilter(log, filter.id)).length;

                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setLogQuickFilter(filter.id)}
                    className={`rounded-full border px-3 py-2 text-[11px] font-bold transition-colors ${
                      isActive
                        ? 'border-zinc-950 bg-zinc-950 text-white'
                        : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'
                    }`}
                  >
                    {filter.label} ({count})
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-mono">
              <Activity className="w-3.5 h-3.5 text-emerald-500" />
              {logQuickFilter === 'todos'
                ? `Em Tempo Real · ${authLogCount} evento(s) de auth`
                : LOG_QUICK_FILTERS.find((filter) => filter.id === logQuickFilter)?.helper}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-650 border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 text-[10px] text-zinc-400 uppercase tracking-wider font-semibold font-mono bg-zinc-50/50">
                <th className="py-2.5 px-3">Data</th>
                <th className="py-2.5 px-3">Ação executada</th>
                <th className="py-2.5 px-3">Status / Detalhes</th>
                <th className="py-2.5 px-3">Operadora</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const authCause = getAuthLogCause(log);
                const authBadge = authCause ? getAuthBadgePresentation(authCause) : null;

                return (
                <tr
                  key={log.id}
                  className={`border-b border-zinc-50 transition-colors hover:bg-zinc-50/50 ${
                    authBadge ? authBadge.rowClassName : ''
                  }`}
                >
                  <td className="py-2.5 px-3 font-mono text-zinc-500">{dateUtils.formatBr(log.data)}</td>
                  <td className="py-2.5 px-3 font-semibold text-zinc-850">{log.acao}</td>
                  <td className="py-2.5 px-3">
                    <div className="flex flex-wrap items-start gap-2">
                      {authBadge && (
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide ${authBadge.className}`}
                        >
                          {authBadge.label}
                        </span>
                      )}
                      <span className="text-zinc-400 max-w-[250px] break-words">{log.detalhe}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-bold tracking-tight text-[10px]">
                      {log.user}
                    </span>
                  </td>
                </tr>
              )})}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 px-3 text-center text-xs text-zinc-400 font-medium">
                    Nenhum evento encontrado para o filtro selecionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
