import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Download, 
  Edit, 
  Trash2, 
  TrendingUp, 
  Coins, 
  AlertCircle, 
  UserPlus, 
  Phone, 
  Send, 
  ArrowUpRight, 
  ArrowDownRight, 
  Eye, 
  X,
  Sparkles,
  Calendar,
  Check,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { UserCopy, Indicador, Cobranca, HistoricoBanca, UserAuth } from '../types';
import { ControlCopyDB, dateUtils } from '../lib/db';

interface UsersProps {
  auth: UserAuth;
}

export default function Users({ auth }: UsersProps) {
  const createEmptyEditForm = () => ({
    id: '',
    nome: '',
    email: '',
    whatsapp: '',
    telegram: '',
    iqId: '',
    indicadorId: '',
    bancaInicial: 500,
    dataInicio: dateUtils.todayStr(),
    status: 'Ativo' as UserCopy['status'],
  });

  // DB States
  const [users, setUsers] = useState<UserCopy[]>([]);
  const [indicators, setIndicators] = useState<Indicador[]>([]);
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [histories, setHistories] = useState<HistoricoBanca[]>([]);

  // Filtering states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [indicatorFilter, setIndicatorFilter] = useState('Todos');
  const [planFilter, setPlanFilter] = useState('Todos');
  const [quickFilter, setQuickFilter] = useState<'Nenhum' | 'Hoje' | 'Atrasistas' | 'Acima1k' | 'Abaixo1k' | 'Ativos'>('Nenhum');

  // Modals / Details controller
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isUpdateBalanceOpen, setIsUpdateBalanceOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserCopy | null>(null);

  // New User Form States
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [telegram, setTelegram] = useState('');
  const [iqId, setIqId] = useState('');
  const [indicadorId, setIndicadorId] = useState('');
  const [bancaInicial, setBancaInicial] = useState<number>(500);
  const [dataInicio, setDataInicio] = useState(dateUtils.todayStr());
  const [status, setStatus] = useState<'Ativo' | 'Pendente' | 'Pausado' | 'Cancelado'>('Ativo');
  const [formError, setFormError] = useState('');

  // Edit User Form States
  const [editForm, setEditForm] = useState(createEmptyEditForm);
  const [editFormError, setEditFormError] = useState('');
  const [editSuccessMessage, setEditSuccessMessage] = useState<string | null>(null);
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState<string | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);

  // Balance Update Form States
  const [newBalance, setNewBalance] = useState<number>(0);
  const [shouldBill, setShouldBill] = useState(true);
  const [balanceUpdateSuccess, setBalanceUpdateSuccess] = useState<string | null>(null);
  const [expandedMobileCards, setExpandedMobileCards] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    const [dbUsers, dbIndicators, dbCobrancas, dbHistoricos] = await Promise.all([
      ControlCopyDB.getUsers(),
      ControlCopyDB.getIndicators(),
      ControlCopyDB.getCobrancas(),
      ControlCopyDB.getHistoricos(),
    ]);

    setUsers(dbUsers);
    setIndicators(dbIndicators);
    setCobrancas(dbCobrancas);
    setHistories(dbHistoricos);
  };

  // Helper calculation simulator to display splits transparently in Form
  const tempPlano = bancaInicial < 1000 ? 'QUINZENAL' : 'SEMANAL';
  const tempClienteSplit = bancaInicial < 1000 ? 70 : 80;
  const tempCopySplit = bancaInicial < 1000 ? 30 : 20;
  const tempIndicatorSplit = indicadorId ? (bancaInicial < 1000 ? 15 : 10) : 0;
  const tempCompanySplit = tempCopySplit - tempIndicatorSplit;
  const isRecommendedMinimumBalance = bancaInicial >= 100;
  const editTempPlano = editForm.bancaInicial < 1000 ? 'QUINZENAL' : 'SEMANAL';
  const editTempClienteSplit = editForm.bancaInicial < 1000 ? 70 : 80;
  const editTempCopySplit = editForm.bancaInicial < 1000 ? 30 : 20;
  const editTempIndicatorSplit = editForm.indicadorId ? (editForm.bancaInicial < 1000 ? 15 : 10) : 0;
  const editTempCompanySplit = editTempCopySplit - editTempIndicatorSplit;
  const isEditRecommendedMinimumBalance = editForm.bancaInicial >= 100;
  const canEditIqId = auth.level === 'Admin';

  const buildRegistrationLink = (_currentIndicadorId: string) => {
    return 'https://iqoption.net/lp/mobile-partner-pwa/?aff=417345&aff_model=revenue';
  };

  const openEditUserModal = (user: UserCopy) => {
    setSelectedUser(user);
    setEditForm({
      id: user.id,
      nome: user.nome,
      email: user.email,
      whatsapp: user.whatsapp,
      telegram: user.telegram,
      iqId: user.iq_id,
      indicadorId: user.indicador_id || '',
      bancaInicial: user.banca_inicial,
      dataInicio: user.data_inicio,
      status: user.status,
    });
    setEditFormError('');
    setIsEditUserModalOpen(true);
  };

  const closeEditUserModal = () => {
    setIsEditUserModalOpen(false);
    setEditFormError('');
    setEditForm(createEmptyEditForm());
  };

  // Add User submit
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!nome || !email || !whatsapp || !telegram || !iqId || !bancaInicial || !dataInicio) {
      setFormError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    // Attempt DB Insertion
    const res = await ControlCopyDB.addUser({
      nome,
      email,
      whatsapp,
      telegram,
      iq_id: iqId,
      indicador_id: indicadorId,
      banca_inicial: Number(bancaInicial),
      data_inicio: dataInicio,
      status,
      link_cadastro_utilizado: buildRegistrationLink(indicadorId),
      link_copy_utilizado: 'https://iqoption.com/pwa/copy-trading/user/178572482?aff=417345'
    });

    if (res.success) {
      // Clear Form and reload
      setNome('');
      setEmail('');
      setWhatsapp('');
      setTelegram('');
      setIqId('');
      setIndicadorId('');
      setBancaInicial(500);
      setDataInicio(dateUtils.todayStr());
      setStatus('Ativo');
      setIsNewUserModalOpen(false);
      await loadAllData();
    } else {
      setFormError(res.message || 'Erro inesperado.');
    }
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditFormError('');

    if (
      !selectedUser ||
      !editForm.nome ||
      !editForm.email ||
      !editForm.whatsapp ||
      !editForm.telegram ||
      (canEditIqId && !editForm.iqId) ||
      !editForm.bancaInicial ||
      !editForm.dataInicio
    ) {
      setEditFormError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const userToUpdate = users.find((user) => user.id === editForm.id);

    if (!userToUpdate) {
      setEditFormError('Não foi possível localizar este cliente para edição.');
      return;
    }

    try {
      await ControlCopyDB.updateUser({
        ...userToUpdate,
        nome: editForm.nome,
        email: editForm.email,
        whatsapp: editForm.whatsapp,
        telegram: editForm.telegram,
        iq_id: canEditIqId ? editForm.iqId : userToUpdate.iq_id,
        indicador_id: editForm.indicadorId,
        banca_inicial: Number(editForm.bancaInicial),
        data_inicio: editForm.dataInicio,
        status: editForm.status,
        link_cadastro_utilizado: buildRegistrationLink(editForm.indicadorId),
      });

      await loadAllData();

      const refreshedUser = (await ControlCopyDB.getUsers()).find((user) => user.id === editForm.id) || null;
      setSelectedUser(refreshedUser);
      closeEditUserModal();
      setEditSuccessMessage(`Cliente ${editForm.nome} atualizado com sucesso.`);
      setTimeout(() => setEditSuccessMessage(null), 4000);
    } catch (error) {
      setEditFormError(error instanceof Error ? error.message : 'Não foi possível salvar a edição agora.');
    }
  };

  // Delete User handler
  const handleDeleteUser = async (id: string, name: string) => {
    if (window.confirm(`Tem certeza absoluta que deseja remover o usuário "${name}" do copy trading? Isso também removerá suas faturas e histórico.`)) {
      setDeleteErrorMessage(null);

      try {
        await ControlCopyDB.deleteUser(id);
        await loadAllData();

        if (selectedUser?.id === id) {
          setSelectedUser(null);
          setIsDetailsOpen(false);
        }

        setDeleteSuccessMessage(`Cliente ${name} removido com sucesso.`);
        setTimeout(() => setDeleteSuccessMessage(null), 4000);
      } catch (error) {
        setDeleteErrorMessage(
          error instanceof Error ? error.message : 'Não foi possível remover este cliente agora.'
        );
      }
    }
  };

  // Update Balance and optional immediate bill cycle trigger
  const handleUpdateBalanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const currentBanca = selectedUser.banca_atual;
    const updateRes = await ControlCopyDB.recordBalanceUpdate(selectedUser.id, Number(newBalance));

    if (updateRes.success) {
      const diffProfit = Number(newBalance) - currentBanca;
      let billMessage = '';

      if (shouldBill && diffProfit > 0) {
        // Trigger faturamento do ciclo
        const bill = await ControlCopyDB.billUserCycle(selectedUser.id, diffProfit);
        if (bill) {
          billMessage = ` e uma fatura de cobrança de $${bill.valor_devido} (${bill.percentual_copy}%) foi gerada com sucesso!`;
        }
      }

      setBalanceUpdateSuccess(`Banca atualizada com sucesso de $${currentBanca} para $${newBalance}${billMessage}`);
      await loadAllData();
      
      // Update local state copy to keep visual sync
      const updUser = (await ControlCopyDB.getUsers()).find(x => x.id === selectedUser.id);
      if (updUser) setSelectedUser(updUser);

      setTimeout(() => {
        setBalanceUpdateSuccess(null);
        setIsUpdateBalanceOpen(false);
      }, 4000);
    }
  };

  // CSV Exporter generator helper
  const handleExportCSV = () => {
    const headers = ['Nome,Email,WhatsApp,Telegram,ID_IQOption,Plano,Banca_Inicial,Banca_Atual,Lucro_Total,Status,Data_Inicio,Proxima_Cobranca'];
    const rows = users.map(u => {
      const profit = u.banca_atual - u.banca_inicial;
      return `"${u.nome}","${u.email}","${u.whatsapp}","${u.telegram}","${u.iq_id}","${u.plano}",${u.banca_inicial},${u.banca_atual},${profit},"${u.status}","${u.data_inicio}","${u.proxima_cobranca}"`;
    });
    
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + headers.concat(rows).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `usuarios_control_copy_iq_${dateUtils.todayStr()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Advanced Filtering Math
  const filteredUsers = users.filter(u => {
    // 1. Text search of fields
    const matchesSearch = u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.iq_id.includes(searchTerm);
    
    // 2. Select filter mapping
    const matchesStatus = statusFilter === 'Todos' || u.status === statusFilter;
    const matchesPlan = planFilter === 'Todos' || u.plano === planFilter;

    let matchesIndicator = true;
    if (indicatorFilter !== 'Todos') {
      if (indicatorFilter === 'Direto') {
        matchesIndicator = !u.indicador_id;
      } else {
        matchesIndicator = u.indicador_id === indicatorFilter;
      }
    }

    // 3. Quick buttons filters
    let matchesQuick = true;
    if (quickFilter === 'Hoje') {
      matchesQuick = u.proxima_cobranca === dateUtils.todayStr();
    } else if (quickFilter === 'Atrasistas') {
      // Find out if they have overdue bills in Cobrancas table
      const hasOverdue = cobrancas.some(c => c.user_id === u.id && c.status === 'Atrasado');
      matchesQuick = hasOverdue;
    } else if (quickFilter === 'Acima1k') {
      matchesQuick = u.banca_atual >= 1000;
    } else if (quickFilter === 'Abaixo1k') {
      matchesQuick = u.banca_atual < 1000;
    } else if (quickFilter === 'Ativos') {
      matchesQuick = u.status === 'Ativo';
    }

    return matchesSearch && matchesStatus && matchesPlan && matchesIndicator && matchesQuick;
  });

  const openDetailsModal = (user: UserCopy) => {
    setSelectedUser(user);
    setIsDetailsOpen(true);
  };

  const openUpdateBalanceModal = (user: UserCopy) => {
    setSelectedUser(user);
    setNewBalance(user.banca_atual);
    setIsUpdateBalanceOpen(true);
  };

  const getPlanBadgeClass = (plano: UserCopy['plano']) =>
    plano === 'SEMANAL'
      ? 'bg-zinc-950 text-[#FF5500] border-zinc-850'
      : 'bg-zinc-50 text-zinc-800 border-zinc-200';

  const getStatusBadgeClass = (currentStatus: UserCopy['status']) => {
    if (currentStatus === 'Ativo') return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    if (currentStatus === 'Pendente') return 'bg-orange-50 text-orange-500 border-orange-100';
    if (currentStatus === 'Pausado') return 'bg-amber-50 text-amber-600 border-amber-100';
    return 'bg-zinc-100 text-zinc-400 border-zinc-200';
  };

  const getBillingAttention = (user: UserCopy) => {
    const daysUntilBilling = dateUtils.daysUntil(user.proxima_cobranca);

    return {
      daysUntilBilling,
      isDueToday: user.proxima_cobranca === dateUtils.todayStr(),
      isOverdue: daysUntilBilling < 0,
    };
  };

  const prioritizedUsers = filteredUsers
    .map((user, index) => ({
      user,
      index,
      ...getBillingAttention(user),
    }))
    .sort((left, right) => {
      const leftPriority = left.isOverdue ? 0 : left.isDueToday ? 1 : 2;
      const rightPriority = right.isOverdue ? 0 : right.isDueToday ? 1 : 2;

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      return left.index - right.index;
    })
    .map(({ user }) => user);

  const toggleMobileCardExpansion = (userId: string) => {
    setExpandedMobileCards((current) => ({
      ...current,
      [userId]: !current[userId],
    }));
  };

  return (
    <div className="space-y-6">
      {/* Top action row */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Clientes Copy Trading</h1>
          <p className="text-sm text-zinc-500">Gestão e acompanhamento operacional de investidores IQ Option conectados.</p>
        </div>

        <div className="flex items-center gap-2">
          {/* CSV Export */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-bold rounded-xl transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>

          {/* New User modal */}
          <button
            onClick={() => setIsNewUserModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#FF5500] hover:bg-[#FF4500] text-black text-xs font-black rounded-xl transition-all shadow-md shadow-[#FF5500]/10"
          >
            <Plus className="w-4.5 h-4.5 stroke-[3px]" />
            Novo Usuário Copy
          </button>
        </div>
      </div>

      {editSuccessMessage && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{editSuccessMessage}</span>
        </div>
      )}

      {deleteSuccessMessage && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{deleteSuccessMessage}</span>
        </div>
      )}

      {deleteErrorMessage && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{deleteErrorMessage}</span>
        </div>
      )}

      {/* Tanstack style search tool & select dropdown matrix */}
      <div className="bg-white border border-zinc-150 rounded-2xl p-4 shadow-sm space-y-3.5">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-3">
          {/* Text Input Search */}
          <div className="relative xl:col-span-1">
            <Search className="w-4.5 h-4.5 text-zinc-400 absolute left-3 top-3.5" />
            <input
              type="text"
              placeholder="Nome, e-mail ou IQ ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9.5 pr-4 py-2.5 bg-zinc-50/50 hover:bg-zinc-50 focus:bg-white text-xs border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5500]/20 focus:border-[#FF5500] transition-all text-zinc-800"
            />
          </div>

          {/* Status Selection */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-zinc-50/50 hover:bg-zinc-50 text-xs border border-zinc-200 rounded-xl focus:outline-none text-zinc-700 font-semibold"
            >
              <option value="Todos">Status: Todos</option>
              <option value="Ativo">Status: Ativo</option>
              <option value="Pendente">Status: Pendente</option>
              <option value="Pausado">Status: Pausado</option>
              <option value="Cancelado">Status: Cancelado</option>
            </select>
          </div>

          {/* Indicators filter */}
          <div>
            <select
              value={indicatorFilter}
              onChange={(e) => setIndicatorFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-zinc-50/50 hover:bg-zinc-50 text-xs border border-zinc-200 rounded-xl focus:outline-none text-zinc-700 font-semibold"
            >
              <option value="Todos">Parceiros: Todos</option>
              <option value="Direto">Direto (Sem indicador)</option>
              {indicators.map(ind => (
                <option key={ind.id} value={ind.id}>Parceiro: {ind.nome}</option>
              ))}
            </select>
          </div>

          {/* Plano selection */}
          <div>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-zinc-50/50 hover:bg-zinc-50 text-xs border border-zinc-200 rounded-xl focus:outline-none text-zinc-700 font-semibold"
            >
              <option value="Todos">Ciclos Planos: Todos</option>
              <option value="SEMANAL">Semanal (Acima de $1k)</option>
              <option value="QUINZENAL">Quinzenal (Abaixo de $1k)</option>
            </select>
          </div>
        </div>

        {/* Filters buttons short-cuts */}
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-zinc-50 text-xs items-center">
          <span className="text-[10px] uppercase font-bold text-zinc-400 font-mono mr-1">Filtros Rápidos:</span>
          {[
            { id: 'Nenhum', label: 'Ver Todos' },
            { id: 'Hoje', label: 'Vencem Hoje ⏰' },
            { id: 'Atrasistas', label: 'Atrasados ⚠' },
            { id: 'Acima1k', label: 'Bancas ≥ $1000' },
            { id: 'Abaixo1k', label: 'Bancas < $1000' },
            { id: 'Ativos', label: 'Usuários Ativos' }
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => setQuickFilter(btn.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                quickFilter === btn.id 
                  ? 'bg-zinc-950 text-white' 
                  : 'bg-zinc-100 hover:bg-zinc-150 text-zinc-650'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="xl:hidden space-y-3">
        {prioritizedUsers.length > 0 ? (
          prioritizedUsers.map((user) => {
            const profit = user.banca_atual - user.banca_inicial;
            const profitPercent = parseFloat(((profit / user.banca_inicial) * 100).toFixed(1));
            const isPositive = profit >= 0;
            const { daysUntilBilling, isDueToday, isOverdue } = getBillingAttention(user);
            const indicator = indicators.find((currentIndicator) => currentIndicator.id === user.indicador_id);
            const isExpanded = !!expandedMobileCards[user.id];

            return (
              <div
                key={user.id}
                className={`bg-white border rounded-2xl shadow-sm p-4 space-y-3 ${
                  isOverdue
                    ? 'border-red-200 shadow-red-100/40'
                    : isDueToday
                      ? 'border-orange-200 shadow-orange-100/40'
                      : 'border-zinc-150'
                }`}
              >
                {(isOverdue || isDueToday) && (
                  <div
                    className={`rounded-xl border px-3 py-2.5 flex items-start gap-2 ${
                      isOverdue
                        ? 'bg-red-50 border-red-100 text-red-700'
                        : 'bg-orange-50 border-orange-100 text-[#C24A00]'
                    }`}
                  >
                    {isOverdue ? (
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    ) : (
                      <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <span className="block text-[10px] uppercase font-mono font-bold tracking-wide">
                        {isOverdue ? 'Cobranca Em Atraso' : 'Cobranca Vence Hoje'}
                      </span>
                      <span className="block text-[11px] font-semibold mt-0.5">
                        {isOverdue
                          ? `${Math.abs(daysUntilBilling)} dia(s) de atraso na proxima cobranca.`
                          : 'Priorize este cliente na triagem operacional de hoje.'}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-sm text-zinc-900 truncate">{user.nome}</h4>
                    <span className="font-mono text-zinc-400 text-[11px] font-semibold block mt-0.5">
                      ID IQ: {user.iq_id}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-[10px] font-bold font-mono border whitespace-nowrap ${getStatusBadgeClass(
                      user.status
                    )}`}
                  >
                    {user.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl bg-zinc-50 p-3">
                    <span className="text-[10px] uppercase font-mono text-zinc-400 block mb-1">
                      Banca Atual
                    </span>
                    <span className="font-mono text-sm font-black text-zinc-900 block">
                      ${user.banca_atual.toLocaleString('en-US')}
                    </span>
                    <span
                      className={`inline-flex items-center gap-0.5 mt-1 font-mono text-[10px] font-bold ${
                        isPositive ? 'text-emerald-500' : 'text-red-500'
                      }`}
                    >
                      {isPositive ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3" />
                      )}
                      {isPositive ? '+' : ''}${Math.abs(profit)} ({profitPercent}%)
                    </span>
                  </div>
                  <div className="rounded-xl bg-zinc-50 p-3">
                    <span className="text-[10px] uppercase font-mono text-zinc-400 block mb-1">
                      Próxima Cobrança
                    </span>
                    <span className="font-mono text-sm font-black text-zinc-900 block">
                      {dateUtils.formatBr(user.proxima_cobranca)}
                    </span>
                    <span
                      className={`mt-1 block text-[10px] font-bold ${
                        isOverdue ? 'text-red-500' : isDueToday ? 'text-[#FF5500]' : 'text-zinc-400 font-mono'
                      }`}
                    >
                      {isOverdue
                        ? `${Math.abs(daysUntilBilling)} dias em atraso`
                        : isDueToday
                          ? '⏰ Vence Hoje!'
                          : `${daysUntilBilling} dias restantes`}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border uppercase font-mono tracking-tight ${getPlanBadgeClass(
                      user.plano
                    )}`}
                  >
                    {user.plano}
                  </span>
                  <span className="text-[11px] text-zinc-500 font-semibold">
                    Inicial: <strong className="text-zinc-800">${user.banca_inicial.toLocaleString('en-US')}</strong>
                  </span>
                </div>

                <div className="border border-zinc-100 rounded-2xl bg-zinc-50/70 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleMobileCardExpansion(user.id)}
                    className="w-full flex items-center justify-between gap-3 px-3.5 py-3 text-left"
                  >
                    <div>
                      <span className="block text-[10px] uppercase font-mono text-zinc-400">
                        Detalhes Financeiros
                      </span>
                      <span className="block text-[11px] font-semibold text-zinc-600 mt-0.5">
                        Comissão, parceiro e lucro atual
                      </span>
                    </div>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-zinc-600">
                      {isExpanded ? 'Recolher' : 'Expandir'}
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="overflow-hidden border-t border-zinc-100"
                      >
                        <div className="p-3.5 text-[11px] text-zinc-600 space-y-2">
                          <div className="flex justify-between gap-3">
                            <span>Lucro atual</span>
                            <strong className={isPositive ? 'text-emerald-600' : 'text-red-500'}>
                              {isPositive ? '+' : '-'}${Math.abs(profit).toLocaleString('en-US')}
                            </strong>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span>Cliente</span>
                            <strong className="text-zinc-800">{user.percentual_cliente}%</strong>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span>Copy</span>
                            <strong className="text-zinc-800">{user.percentual_copy}%</strong>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span>Divisão interna</span>
                            <strong className="text-zinc-800">
                              {user.percentual_indicador}% ind / {user.receita_empresa}% cia
                            </strong>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span>Parceiro</span>
                            <strong className="text-zinc-800">
                              {indicator ? indicator.nome : 'Direto'}
                            </strong>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => openEditUserModal(user)}
                    className="flex flex-col items-center justify-center gap-1 rounded-xl border border-zinc-200 bg-white px-2 py-3 text-[11px] font-bold text-zinc-700"
                  >
                    <Edit className="w-4 h-4" />
                    Editar
                  </button>
                  <button
                    onClick={() => openDetailsModal(user)}
                    className="flex flex-col items-center justify-center gap-1 rounded-xl border border-zinc-200 bg-white px-2 py-3 text-[11px] font-bold text-zinc-700"
                  >
                    <Eye className="w-4 h-4" />
                    Detalhes
                  </button>
                  <button
                    onClick={() => openUpdateBalanceModal(user)}
                    className="flex flex-col items-center justify-center gap-1 rounded-xl border border-orange-100 bg-orange-50 px-2 py-3 text-[11px] font-bold text-[#FF5500]"
                  >
                    <TrendingUp className="w-4 h-4" />
                    Banca
                  </button>
                </div>

                <button
                  onClick={() => handleDeleteUser(user.id, user.nome)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50/70 px-3 py-2.5 text-[11px] font-bold text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                  Remover Cliente
                </button>
              </div>
            );
          })
        ) : (
          <div className="bg-white border border-zinc-150 rounded-2xl px-4 py-10 text-center text-zinc-400 text-xs italic shadow-sm">
            Não encontramos investidores correspondentes aos filtros aplicados.
          </div>
        )}
      </div>

      {/* Grid Table of Users */}
      <div className="hidden xl:block bg-white border border-zinc-150 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-650 border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 text-[10px] text-zinc-400 uppercase tracking-wider font-extrabold font-mono bg-zinc-50/60">
                <th className="py-3 px-4">Nome & ID IQ Option</th>
                <th className="py-3 px-4">Banca Inicial</th>
                <th className="py-3 px-4">Banca Atual</th>
                <th className="py-3 px-4">Plano / Frequência</th>
                <th className="py-3 px-4">Divisão Comissão</th>
                <th className="py-3 px-4">Próxima Cobrança</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {prioritizedUsers.length > 0 ? (
                prioritizedUsers.map((user) => {
                  const profit = user.banca_atual - user.banca_inicial;
                  const profitPercent = parseFloat(((profit / user.banca_inicial) * 100).toFixed(1));
                  const isPositive = profit >= 0;
                  const indicator = indicators.find(i => i.id === user.indicador_id);
                  const { daysUntilBilling, isDueToday, isOverdue } = getBillingAttention(user);

                  return (
                    <tr
                      key={user.id}
                      className={`border-b transition-all ${
                        isOverdue
                          ? 'border-red-50 bg-red-50/30 hover:bg-red-50/50'
                          : isDueToday
                            ? 'border-orange-50 bg-orange-50/20 hover:bg-orange-50/35'
                            : 'border-zinc-50 hover:bg-zinc-50/25'
                      }`}
                    >
                      {/* Name & ID */}
                      <td className="py-3.5 px-4">
                        <div>
                          <h4 className="font-extrabold text-sm text-zinc-900 line-clamp-1">{user.nome}</h4>
                          <span className="font-mono text-zinc-400 text-xs font-semibold">ID IQ: {user.iq_id}</span>
                        </div>
                      </td>

                      {/* Initial Bank */}
                      <td className="py-3.5 px-4 font-mono text-zinc-700 font-bold">
                        ${user.banca_inicial.toLocaleString('en-US')}
                      </td>

                      {/* Current Bank & Profit badge */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-[13px] font-black text-zinc-900">
                            ${user.banca_atual.toLocaleString('en-US')}
                          </span>
                          <span className={`inline-flex items-center gap-0.5 font-mono text-[10px] font-bold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {isPositive ? '+' : ''}${Math.abs(profit)} ({profitPercent}%)
                          </span>
                        </div>
                      </td>

                      {/* Plan frequency badge */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border uppercase font-mono tracking-tight ${getPlanBadgeClass(user.plano)}`}>
                          {user.plano}
                        </span>
                      </td>

                      {/* Split schema ratio details */}
                      <td className="py-3.5 px-4">
                        <div className="text-[10px] text-zinc-500 space-y-0.5">
                          <p><strong className="text-zinc-700 font-bold">{user.percentual_cliente}%</strong> Cliente</p>
                          <p><strong className="text-zinc-700 font-bold">{user.percentual_copy}%</strong> Copy <span className="text-[9px] font-mono text-zinc-400">({user.percentual_indicador}% Ind / {user.receita_empresa}% Cia)</span></p>
                        </div>
                      </td>

                      {/* Next billing date */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-zinc-800">{dateUtils.formatBr(user.proxima_cobranca)}</span>
                          <span
                            className={`text-[10px] font-bold ${
                              isOverdue
                                ? 'text-red-600 font-extrabold'
                                : isDueToday
                                  ? 'text-[#FF5500] animate-pulse font-extrabold'
                                  : 'text-zinc-400 font-mono'
                            }`}
                          >
                            {isOverdue
                              ? `${Math.abs(daysUntilBilling)} dias em atraso`
                              : isDueToday
                                ? '⏰ Vence Hoje!'
                                : `${daysUntilBilling} dias restantes`}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border ${getStatusBadgeClass(user.status)}`}>
                          {user.status}
                        </span>
                      </td>

                      {/* Action trigger row */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditUserModal(user)}
                            className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-650 transition-colors"
                            title="Reeditar cadastro do cliente"
                            id={`user-action-edit-${user.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* View details / Update bank */}
                          <button
                            onClick={() => {
                              openDetailsModal(user);
                            }}
                            className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-650 transition-colors"
                            title="Ver histórico e detalhes"
                            id={`user-action-view-${user.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Fast balance upgrade click */}
                          <button
                            onClick={() => {
                              openUpdateBalanceModal(user);
                            }}
                            className="p-1.5 hover:bg-orange-50 rounded-lg text-[#FF5500] transition-colors"
                            title="Lançar lucro/novo saldo"
                            id={`user-action-ledger-${user.id}`}
                          >
                            <TrendingUp className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteUser(user.id, user.nome)}
                            className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                            title="Remover investidor"
                      
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
                  <td colSpan={8} className="py-12 text-center text-zinc-400 text-xs italic">
                    Não encontramos investidores correspondentes aos filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL DIALOGS --- */}

      {/* 1. NEW USER MODAL DIALOG */}
      <AnimatePresence>
        {isNewUserModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNewUserModalOpen(false)}
              className="absolute inset-0 bg-black/60"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-100">
                <h3 className="text-base font-extrabold text-zinc-950 flex items-center gap-1.5">
                  <UserPlus className="w-5 h-5 text-[#FF5500]" />
                  Cadastrar Cliente no Copy
                </h3>
                <button 
                  onClick={() => setIsNewUserModalOpen(false)}
                  className="p-1 hover:bg-zinc-100 rounded-lg text-zinc-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  {formError}
                </div>
              )}

              <form onSubmit={handleCreateUser} className="space-y-4 text-xs font-semibold">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-700 mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Ex: João da Silva"
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-[#FF5500]"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-700 mb-1">E-mail *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="joao@gmail.com"
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-[#FF5500]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-700 mb-1">WhatsApp *</label>
                    <input
                      type="text"
                      required
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="Ex: 11988887777"
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-[#FF5500]"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-700 mb-1">Telegram *</label>
                    <input
                      type="text"
                      required
                      value={telegram}
                      onChange={(e) => setTelegram(e.target.value)}
                      placeholder="Ex: @joaosilva"
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-[#FF5500]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-700 mb-1">ID IQ Option (9 dígitos) *</label>
                    <input
                      type="text"
                      required
                      maxLength={9}
                      value={iqId}
                      onChange={(e) => setIqId(e.target.value.replace(/\D/g, ''))}
                      placeholder="Ex: 192477811"
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-[#FF5500] font-mono tracking-widest text-[#FF5500] font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-700 mb-1">Parceiro Indicador</label>
                    <select
                      value={indicadorId}
                      onChange={(e) => setIndicadorId(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-[#FF5500]"
                    >
                      <option value="">Nenhum (Direto)</option>
                      {indicators.map(ind => (
                        <option key={ind.id} value={ind.id}>{ind.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-700 mb-1">Banca Inicial (USD) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={bancaInicial}
                      onChange={(e) => setBancaInicial(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-[#FF5500] font-mono font-bold"
                    />
                    <span className={`mt-1 block text-[10px] ${isRecommendedMinimumBalance ? 'text-zinc-400' : 'text-amber-600 font-semibold'}`}>
                      {isRecommendedMinimumBalance
                        ? 'O ideal operacional e trabalhar com banca minima de $100.'
                        : 'Permitido salvar abaixo de $100, mas o ideal operacional e banca minima de $100.'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-zinc-700 mb-1">Data de Início *</label>
                    <input
                      type="date"
                      required
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-[#FF5500] font-mono"
                    />
                  </div>
                </div>

                {/* Simulated Business Rule feedback display */}
                <div className="p-4 bg-zinc-50/85 border border-zinc-200 rounded-2xl space-y-2">
                  <span className="text-[10px] font-bold font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#FF5500]" />
                    Simulação de Divisão
                  </span>
                  
                  <div className="grid grid-cols-2 text-xs">
                    <div>
                      <span className="text-zinc-500 font-medium block">Plano Calculado:</span>
                      <span className="font-extrabold text-zinc-950 font-mono text-xs">{tempPlano}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 font-medium block">Cobrança:</span>
                      <span className="font-extrabold text-zinc-950 font-mono text-xs">{tempPlano === 'SEMANAL' ? 'A cada 7 dias' : 'A cada 15 dias'}</span>
                    </div>
                  </div>

                  <div className="border-t border-zinc-200/50 pt-2 flex flex-col gap-1.5">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Repasse Usuário Cliente:</span>
                      <span className="font-extrabold text-emerald-600">{tempClienteSplit}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Taxa Copy Total ({tempCopySplit}%):</span>
                      <span className="font-extrabold text-zinc-800">{tempCopySplit}% do lucro obtido</span>
                    </div>
                    {indicadorId && (
                      <div className="flex justify-between text-[11px] pl-2 text-zinc-500 font-medium">
                        <span>➜ Repasse indicador:</span>
                        <span>{tempIndicatorSplit}%</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[11px] pl-2 text-zinc-500 font-medium">
                      <span>➜ Receita Líquida Empresa:</span>
                      <span className="text-orange-600 font-bold">{tempCompanySplit}%</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsNewUserModalOpen(false)}
                    className="px-4 py-2 hover:bg-zinc-100 font-bold rounded-xl text-zinc-500"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-zinc-950 text-[#FF5500] hover:bg-zinc-900 rounded-xl font-bold"
                  >
                    Salvar Registro
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. EDIT USER MODAL DIALOG */}
      <AnimatePresence>
        {isEditUserModalOpen && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-end xl:items-center justify-center p-0 xl:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={closeEditUserModal}
              className="absolute inset-0 bg-black/60"
            />

            <motion.div
              initial={{ y: 32, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 32, opacity: 0 }}
              className="relative w-full xl:max-w-2xl bg-white rounded-t-3xl xl:rounded-2xl px-4 py-5 xl:p-6 shadow-2xl overflow-y-auto max-h-[92vh] xl:max-h-[90vh]"
            >
              <div className="sticky top-0 bg-white z-10 pb-3 border-b border-zinc-100 mb-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-extrabold text-zinc-950 flex items-center gap-1.5">
                      <Edit className="w-5 h-5 text-[#FF5500]" />
                      Reeditar Cliente
                    </h3>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Ajuste os dados cadastrais com foco no uso rápido pelo celular.
                    </p>
                  </div>
                  <button
                    onClick={closeEditUserModal}
                    className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 flex-shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {editFormError && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  {editFormError}
                </div>
              )}

              <form onSubmit={handleEditUserSubmit} className="space-y-4 text-xs font-semibold">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-700 mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      value={editForm.nome}
                      onChange={(e) => setEditForm((current) => ({ ...current, nome: e.target.value }))}
                      className="w-full px-3 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-[#FF5500]"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-700 mb-1">E-mail *</label>
                    <input
                      type="email"
                      required
                      value={editForm.email}
                      onChange={(e) => setEditForm((current) => ({ ...current, email: e.target.value }))}
                      className="w-full px-3 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-[#FF5500]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-700 mb-1">WhatsApp *</label>
                    <input
                      type="text"
                      required
                      value={editForm.whatsapp}
                      onChange={(e) => setEditForm((current) => ({ ...current, whatsapp: e.target.value }))}
                      className="w-full px-3 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-[#FF5500]"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-700 mb-1">Telegram *</label>
                    <input
                      type="text"
                      required
                      value={editForm.telegram}
                      onChange={(e) => setEditForm((current) => ({ ...current, telegram: e.target.value }))}
                      className="w-full px-3 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-[#FF5500]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-700 mb-1">ID IQ Option</label>
                    <input
                      type="text"
                      disabled={!canEditIqId}
                      maxLength={9}
                      value={editForm.iqId}
                      onChange={(e) =>
                        setEditForm((current) => ({
                          ...current,
                          iqId: e.target.value.replace(/\D/g, ''),
                        }))
                      }
                      className={`w-full px-3 py-3 border border-zinc-200 rounded-xl font-mono tracking-widest ${
                        canEditIqId
                          ? 'bg-zinc-50 text-zinc-800 focus:outline-none focus:border-[#FF5500]'
                          : 'bg-zinc-100 text-zinc-400'
                      }`}
                    />
                    <span className="mt-1 block text-[10px] text-zinc-400">
                      {canEditIqId
                        ? 'Como Admin, você pode atualizar o ID IQ Option deste cliente.'
                        : 'Somente perfis Admin podem alterar o ID IQ Option.'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-zinc-700 mb-1">Parceiro Indicador</label>
                    <select
                      value={editForm.indicadorId}
                      onChange={(e) => setEditForm((current) => ({ ...current, indicadorId: e.target.value }))}
                      className="w-full px-3 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-[#FF5500]"
                    >
                      <option value="">Nenhum (Direto)</option>
                      {indicators.map((indicator) => (
                        <option key={indicator.id} value={indicator.id}>
                          {indicator.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-zinc-700 mb-1">Banca Inicial (USD) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={editForm.bancaInicial}
                      onChange={(e) =>
                        setEditForm((current) => ({ ...current, bancaInicial: Number(e.target.value) }))
                      }
                      className="w-full px-3 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-[#FF5500] font-mono font-bold"
                    />
                    <span className={`mt-1 block text-[10px] ${isEditRecommendedMinimumBalance ? 'text-zinc-400' : 'text-amber-600 font-semibold'}`}>
                      {isEditRecommendedMinimumBalance
                        ? 'O ideal operacional e trabalhar com banca minima de $100.'
                        : 'Permitido salvar abaixo de $100, mas o ideal operacional e banca minima de $100.'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-zinc-700 mb-1">Data de Início *</label>
                    <input
                      type="date"
                      required
                      value={editForm.dataInicio}
                      onChange={(e) => setEditForm((current) => ({ ...current, dataInicio: e.target.value }))}
                      className="w-full px-3 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-[#FF5500] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-700 mb-1">Status *</label>
                    <select
                      value={editForm.status}
                      onChange={(e) =>
                        setEditForm((current) => ({
                          ...current,
                          status: e.target.value as UserCopy['status'],
                        }))
                      }
                      className="w-full px-3 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-[#FF5500]"
                    >
                      <option value="Ativo">Ativo</option>
                      <option value="Pendente">Pendente</option>
                      <option value="Pausado">Pausado</option>
                      <option value="Cancelado">Cancelado</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 bg-zinc-50/85 border border-zinc-200 rounded-2xl space-y-2">
                  <span className="text-[10px] font-bold font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#FF5500]" />
                    Impacto da Reedição
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-zinc-500 font-medium block">Plano Calculado:</span>
                      <span className="font-extrabold text-zinc-950 font-mono text-xs">{editTempPlano}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 font-medium block">Próxima Cobrança:</span>
                      <span className="font-extrabold text-zinc-950 font-mono text-xs">
                        {dateUtils.formatBr(
                          dateUtils.addDays(
                            editForm.dataInicio,
                            editTempPlano === 'SEMANAL' ? 7 : 15
                          )
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-zinc-200/50 pt-2 flex flex-col gap-1.5">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Repasse Usuário Cliente:</span>
                      <span className="font-extrabold text-emerald-600">{editTempClienteSplit}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Taxa Copy Total ({editTempCopySplit}%):</span>
                      <span className="font-extrabold text-zinc-800">{editTempCopySplit}% do lucro obtido</span>
                    </div>
                    {editForm.indicadorId && (
                      <div className="flex justify-between text-[11px] pl-2 text-zinc-500 font-medium">
                        <span>➜ Repasse indicador:</span>
                        <span>{editTempIndicatorSplit}%</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[11px] pl-2 text-zinc-500 font-medium">
                      <span>➜ Receita Líquida Empresa:</span>
                      <span className="text-orange-600 font-bold">{editTempCompanySplit}%</span>
                    </div>
                  </div>
                </div>

                <div className="sticky bottom-0 bg-white pt-3 border-t border-zinc-100 flex flex-col-reverse sm:flex-row justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeEditUserModal}
                    className="w-full sm:w-auto px-4 py-3 hover:bg-zinc-100 font-bold rounded-xl text-zinc-500"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-5 py-3 bg-zinc-950 text-[#FF5500] hover:bg-zinc-900 rounded-xl font-bold"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. UPDATE BALANCE MODAL DIALOG */}
      <AnimatePresence>
        {isUpdateBalanceOpen && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsUpdateBalanceOpen(false)}
              className="absolute inset-0 bg-black/60"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-100">
                <h3 className="text-base font-extrabold text-zinc-950 flex items-center gap-1.5">
                  <TrendingUp className="w-5 h-5 text-[#FF5500]" />
                  Atualizar Banca: {selectedUser.nome}
                </h3>
                <button 
                  onClick={() => setIsUpdateBalanceOpen(false)}
                  className="p-1 hover:bg-zinc-100 rounded-lg text-zinc-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {balanceUpdateSuccess && (
                <div className="mb-4 p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl flex items-center gap-1.5 leading-snug">
                  <Check className="w-4.5 h-4.5 text-emerald-600 flex-shrink-0" />
                  <span>{balanceUpdateSuccess}</span>
                </div>
              )}

              <form onSubmit={handleUpdateBalanceSubmit} className="space-y-4 text-xs font-semibold">
                <div>
                  <label className="block text-zinc-650 font-bold mb-1">Banca Atual Registrada:</label>
                  <span className="font-mono text-zinc-900 font-black text-lg block bg-zinc-100 p-2.5 rounded-lg border border-zinc-150">
                    ${selectedUser.banca_atual.toLocaleString('en-US')}
                  </span>
                </div>

                <div>
                  <label className="block text-zinc-700 font-bold mb-1">Novo Saldo Obtido (USD):</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={newBalance}
                    onChange={(e) => setNewBalance(Number(e.target.value))}
                    className="w-full px-3.5 py-3 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-[#FF5500] font-mono font-bold text-zinc-900"
                    placeholder="Ex: 1450"
                  />
                </div>

                {/* Automatic Billing triggers helper */}
                {newBalance > selectedUser.banca_atual && (
                  <div className="p-3 bg-orange-50/50 border border-orange-100 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs text-orange-800 font-bold">
                      <span className="flex items-center gap-1">📊 Lucro gerado neste período:</span>
                      <span className="font-mono text-[13px] font-black">${newBalance - selectedUser.banca_atual}</span>
                    </div>

                    <label className="flex items-center gap-2 text-[10px] text-zinc-600 cursor-pointer pt-1 hover:text-zinc-900 font-bold">
                      <input
                        type="checkbox"
                        checked={shouldBill}
                        onChange={(e) => setShouldBill(e.target.checked)}
                        className="rounded accent-[#FF5500] w-3.5 h-3.5 cursor-pointer"
                      />
                      <span>FECHAR CICLO E FATURAR cobrança copy ({selectedUser.percentual_copy}% do lucro)</span>
                    </label>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsUpdateBalanceOpen(false)}
                    className="px-4 py-2 hover:bg-zinc-100 text-zinc-500 font-bold rounded-xl"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-zinc-950 text-[#FF5500] hover:bg-zinc-900 rounded-xl font-bold"
                  >
                    Salvar e Confirmar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. USER INFORMATION CARD DETAILS */}
      <AnimatePresence>
        {isDetailsOpen && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailsOpen(false)}
              className="absolute inset-0 bg-black/60"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-2xl bg-white rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-100">
                <div>
                  <h3 className="text-base font-extrabold text-zinc-950 block">Dossiê e Histórico de Evolução</h3>
                  <span className="text-xs font-mono text-zinc-400">Cliente ID IQ: {selectedUser.iq_id}</span>
                </div>
                <button 
                  onClick={() => setIsDetailsOpen(false)}
                  className="p-1 hover:bg-zinc-100 rounded-lg text-zinc-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Grid with credentials info details */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 bg-zinc-50 p-4 rounded-2xl mb-5 text-[11px] font-semibold text-zinc-650">
                <div>
                  <span className="text-[10px] text-zinc-400 font-mono block">NOME:</span>
                  <span className="text-zinc-900 font-bold text-xs truncate block">{selectedUser.nome}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 font-mono block">WHATSAPP:</span>
                  <span className="text-zinc-900 font-bold text-xs flex items-center gap-1">
                    <Phone className="w-3 h-3 text-zinc-400" />
                    {selectedUser.whatsapp}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 font-mono block">TELEGRAM:</span>
                  <span className="text-[#FF5500] font-bold text-xs flex items-center gap-1">
                    <Send className="w-3 h-3 text-zinc-400" />
                    {selectedUser.telegram}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 font-mono block">EMPRESA PLANO:</span>
                  <span className="text-zinc-950 font-bold text-xs block font-mono">{selectedUser.plano}</span>
                </div>
              </div>

              {/* History list track */}
              <div className="space-y-4">
                <h4 className="font-bold text-xs text-zinc-500 uppercase tracking-wider font-mono">Evolução de Saldos e Registros</h4>
                
                <div className="border border-zinc-150 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-zinc-50 border-b border-zinc-100 font-mono text-[10px] text-zinc-400 uppercase font-bold">
                      <tr>
                        <th className="py-2.5 px-3">Data</th>
                        <th className="py-2.5 px-3">Banca Anterior</th>
                        <th className="py-2.5 px-3">Banca Atual</th>
                        <th className="py-2.5 px-3">Lucro Faturado</th>
                        <th className="py-2.5 px-3">Resultado (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {histories.filter(x => x.user_id === selectedUser.id).length > 0 ? (
                        [...histories]
                          .filter(x => x.user_id === selectedUser.id)
                          .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                          .map(h => (
                            <tr key={h.id} className="border-b border-zinc-50 hover:bg-zinc-50/25">
                              <td className="py-2 px-3 font-mono text-zinc-400">{dateUtils.formatBr(h.created_at)}</td>
                              <td className="py-2 px-3 font-mono">${h.valor_anterior}</td>
                              <td className="py-2 px-3 font-mono font-bold">${h.valor_atual}</td>
                              <td className={`py-2 px-3 font-mono font-bold ${h.lucro >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                {h.lucro >= 0 ? '+' : ''}${h.lucro}
                              </td>
                              <td className="py-2 px-3 font-mono">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${h.lucro >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                                  {h.lucro >= 0 ? '+' : ''}{h.percentual}%
                                </span>
                              </td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-zinc-400 italic">Nenhum histórico de banca registrado.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Tracking Billing history */}
                <h4 className="font-bold text-xs text-zinc-500 uppercase tracking-wider font-mono">Faturamento do Copy Trading</h4>
                <div className="border border-zinc-150 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-zinc-50 border-b border-zinc-100 font-mono text-[10px] text-zinc-400 uppercase font-bold">
                      <tr>
                        <th className="py-2.5 px-3">Cobrança Nº</th>
                        <th className="py-2.5 px-3">Lucro Período</th>
                        <th className="py-2.5 px-3">Valor Devido ({selectedUser.percentual_copy}%)</th>
                        <th className="py-2.5 px-3">Vencimento</th>
                        <th className="py-2.5 px-3">Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cobrancas.filter(x => x.user_id === selectedUser.id).length > 0 ? (
                        cobrancas.filter(x => x.user_id === selectedUser.id).map((c, i) => (
                          <tr key={c.id} className="border-b border-zinc-50 hover:bg-zinc-50/20">
                            <td className="py-2 px-3 font-mono font-bold">#CC-{c.id.substring(4, 9)}</td>
                            <td className="py-2 px-3 font-mono">${c.valor_lucro}</td>
                            <td className="py-2 px-3 font-mono font-bold">${c.valor_devido}</td>
                            <td className="py-2 px-3 font-mono">{dateUtils.formatBr(c.data_vencimento)}</td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono uppercase ${
                                c.status === 'Pago' ? 'bg-emerald-100 text-emerald-700' :
                                c.status === 'Pendente' ? 'bg-orange-100 text-orange-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {c.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-zinc-400 italic">Nenhuma fatura gerada para esta conta.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end pt-5 mt-4 border-t border-zinc-100">
                <button
                  onClick={() => setIsDetailsOpen(false)}
                  className="px-5 py-2 bg-zinc-950 hover:bg-zinc-900 text-[#FF5500] font-bold rounded-xl text-xs"
                >
                  Fechar Painel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
