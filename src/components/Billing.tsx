import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  CheckCircle2, 
  Calendar, 
  Coins, 
  Trash2, 
  MoreVertical, 
  Eye, 
  DollarSign, 
  ArrowUpRight, 
  Clock, 
  AlertTriangle,
  User,
  X,
  RefreshCcw,
  Check
} from 'lucide-react';
import { Cobranca, UserCopy, Indicador } from '../types';
import { ControlCopyDB, dateUtils } from '../lib/db';

export default function Billing() {
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [users, setUsers] = useState<UserCopy[]>([]);
  const [indicators, setIndicators] = useState<Indicador[]>([]);

  // Search/Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Pendente' | 'Pago' | 'Atrasado'>('Todos');

  // Manual bill creation modal controller if they want to inject exceptional fee record
  const [isAddBillOpen, setIsAddBillOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [profitAmount, setProfitAmount] = useState<number>(100);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [dbCobrancas, dbUsers, dbIndicators] = await Promise.all([
      ControlCopyDB.getCobrancas(),
      ControlCopyDB.getUsers(),
      ControlCopyDB.getIndicators(),
    ]);

    setCobrancas(dbCobrancas);
    setUsers(dbUsers);
    setIndicators(dbIndicators);
  };

  // Mark as paid handler
  const handleMarkAsPaid = async (id: string) => {
    await ControlCopyDB.updateCobrancaStatus(id, 'Pago');
    await loadData();
  };

  // Mark as pending
  const handleMarkAsPending = async (id: string) => {
    await ControlCopyDB.updateCobrancaStatus(id, 'Pendente');
    await loadData();
  };

  // Delete billing record
  const handleDeleteCobranca = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este registro de cobrança do histórico?')) {
      await ControlCopyDB.deleteCobranca(id);
      await loadData();
    }
  };

  // Create manual bill cycle
  const handleSubmitBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!selectedUserId || !profitAmount) {
      setFormError('Escolha o cliente e o valor de lucro gerado.');
      return;
    }

    const cob = await ControlCopyDB.billUserCycle(selectedUserId, Number(profitAmount));
    if (cob) {
      setSelectedUserId('');
      setProfitAmount(100);
      setIsAddBillOpen(false);
      await loadData();
    } else {
      setFormError('Não foi possível gerar a fatura. Verifique os dados.');
    }
  };

  // Filter lists
  const filteredCobrancas = cobrancas.filter(c => {
    const userObj = users.find(u => u.id === c.user_id);
    const matchesSearch = userObj ? userObj.nome.toLowerCase().includes(searchTerm.toLowerCase()) || userObj.iq_id.includes(searchTerm) : false;
    const matchesStatus = statusFilter === 'Todos' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Math totals
  const totalReceivablesPendente = cobrancas
    .filter(c => c.status === 'Pendente')
    .reduce((acc, c) => acc + c.valor_devido, 0);

  const totalReceivablesAtrasado = cobrancas
    .filter(c => c.status === 'Atrasado')
    .reduce((acc, c) => acc + c.valor_devido, 0);

  const totalEarnedCia = cobrancas
    .filter(c => c.status === 'Pago')
    .reduce((acc, c) => acc + c.valor_empresa, 0);

  return (
    <div className="space-y-6">
      {/* Top Title Action menu */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Cobranças & Faturamento</h1>
          <p className="text-sm text-zinc-500">Acompanhe as faturas de serviços copy trading, controle os lucros divididos e repasse de comissões.</p>
        </div>

        <button
          onClick={() => {
            setFormError('');
            setIsAddBillOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-zinc-950 hover:bg-zinc-900 text-white text-xs font-black rounded-xl transition-all border border-zinc-800 shadow-sm"
        >
          <Plus className="w-4 h-4 text-[#FF5500]" />
          Lançar Cobrança Manual
        </button>
      </div>

      {/* Mini Financial Widgets */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="bg-white border border-zinc-150 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-zinc-400 font-mono font-bold uppercase block">Pendente (Ciclo Aberto)</span>
            <span className="text-xl font-mono font-black text-orange-500">${totalReceivablesPendente.toLocaleString('en-US')}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-orange-50 text-orange-500">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-zinc-150 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-zinc-400 font-mono font-bold uppercase block">VALORES EM ATRASO</span>
            <span className="text-xl font-mono font-black text-red-500">${totalReceivablesAtrasado.toLocaleString('en-US')}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-red-50 text-red-500">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-zinc-150 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-zinc-400 font-mono font-bold uppercase block">RECEITA LÍQUIDA EMPRESA (PAGA)</span>
            <span className="text-xl font-mono font-black text-emerald-600">${totalEarnedCia.toLocaleString('en-US')}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
            <Coins className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Advanced Filter Matrix search block */}
      <div className="bg-white border border-zinc-150 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Input Text Search */}
        <div className="relative flex-1">
          <Search className="w-4.5 h-4.5 text-zinc-400 absolute left-3 top-3.5" />
          <input
            type="text"
            placeholder="Buscar por cliente ou ID da IQ Option..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2.5 bg-zinc-50/50 hover:bg-zinc-50 focus:bg-white text-xs border border-zinc-200 rounded-xl focus:outline-none transition-all text-zinc-800"
          />
        </div>

        {/* Buttons Filters toggle */}
        <div className="flex gap-1 items-center">
          {(['Todos', 'Pago', 'Pendente', 'Atrasado'] as any[]).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                statusFilter === status 
                  ? 'bg-zinc-950 text-[#FF5500] font-bold' 
                  : 'bg-zinc-100 hover:bg-zinc-150 text-zinc-600'
              }`}
            >
              {status === 'Todos' ? 'Todos Status' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Table grid display */}
      <div className="bg-white border border-zinc-150 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-650 border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 text-[10px] text-zinc-400 uppercase tracking-wider font-extrabold font-mono bg-zinc-50/60">
                <th className="py-3 px-4">Código Fatura</th>
                <th className="py-3 px-4">Cliente / ID IQ</th>
                <th className="py-3 px-4">Lucro Período</th>
                <th className="py-3 px-4">Valor Cobrado Copy</th>
                <th className="py-3 px-4">Comissão Indicador</th>
                <th className="py-3 px-4">Empresa Líquida</th>
                <th className="py-3 px-4">Vencimento</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Procedimento</th>
              </tr>
            </thead>
            <tbody>
              {filteredCobrancas.length > 0 ? (
                filteredCobrancas.map((cob) => {
                  const userObj = users.find(u => u.id === cob.user_id);
                  const indicatorObj = userObj ? indicators.find(i => i.id === userObj.indicador_id) : null;
                  
                  return (
                    <tr key={cob.id} className="border-b border-zinc-50 hover:bg-zinc-50/20 transition-colors">
                      {/* Code invoice id */}
                      <td className="py-3.5 px-4 font-mono font-bold text-zinc-900">
                        #CC-{cob.id.substring(4, 9)}
                      </td>

                      {/* Name of Client */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-extrabold text-zinc-905 block">{userObj?.nome || 'Cliente Removido'}</span>
                          <span className="text-[10px] text-zinc-400 font-mono">ID IQ: {userObj?.iq_id}</span>
                        </div>
                      </td>

                      {/* Period Profit generated */}
                      <td className="py-3.5 px-4 font-mono font-semibold">
                        ${cob.valor_lucro.toLocaleString('en-US')}
                      </td>

                      {/* Copy core Due balance */}
                      <td className="py-3.5 px-4 font-mono font-black text-zinc-950">
                        ${cob.valor_devido.toLocaleString('en-US')} 
                        <span className="text-[9px] text-[#FF5500] font-bold block">({cob.percentual_copy}%)</span>
                      </td>

                      {/* Partner indicator commission payout */}
                      <td className="py-3.5 px-4 font-mono">
                        ${cob.valor_indicador.toLocaleString('en-US')}
                        <span className="text-[9px] text-zinc-400 block font-semibold">({indicatorObj ? indicatorObj.nome.split(' ')[0] : 'Direto'})</span>
                      </td>

                      {/* Enterprise share net */}
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">
                        ${cob.valor_empresa.toLocaleString('en-US')}
                      </td>

                      {/* Due date */}
                      <td className="py-3.5 px-4 font-mono">
                        <span>{dateUtils.formatBr(cob.data_vencimento)}</span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                          cob.status === 'Pago' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          cob.status === 'Pendente' ? 'bg-[#FF5500]/10 text-[#FF5500] border-[#FF5500]/20' :
                          'bg-red-50 text-red-600 border-red-100'
                        }`}>
                          {cob.status}
                        </span>
                      </td>

                      {/* Procedural action */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {cob.status !== 'Pago' ? (
                            <button
                              onClick={() => handleMarkAsPaid(cob.id)}
                              className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-805 hover:bg-zinc-850 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                              title="Confirmar Pagamento Realizado"
                              id={`bill-pay-btn-${cob.id}`}
                            >
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              Baixar Pago
                            </button>
                          ) : (
                            <button
                              onClick={() => handleMarkAsPending(cob.id)}
                              className="px-2 py-1 bg-zinc-100 hover:bg-zinc-150 text-zinc-500 rounded text-[9px] font-medium"
                              title="Restaurar para Pendente"
                            >
                              Pendente
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteCobranca(cob.id)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                            title="Deletar cobrança"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-400 font-medium italic">
                    Nenhum registro de faturamento correspondente.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MANUAL BILL MODAL */}
      <AnimatePresence>
        {isAddBillOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddBillOpen(false)}
              className="absolute inset-0 bg-black/60"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-100">
                <h3 className="text-base font-extrabold text-zinc-950 flex items-center gap-2">
                  <Coins className="w-5 h-5 text-[#FF5500]" />
                  Lançar Cobrança Manual
                </h3>
                <button 
                  onClick={() => setIsAddBillOpen(false)}
                  className="p-1 hover:bg-zinc-100 rounded-lg text-zinc-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitBill} className="space-y-4 text-xs font-semibold">
                <div>
                  <label className="block text-zinc-700 font-bold mb-1">Escolher o Cliente do Copy *</label>
                  <select
                    required
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl"
                  >
                    <option value="">Selecione...</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.nome} (Iq: {u.iq_id})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-700 font-bold mb-1">Lucro Obtido (USD) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={profitAmount}
                    onChange={(e) => setProfitAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl font-mono text-sm"
                  />
                  <p className="text-[10px] text-zinc-400 font-medium leading-tight mt-1">O sistema irá extrair a comissão de fechamento do copy automaticamente, baseando-se nas regras de segmentação de plano do cliente.</p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddBillOpen(false)}
                    className="px-4 py-2 hover:bg-zinc-100 text-zinc-500 font-bold rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-zinc-950 text-[#FF5500] hover:bg-zinc-900 rounded-xl font-bold"
                  >
                    Lançar Fatura
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
