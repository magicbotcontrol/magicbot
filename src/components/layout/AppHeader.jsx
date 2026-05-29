import { useState } from 'react';
import { Icons } from '../../constants/icons';

export function AppHeader({
  activeTab,
  t,
  setIsSidebarOpen,
  isSidebarOpen,
  brokersList,
  setActiveTab,
  isLangDropdownOpen,
  setIsLangDropdownOpen,
  isProfileDropdownOpen,
  setIsProfileDropdownOpen,
  currentLanguage,
  setCurrentLanguage,
  showToast,
  isDarkMode,
  setIsDarkMode,
  playAlertSound,
  hasNotifGlow,
  setHasNotifGlow,
  handleLogOut,
  formatMoney,
  fxLoading,
  fxError,
  fxStatusLabel
}) {
  const [isBrokerPopoverOpen, setIsBrokerPopoverOpen] = useState(false);
  const linkedBroker = brokersList.find((broker) => broker.status === 'Linked');
  const linkedBalanceLabel = linkedBroker ? formatMoney(linkedBroker.balance, linkedBroker.baseCurrency) : '';
  const fxDotClass = fxLoading ? 'bg-yellow-400' : fxError ? 'bg-pink-500' : 'bg-green-500';
  const fxTitle = fxStatusLabel || (fxError ? t.fxUnavailable : t.fxUpdated.replace('{time}', ''));

  return (
    <header className="h-16 bg-white dark:bg-[#0B1220] border-b border-gray-200 dark:border-[#1F2A3A] flex items-center justify-between px-3 sm:px-4 lg:px-6 z-10 relative">
      <div className="flex items-center min-w-0">
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 mr-3 text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none hidden lg:block">
          <Icons.Menu />
        </button>

        <div className="lg:hidden mr-2 flex items-center gap-2 shrink-0">
          <Icons.Logo className="w-9 h-9 rounded-md" />
          <span className="text-[15px] font-black tracking-tight leading-none whitespace-nowrap text-gray-900 dark:text-white">
            MAGIC<span className="text-[#FF6B00] dark:text-[#FF8A3D]">BOT</span>
          </span>
        </div>

        {/* Desktop Page Title */}
        <h1 className="text-lg font-bold text-gray-800 dark:text-white capitalize hidden lg:block">
          {activeTab === 'shop' ? t.shop : t[activeTab] || activeTab}
        </h1>
      </div>

      <div className="flex items-center space-x-1 sm:space-x-3 min-w-0">
        {linkedBroker ? (
          <>
            <div className="hidden sm:flex items-center space-x-2 bg-green-50 dark:bg-green-950/20 px-3 py-1.5 rounded-full border border-green-100 dark:border-green-800">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-bold text-green-700 dark:text-green-400 hidden sm:inline">{t.connected}</span>
              <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 border-l border-green-200 dark:border-green-800 pl-2">{linkedBalanceLabel}</span>
              <span title={fxTitle} className="ml-1 inline-flex items-center gap-1 border-l border-green-200 dark:border-green-800 pl-2">
                <span className={`h-2 w-2 rounded-full ${fxDotClass}`} />
                <span className="text-[10px] font-bold text-gray-500 dark:text-[#94A3B8]">FX</span>
              </span>
            </div>

            <div className="relative sm:hidden">
              <button
                onClick={() => {
                  setIsBrokerPopoverOpen(!isBrokerPopoverOpen);
                  setIsLangDropdownOpen(false);
                  setIsProfileDropdownOpen(false);
                }}
                className="flex items-center justify-center w-9 h-9 rounded-full border border-green-100 dark:border-green-800 bg-green-50 dark:bg-green-950/20 shadow-sm"
                title={t.accountBalance}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              </button>

              {isBrokerPopoverOpen && (
                <div className="absolute right-0 top-full mt-2 w-40 rounded-2xl border border-green-100 dark:border-green-800 bg-white dark:bg-[#0B1220] shadow-2xl p-3 z-50 animate-fade-in">
                  <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[11px] font-bold uppercase tracking-wide text-green-700 dark:text-green-400">{t.connected}</span>
                  </div>
                  <div className="mt-2 text-sm font-semibold text-gray-800 dark:text-gray-200">{linkedBalanceLabel}</div>
                  <div title={fxTitle} className="mt-1 flex items-center gap-2 text-[10px] font-bold text-gray-500 dark:text-[#94A3B8]">
                    <span className={`h-2 w-2 rounded-full ${fxDotClass}`} />
                    <span>FX</span>
                    <span className="truncate">{fxStatusLabel}</span>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div onClick={() => setActiveTab('account')} className="hidden sm:flex items-center space-x-2 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 px-3 py-1.5 rounded-full border border-red-100 dark:border-red-900 cursor-pointer transition-colors">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-xs font-bold text-red-600 dark:text-red-400 hidden sm:inline">{t.semContas}</span>
            </div>

            <div className="relative sm:hidden">
              <button
                onClick={() => {
                  setIsBrokerPopoverOpen(!isBrokerPopoverOpen);
                  setIsLangDropdownOpen(false);
                  setIsProfileDropdownOpen(false);
                }}
                className="flex items-center justify-center w-9 h-9 rounded-full border border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-950/20 shadow-sm"
                title={t.accountStatus}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              </button>

              {isBrokerPopoverOpen && (
                <div className="absolute right-0 top-full mt-2 w-44 rounded-2xl border border-red-100 dark:border-red-900 bg-white dark:bg-[#0B1220] shadow-2xl p-3 z-50 animate-fade-in">
                  <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span className="text-[11px] font-bold uppercase tracking-wide text-red-600 dark:text-red-400">{t.semContas}</span>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab('account');
                      setIsBrokerPopoverOpen(false);
                    }}
                    className="mt-2 text-xs font-semibold text-[#FF6B00]"
                  >
                    {t.openAccount}
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        <div className="relative">
          <button
            onClick={() => {
              setIsLangDropdownOpen(!isLangDropdownOpen);
              setIsProfileDropdownOpen(false);
              setIsBrokerPopoverOpen(false);
            }}
            className="p-1 sm:p-2 text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none transition-colors"
            title={t.changeLanguage}
          >
            <Icons.Globe />
          </button>

          {isLangDropdownOpen && (
            <div className="absolute right-0 mt-2 bg-white dark:bg-[#0B1220] border border-gray-200 dark:border-[#1F2A3A] rounded-xl shadow-xl py-2 w-44 z-50 animate-fade-in text-gray-800 dark:text-gray-200">
              <button onClick={() => { setCurrentLanguage('pt'); setIsLangDropdownOpen(false); showToast(t.languageChangedPt); }} className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center space-x-3 text-xs font-bold ${currentLanguage === 'pt' ? 'text-[#FF6B00]' : ''}`}>
                <span>PT</span><span>Português</span>
              </button>
              <button onClick={() => { setCurrentLanguage('en'); setIsLangDropdownOpen(false); showToast(t.languageChangedEn); }} className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center space-x-3 text-xs font-bold ${currentLanguage === 'en' ? 'text-[#FF6B00]' : ''}`}>
                <span>EN</span><span>English</span>
              </button>
              <button onClick={() => { setCurrentLanguage('es'); setIsLangDropdownOpen(false); showToast(t.languageChangedEs); }} className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center space-x-3 text-xs font-bold ${currentLanguage === 'es' ? 'text-[#FF6B00]' : ''}`}>
                <span>ES</span><span>Español</span>
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => {
            setIsDarkMode(!isDarkMode);
            setIsBrokerPopoverOpen(false);
            playAlertSound(650, 0.1);
            showToast(isDarkMode ? t.themeLight : t.themeDark);
          }}
          className="p-1 sm:p-2 text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none transition-colors"
          title={t.toggleTheme}
        >
          {isDarkMode ? (
            <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.46 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" /></svg>
          ) : (
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg>
          )}
        </button>

        <div className="relative cursor-pointer p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => { setIsBrokerPopoverOpen(false); setHasNotifGlow(false); showToast(t.noNewMessages); }}>
          <Icons.Bell />
          {hasNotifGlow && <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-orange-600 border-2 border-white dark:border-[#1E293B] animate-pulse" />}
        </div>

        <div className="relative">
          <button
            onClick={() => {
              setIsProfileDropdownOpen(!isProfileDropdownOpen);
              setIsLangDropdownOpen(false);
              setIsBrokerPopoverOpen(false);
            }}
            className="focus:outline-none transition-transform transform hover:scale-105"
            title="Menu do Perfil"
          >
            <svg width="34" height="34" viewBox="0 0 40 40" className="rounded-full shadow-md border-2 border-[#00B0FF]">
              <circle cx="20" cy="20" r="20" fill="#009688" />
              <path d="M12 25c2-4 6-6 8-6s6 2 8 6" stroke="#FFFFFF" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              <circle cx="20" cy="13" r="4.5" fill="#FFFFFF" />
              <circle cx="14" cy="20" r="2" fill="#00E676" />
              <circle cx="26" cy="20" r="2" fill="#00E676" />
            </svg>
          </button>

          {isProfileDropdownOpen && (
            <div className="absolute right-0 mt-2 bg-white dark:bg-[#0B1220] border border-gray-200 dark:border-[#1F2A3A] rounded-2xl shadow-2xl p-2 w-56 z-50 animate-fade-in text-gray-800 dark:text-gray-200">
              <button onClick={() => { setActiveTab('account'); setIsProfileDropdownOpen(false); }} className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center space-x-3 text-xs font-bold transition-all">
                <Icons.User /> <span>{t.myAccount}</span>
              </button>
              <button onClick={() => { setActiveTab('affiliates'); setIsProfileDropdownOpen(false); }} className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center space-x-3 text-xs font-bold transition-all">
                <Icons.Users /> <span>{t.afiliado}</span>
              </button>
              <button onClick={() => { showToast(t.officialTelegramAccess); playAlertSound(800, 0.15); setIsProfileDropdownOpen(false); }} className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center space-x-3 text-xs font-bold transition-all">
                <Icons.Telegram /> <span>{t.telegramGroup}</span>
              </button>
              <button onClick={() => { showToast(t.vipGiveawayHint); setIsProfileDropdownOpen(false); }} className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center space-x-3 text-xs font-bold transition-all">
                <Icons.Gift /> <span>{t.giveaway}</span>
              </button>

              <div className="border-t border-gray-100 dark:border-[#334155] my-1.5" />

              <button
                onClick={() => {
                  handleLogOut();
                  setIsProfileDropdownOpen(false);
                }}
                className="w-full text-left px-4 py-2.5 rounded-xl bg-pink-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 font-extrabold flex items-center space-x-3 text-xs hover:bg-pink-100 transition-colors"
              >
                <Icons.LogOut /> <span>{t.logOut}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
