import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Users, 
  Coins, 
  Link2, 
  Settings, 
  Menu, 
  X, 
  LogOut,
  UserCheck
} from 'lucide-react';
import { BRANDING } from '../branding';
import { UserAuth } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  auth: UserAuth;
  onLogout: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, auth, onLogout }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'my-copy', label: 'Meu Copy', icon: Users },
    { id: 'users', label: 'Usuários Copy', icon: Users },
    { id: 'indicators', label: 'Indicadores', icon: UserCheck },
    { id: 'billing', label: 'Cobranças', icon: Coins },
    { id: 'links', label: 'Links & Setup', icon: Link2 },
    { id: 'settings', label: 'Config Telegram', icon: Settings },
  ];

  const menuItems = (() => {
    if (auth.level === 'Cliente') {
      return allMenuItems.filter((item) => item.id === 'my-copy' || item.id === 'links');
    }

    if (auth.level === 'Indicador') {
      return allMenuItems.filter(
        (item) => item.id === 'dashboard' || item.id === 'users' || item.id === 'billing' || item.id === 'links'
      );
    }

    return allMenuItems.filter((item) => item.id !== 'my-copy');
  })();

  const mobilePrimaryItems = menuItems.filter((item) => item.id !== 'links').slice(0, 4);
  const showLinksShortcut = menuItems.some((item) => item.id === 'links');

  return (
    <>
      {/* Mobile Top Header Bar */}
      <header className="xl:hidden flex items-center justify-between bg-zinc-950 text-white px-5 pt-[calc(1rem+env(safe-area-inset-top))] pb-4 border-b border-zinc-800 sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#FF5500] flex items-center justify-center font-bold text-black text-sm tracking-tighter">
            {BRANDING.shortName}
          </div>
          <span className="font-extrabold text-lg tracking-tight text-white">
            {BRANDING.wordmark.prefix}<span className="text-[#FF5500]">{BRANDING.wordmark.accent}</span>
          </span>
        </div>
        
        <button 
          onClick={() => setIsOpen(true)}
          className="p-2 text-zinc-400 hover:text-white transition-colors"
          aria-label="Minha Conta"
          id="mobile-menu-btn"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* Mobile Drawer (AnimatePresence) */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black z-50 xl:hidden"
            />
            {/* Sidebar Drawer */}
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-zinc-950 text-white z-50 flex flex-col p-6 shadow-2xl xl:hidden"
            >
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#FF5500] flex items-center justify-center font-bold text-black text-sm">
                    {BRANDING.shortName}
                  </div>
                  <span className="font-extrabold text-lg tracking-tight">
                    {BRANDING.wordmark.prefix}<span className="text-[#FF5500]">{BRANDING.wordmark.accent}</span>
                  </span>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>

              {/* User profile details in drawer */}
              <div className="mb-6 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <p className="text-xs text-[#FF5500] font-semibold tracking-wider font-mono uppercase mb-0.5">
                  {auth.level}
                </p>
                <h4 className="font-bold text-sm tracking-tight text-white mb-0.5">{auth.nome}</h4>
                <p className="text-xs text-zinc-400 truncate">{auth.email}</p>
              </div>

              {/* Navigation list */}
              <nav className="flex-1 space-y-1.5">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        isActive 
                          ? 'bg-[#FF5500] text-black shadow-lg shadow-[#FF5500]/25 font-semibold' 
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-black' : 'text-zinc-400'}`} />
                      {item.label}
                    </button>
                  );
                })}
              </nav>

              {/* Bottom logout buttons */}
              <div className="mt-auto border-t border-zinc-900 pt-4">
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-950/20 hover:text-red-300 rounded-xl transition-all"
                >
                  <LogOut className="w-5 h-5" />
                  Sair da Conta
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar Sidebar */}
      <aside className="hidden xl:flex flex-col w-64 bg-zinc-950 text-white border-r border-zinc-850 h-screen sticky top-0 py-6 px-5 justify-between">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3.5 mb-8 px-2">
            <div className="w-10 h-10 rounded-xl bg-[#FF5500] flex items-center justify-center font-extrabold text-black text-base tracking-tighter">
              {BRANDING.shortName}
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight block">
                {BRANDING.wordmark.prefix}<span className="text-[#FF5500]">{BRANDING.wordmark.accent}</span>
              </span>
              <span className="text-[10px] text-zinc-500 font-mono tracking-widest block -mt-1 uppercase">
                {BRANDING.subtitle}
              </span>
            </div>
          </div>

          {/* User Status Profile */}
          <div className="mb-7 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 mx-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#FF5500]/10 text-[#FF5500] border border-[#FF5500]/20 font-bold font-mono uppercase">
                {auth.level}
              </span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <h4 className="font-bold text-xs tracking-tight text-zinc-200 line-clamp-1">{auth.nome}</h4>
            <p className="text-[10px] text-zinc-500 font-mono line-clamp-1">{auth.email}</p>
          </div>

          <p className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase px-3 mb-3">
            Navegação Principal
          </p>

          {/* Nav Items */}
          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                    isActive 
                      ? 'bg-[#FF5500] text-black shadow-lg shadow-[#FF5500]/20 font-bold' 
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                  }`}
                  id={`sidebar-tab-${item.id}`}
                >
                  <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-black' : 'text-zinc-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer info/logout */}
        <div className="border-t border-zinc-900 pt-5 px-1">
          <div className="text-[10px] text-zinc-650 flex flex-col gap-0.5 mb-4 text-zinc-500">
            <p>{`${BRANDING.productName} ${BRANDING.version}`}</p>
            <p className="font-mono text-[9px]">UTC 2026-05-29</p>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-red-400 hover:bg-red-950/20 hover:text-red-300 rounded-xl transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sair do Painel
          </button>
        </div>
      </aside>

      {/* Mobile Sticky Bottom-Bar Navigation for rapid touch feedback */}
      <nav className="xl:hidden fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-900 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] px-3 flex justify-around items-center z-40 text-xs shadow-xl">
        {mobilePrimaryItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center gap-1 transition-colors px-2 py-1 rounded-lg ${
                isActive ? 'text-[#FF5500]' : 'text-zinc-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] scale-90">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
        {showLinksShortcut && (
          <button
            onClick={() => setActiveTab('links')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors px-2 py-1 rounded-lg ${
              activeTab === 'links' ? 'text-[#FF5500]' : 'text-zinc-400'
            }`}
          >
            <Link2 className="w-5 h-5" />
            <span className="text-[10px] scale-90">Links</span>
          </button>
        )}
      </nav>
    </>
  );
}
