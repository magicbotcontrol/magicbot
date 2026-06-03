import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Users, 
  Coins, 
  UserCheck, 
  Send, 
  Phone, 
  Mail, 
  Eye, 
  X, 
  Sparkles,
  Award
} from 'lucide-react';
import { Indicador, UserCopy, Cobranca, UserAuth } from '../types';
import { ControlCopyDB, dateUtils } from '../lib/db';
import IndicatorUserRoleManager from './IndicatorUserRoleManager';

interface IndicatorsProps {
  auth: UserAuth;
}

export default function Indicators({ auth }: IndicatorsProps) {
  const [indicators, setIndicators] = useState<Indicador[]>([]);
  const [users, setUsers] = useState<UserCopy[]>([]);
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);

  // Search
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals / Details state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedInd, setSelectedInd] = useState<Indicador | null>(null);

  // Form States
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telegram, setTelegram] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [codigoInterno, setCodigoInterno] = useState('');
  const [percentual, setPercentual] = useState<number>(10);
  const [status, setStatus] = useState<'Ativo' | 'Inativo'>('Ativo');
  const [observacoes, setObservacoes] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [dbIndicators, dbUsers, dbCobrancas] = await Promise.all([
      ControlCopyDB.getIndicators(),
      ControlCopyDB.getUsers(),
      ControlCopyDB.getCobrancas(),
    ]);

    setIndicators(dbIndicators);
    setUsers(dbUsers);
    setCobrancas(dbCobrancas);
  };

  // Create submission
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!nome || !email || !telegram || !whatsapp || !codigoInterno) {
      setFormError('Por favor preencha todos os campos obrigatórios.');
      return;
    }

    // Check duplicate code
    if (indicators.some(i => i.codigo_interno.toUpperCase() === codigoInterno.toUpperCase())) {
      setFormError(`Já existe um indicador com o código interno "${codigoInterno.toUpperCase()}".`);
      return;
    }

    await ControlCopyDB.addIndicator({
      nome,
      email,
      telegram,
      whatsapp,
      codigo_interno: codigoInterno.toUpperCase(),
      percentual: Number(percentual),
      status,
      observacoes
    });

    // Reset Form
    setNome('');
    setEmail('');
    setTelegram('');
    setWhatsapp('');
    setCodigoInterno('');
    setPercentual(10);
    setObservacoes('');
    setIsAddModalOpen(false);
    await loadData();
  };

  // Edit action
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInd) return;

    await ControlCopyDB.updateIndicator({
      ...selectedInd,
      nome,
      email,
      telegram,
      whatsapp,
      codigo_interno: codigoInterno.toUpperCase(),
      percentual: Number(percentual),
      status,
      observacoes
    });

    setIsEditModalOpen(false);
    setSelectedInd(null);
    await loadData();
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja remover o indicador "${name}"? Os usuários continuarão cadastrados, mas perderão a referência do indicador.`)) {
      await ControlCopyDB.deleteIndicator(id);
      await loadData();
    }
  };

  // Filter list
  const filteredInds = indicators.filter(i => 
    i.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.codigo_interno.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <IndicatorUserRoleManager auth={auth} />

      {/* Top action row */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Afiliados & Parceiros (Indicadores)</h1>
          <p className="text-sm text-zinc-500">Cadastre e monitore comissões e faturamentos de repasses automáticos dos seus parceiros.</p>
        </div>

        <button
          onClick={() => {
            setFormError('');
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#FF5500] hover:bg-[#FF4500] text-black text-xs font-black rounded-xl transition-all shadow-md"
        >
          <Plus className="w-4.5 h-4.5 stroke-[3px]" />
          Novo Indicador
        </button>
      </div>

      {/* Search tool block */}
      <div className="bg-white border border-zinc-150 rounded-2xl p-4 shadow-sm max-w-sm">
        <div className="relative">
          <Search className="w-4.5 h-4.5 text-zinc-400 absolute left-3 top-3.5" />
          <input
            type="text"
            placeholder="Buscar por nome ou código Cupom..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2.5 bg-zinc-50/50 hover:bg-zinc-50 focus:bg-white text-xs border border-zinc-200 rounded-xl focus:outline-none transition-all text-zinc-800"
          />
        </div>
      </div>

      {/* Grid Cards of Indicators */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {filteredInds.map(ind => {
          // Associated Users calculations
          const linkedUsers = users.filter(u => u.indicador_id === ind.id);
          const totalLinkedBalance = linkedUsers.reduce((sum, u) => sum + u.banca_atual, 0);

          // Payout math: sum of valor_indicador from PAID charges
          const indCobrancas = cobrancas.filter(c => {
            const userObj = users.find(u => u.id === c.user_id);
            return userObj?.indicador_id === ind.id;
          });

          const paidCommissions = indCobrancas
            .filter(c => c.status === 'Pago')
            .reduce((sum, c) => sum + c.valor_indicador, 0);

          const pendingCommissions = indCobrancas
            .filter(c => c.status === 'Pendente' || c.status === 'Atrasado')
            .reduce((sum, c) => sum + c.valor_indicador, 0);

          return (
            <div key={ind.id} className="bg-white border border-zinc-150 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
              {/* Top Row: Name and Code */}
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-extrabold text-base text-zinc-900 line-clamp-1">{ind.nome}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-100 text-zinc-650 font-mono font-bold uppercase tracking-wider">
                      CÓD: {ind.codigo_interno}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                    ind.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-zinc-100 text-zinc-400'
                  }`}>
                    {ind.status}
                  </span>
                </div>

                {/* Contacts details list */}
                <div className="space-y-1.5 text-xs text-zinc-500 font-medium mb-5">
                  <p className="flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-zinc-400" />
                    {ind.email}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-zinc-400" />
                    {ind.whatsapp}
                  </p>
                  <p className="flex items-center gap-1.5 text-[#FF5500]">
                    <Send className="w-3.5 h-3.5 text-zinc-400" />
                    {ind.telegram}
                  </p>
                </div>

                {/* Performance Bento Stats */}
                <div className="grid grid-cols-2 gap-2 p-3 bg-zinc-50 border border-zinc-100 rounded-xl mb-5 text-[11px]">
                  <div>
                    <span className="text-[10px] text-zinc-400 font-mono block">CLIENTES VINCULADOS</span>
                    <span className="font-extrabold text-zinc-900 font-mono flex items-center gap-1 text-xs">
                      <Users className="w-3.5 h-3.5 text-zinc-500" />
                      {linkedUsers.length} ativos
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 font-mono block">VALOR BANK TOTAL</span>
                    <span className="font-black text-zinc-950 font-mono text-xs">
                      ${totalLinkedBalance.toLocaleString('en-US')}
                    </span>
                  </div>
                </div>

                {/* Commissions metrics */}
                <div className="flex items-center justify-between border-t border-zinc-100 pt-3.5 text-xs">
                  <div>
                    <span className="text-[9px] text-zinc-400 font-bold uppercase font-mono block">Comissão Paga</span>
                    <span className="text-emerald-600 font-black font-mono text-sm">${paidCommissions}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-zinc-400 font-bold uppercase font-mono block">Comissão Pendente</span>
                    <span className="text-orange-600 font-black font-mono text-sm">${pendingCommissions}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Quick Row Actions */}
              <div className="flex items-center justify-end gap-1 border-t border-zinc-100 pt-3.5 mt-4">
                <button
                  onClick={() => {
                    setSelectedInd(ind);
                    setIsDetailsOpen(true);
                  }}
                  className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-600 transition-colors"
                  title="Ver clientes vinculados"
                  id={`ind-action-view-${ind.id}`}
                >
                  <Eye className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    setSelectedInd(ind);
                    setNome(ind.nome);
                    setEmail(ind.email);
                    setTelegram(ind.telegram);
                    setWhatsapp(ind.whatsapp);
                    setCodigoInterno(ind.codigo_interno);
                    setPercentual(ind.percentual);
                    setStatus(ind.status);
                    setObservacoes(ind.observacoes || '');
                    setIsEditModalOpen(true);
                  }}
                  className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-805 transition-colors"
                  title="Editar dados"
                  id={`ind-action-edit-${ind.id}`}
                >
                  <Edit className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDelete(ind.id, ind.nome)}
                  className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                  title="Excluir parceiro"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* --- DIALOGS FOR INDICATORS --- */}

      {/* 1. ADD MODAL DIALOG */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
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
                  <Award className="w-5 h-5 text-[#FF5500]" />
                  Cadastrar Novo Parceiro
                </h3>
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 hover:bg-zinc-100 rounded-lg text-zinc-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-red-655" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleCreate} className="space-y-4 text-xs font-semibold">
                <div>
                  <label className="block text-zinc-700 mb-1">Nome Completo do Parceiro *</label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Carlos Frederico"
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-[#FF5500]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-700 mb-1">Código de Cupom (Interno) *</label>
                    <input
                      type="text"
                      required
                      value={codigoInterno}
                      onChange={(e) => setCodigoInterno(e.target.value)}
                      placeholder="Ex: CARLOS10"
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-[#FF5500] font-mono font-bold text-[#FF5500]"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-700 mb-1">Status Ativação *</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none"
                    >
                      <option value="Ativo">Parceiro Ativo</option>
                      <option value="Inativo">Parceiro Suspenso</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-700 mb-1">E-mail de Contato *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="carlos@gmail.com"
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-[#FF5500]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-700 mb-1">WhatsApp *</label>
                    <input
                      type="text"
                      required
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="Ex: 11988889999"
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-700 mb-1">Telegram *</label>
                    <input
                      type="text"
                      required
                      value={telegram}
                      onChange={(e) => setTelegram(e.target.value)}
                      placeholder="@carlos_fx"
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-750 mb-1">Percentual Comissão Padrão (%)</label>
                  <p className="text-[10px] text-zinc-400 mb-1 leading-tight">Será aplicado 15% (bancas &lt; $1k) ou 10% (bancas &ge; $1k) do lucro total do copy automaticamente a favor deste parceiro.</p>
                  <input
                    type="number"
                    value={percentual}
                    onChange={(e) => setPercentual(Number(e.target.value))}
                    className="w-20 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block text-zinc-700 mb-1">Observações Privadas</label>
                  <textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none text-xs"
                    rows={2}
                    placeholder="E.g. Metas mensais acordadas ou link de mídias."
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 hover:bg-zinc-100 text-zinc-500 font-bold rounded-xl"
                  >
                    Retroceder
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-zinc-950 text-[#FF5500] hover:bg-zinc-900 rounded-xl font-bold"
                  >
                    Salvar Novo Parceiro
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. EDIT MODAL DIALOG */}
      <AnimatePresence>
        {isEditModalOpen && selectedInd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
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
                  <Edit className="w-5 h-5 text-[#FF5500]" />
                  Atualizar Dados Parceiro
                </h3>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1 hover:bg-zinc-100 rounded-lg text-zinc-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4 text-xs font-semibold">
                <div>
                  <label className="block text-zinc-700 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-700 mb-1">Código Promocional</label>
                    <input
                      type="text"
                      required
                      value={codigoInterno}
                      onChange={(e) => setCodigoInterno(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl font-mono text-[#FF5500] font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-700 mb-1">Status Ativo</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl"
                    >
                      <option value="Ativo">Ativo</option>
                      <option value="Inativo">Inativo</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-700 mb-1">E-mail</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-700 mb-1">WhatsApp</label>
                    <input
                      type="text"
                      required
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-700 mb-1">Telegram</label>
                    <input
                      type="text"
                      required
                      value={telegram}
                      onChange={(e) => setTelegram(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-700 mb-1">Observações</label>
                  <textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl"
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 hover:bg-zinc-100 text-zinc-500 font-bold rounded-xl"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-zinc-950 text-[#FF5500] hover:bg-zinc-900 rounded-xl font-bold"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. DETAILS MODAL SHOWING ASSOCIATED COPY USERS */}
      <AnimatePresence>
        {isDetailsOpen && selectedInd && (
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
              className="relative w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[85vh]"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-100">
                <div>
                  <h3 className="text-base font-extrabold text-zinc-950">Portfólio de Clientes Vinculados</h3>
                  <span className="text-[11px] font-semibold text-zinc-500 font-mono">Indicador: {selectedInd.nome} ({selectedInd.codigo_interno})</span>
                </div>
                <button 
                  onClick={() => setIsDetailsOpen(false)}
                  className="p-1 hover:bg-zinc-100 rounded-lg text-zinc-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Grid of linked users under indicator */}
              <div className="space-y-3">
                <div className="flex gap-2 text-xs font-bold justify-start py-0.5 border-b border-zinc-50 text-zinc-400 font-mono uppercase">
                  <span>Clientes Ativos sob código</span>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {users.filter(u => u.indicador_id === selectedInd.id).length > 0 ? (
                    users.filter(u => u.indicador_id === selectedInd.id).map(u => {
                      const profit = u.banca_atual - u.banca_inicial;
                      return (
                        <div key={u.id} className="p-3 bg-zinc-50 border border-zinc-150 rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <span className="font-extrabold text-zinc-900 block">{u.nome}</span>
                            <span className="text-[10px] text-zinc-400 font-mono">Plano {u.plano} | ID: {u.iq_id}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-zinc-950 block font-mono">${u.banca_atual}</span>
                            <span className={`text-[10px] font-bold font-mono ${profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              {profit >= 0 ? '+' : ''}${profit}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-zinc-450 italic text-xs py-4 text-center">Nenhum cliente conectado associado a esta indicação.</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-5 mt-4 border-t border-zinc-100">
                <button
                  onClick={() => setIsDetailsOpen(false)}
                  className="px-5 py-2 bg-zinc-950 text-[#FF5500] hover:bg-zinc-900 font-bold rounded-xl text-xs"
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
