import { MobileNavItem } from './components/MobileNavItem';
import { BrokerLinkModal } from './components/modals/BrokerLinkModal';
import { PixModal } from './components/modals/PixModal';
import { AppHeader } from './components/layout/AppHeader';
import { AppSidebar } from './components/layout/AppSidebar';
import { LoginScreen } from './components/layout/LoginScreen';
import { ToastNotification } from './components/layout/ToastNotification';
import { AccountTab } from './components/tabs/AccountTab';
import { AffiliatesTab } from './components/tabs/AffiliatesTab';
import { AiTab } from './components/tabs/AiTab';
import { CopyTab } from './components/tabs/CopyTab';
import { DashboardTab } from './components/tabs/DashboardTab';
import { LiveTab } from './components/tabs/LiveTab';
import { SettingsTab } from './components/tabs/SettingsTab';
import { ShopTab } from './components/tabs/ShopTab';
import { SignalsTab } from './components/tabs/SignalsTab';
import { StrategiesTab } from './components/tabs/StrategiesTab';
import { Icons } from './constants/icons';
import { globalStyles } from './constants/globalStyles';
import { useBrokerState } from './hooks/useBrokerState';
import { useLicenseState } from './hooks/useLicenseState';
import { useSessionState } from './hooks/useSessionState';
import { useSettingsState } from './hooks/useSettingsState';
import { useSignalsState } from './hooks/useSignalsState';
import { useStrategyState } from './hooks/useStrategyState';
import { useUiState } from './hooks/useUiState';
import { playAlertSound } from './utils/audio';

export default function App() {
  const ui = useUiState();
  const session = useSessionState(ui.showToast, ui.t);
  const license = useLicenseState(ui.showToast, playAlertSound, ui.t);
  const broker = useBrokerState(ui.showToast, playAlertSound, ui.t);
  const strategy = useStrategyState(ui.showToast, ui.t);
  const settings = useSettingsState();
  const signals = useSignalsState({
    isLoggedIn: session.isLoggedIn,
    remainingDays: license.remainingDays,
    t: ui.t,
    showToast: ui.showToast,
    playAlertSound,
    setActiveTab: ui.setActiveTab
  });

  const handleCopyText = (text, label) => {
    const dummy = document.createElement('textarea');
    document.body.appendChild(dummy);
    dummy.value = text;
    dummy.select();
    document.execCommand('copy');
    document.body.removeChild(dummy);
    ui.showToast(`${label} copiado para a área de transferência!`);
  };

  const renderActiveTab = () => {
    switch (ui.activeTab) {
      case 'dashboard':
        return <DashboardTab remainingDays={license.remainingDays} expirationDate={license.expirationDate} t={ui.t} setActiveTab={ui.setActiveTab} formatMoney={ui.formatMoney} />;
      case 'signals':
        return (
          <SignalsTab
            t={ui.t}
            botStatus={signals.botStatus}
            handleStartBot={signals.handleStartBot}
            signalsText={signals.signalsText}
            setSignalsText={signals.setSignalsText}
            selectedDate={signals.selectedDate}
            setSelectedDate={signals.setSelectedDate}
            fileInputRef={signals.fileInputRef}
            handleFileUpload={signals.handleFileUpload}
            handleExport={signals.handleExport}
            parsedSignals={signals.parsedSignals}
            validCount={signals.validCount}
            showToast={ui.showToast}
          />
        );
      case 'live':
        return (
          <LiveTab
            liveSignals={signals.liveSignals}
            botStatus={signals.botStatus}
            handleStartBot={signals.handleStartBot}
            t={ui.t}
            formatMoney={ui.formatMoney}
            baseBalance={broker.brokersList.find((b) => b.status === 'Linked')?.balance ?? 0}
            baseBalanceCurrency={broker.brokersList.find((b) => b.status === 'Linked')?.baseCurrency ?? 'USD'}
          />
        );
      case 'strategies':
        return (
          <StrategiesTab
            newStratName={strategy.newStratName}
            setNewStratName={strategy.setNewStratName}
            newStratTf={strategy.newStratTf}
            setNewStratTf={strategy.setNewStratTf}
            selectedIndicators={strategy.selectedIndicators}
            handleCheckboxIndicator={strategy.handleCheckboxIndicator}
            handleCreateStrategy={strategy.handleCreateStrategy}
            strategiesList={strategy.strategiesList}
            removeStrategy={strategy.removeStrategy}
            t={ui.t}
          />
        );
      case 'ai':
        return <AiTab showToast={ui.showToast} t={ui.t} />;
      case 'copy':
        return <CopyTab showToast={ui.showToast} t={ui.t} formatMoney={ui.formatMoney} />;
      case 'affiliates':
        return <AffiliatesTab handleCopyText={handleCopyText} t={ui.t} formatMoney={ui.formatMoney} />;
      case 'account':
        return (
          <AccountTab
            selectedTimezone={broker.selectedTimezone}
            setSelectedTimezone={broker.setSelectedTimezone}
            brokersList={broker.brokersList}
            triggerLinkBroker={broker.triggerLinkBroker}
            disconnectBroker={broker.disconnectBroker}
            showToast={ui.showToast}
            t={ui.t}
          />
        );
      case 'settings':
        return (
          <SettingsTab
            config={settings.config}
            setConfig={settings.setConfig}
            showToast={ui.showToast}
            playAlertSound={playAlertSound}
            t={ui.t}
            currency={ui.currency}
            setCurrency={ui.setCurrencyUser}
            currencyOptions={ui.currencyOptions}
            fxLoading={ui.fxLoading}
            fxUpdatedAt={ui.fxUpdatedAt}
            fxStatusLabel={ui.fxStatusLabel}
          />
        );
      case 'shop':
        return <ShopTab shopCycle={license.shopCycle} setShopCycle={license.setShopCycle} buyDaysSimulate={license.buyDaysSimulate} t={ui.t} formatMoney={ui.formatMoney} />;
      default:
        return null;
    }
  };

  if (!session.isLoggedIn) {
    return <LoginScreen handleLogIn={session.handleLogIn} t={ui.t} />;
  }

  return (
    <div className={`flex h-screen overflow-hidden font-sans transition-colors duration-200 ${ui.isDarkMode ? 'dark text-white' : ''}`} style={{ backgroundColor: ui.currentColors.bgMain }}>
      <ToastNotification toastMessage={ui.toastMessage} />

      <AppSidebar
        activeTab={ui.activeTab}
        setActiveTab={ui.setActiveTab}
        isSidebarOpen={ui.isSidebarOpen}
        currentColors={ui.currentColors}
        t={ui.t}
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden pb-20 lg:pb-0">
        <AppHeader
          activeTab={ui.activeTab}
          t={ui.t}
          setIsSidebarOpen={ui.setIsSidebarOpen}
          isSidebarOpen={ui.isSidebarOpen}
          brokersList={broker.brokersList}
          setActiveTab={ui.setActiveTab}
          isLangDropdownOpen={ui.isLangDropdownOpen}
          setIsLangDropdownOpen={ui.setIsLangDropdownOpen}
          isProfileDropdownOpen={ui.isProfileDropdownOpen}
          setIsProfileDropdownOpen={ui.setIsProfileDropdownOpen}
          currentLanguage={ui.currentLanguage}
          setCurrentLanguage={ui.setCurrentLanguage}
          showToast={ui.showToast}
          isDarkMode={ui.isDarkMode}
          setIsDarkMode={ui.setIsDarkMode}
          playAlertSound={playAlertSound}
          hasNotifGlow={ui.hasNotifGlow}
          setHasNotifGlow={ui.setHasNotifGlow}
          handleLogOut={session.handleLogOut}
          formatMoney={ui.formatMoney}
          fxLoading={ui.fxLoading}
          fxError={ui.fxError}
          fxStatusLabel={ui.fxStatusLabel}
        />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar pb-12">
          {renderActiveTab()}
        </main>
      </div>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1E293B] border-t border-gray-200 dark:border-[#334155] h-16 flex justify-around items-center z-40 px-2 pb-safe overflow-visible">
        <MobileNavItem icon={Icons.Dashboard} label="Dash" active={ui.activeTab === 'dashboard'} onClick={() => ui.setActiveTab('dashboard')} />
        <MobileNavItem icon={Icons.Activity} label="Ao Vivo" active={ui.activeTab === 'live'} onClick={() => ui.setActiveTab('live')} />
        <MobileNavItem prominent icon={Icons.Signals} label="Sinais" active={ui.activeTab === 'signals'} onClick={() => ui.setActiveTab('signals')} />
        <MobileNavItem icon={Icons.Settings} label="Config" active={ui.activeTab === 'settings'} onClick={() => ui.setActiveTab('settings')} />
        <MobileNavItem icon={Icons.ShoppingBag} label="Loja" active={ui.activeTab === 'shop'} onClick={() => ui.setActiveTab('shop')} />
      </div>

      <BrokerLinkModal
        activeBrokerLinking={broker.activeBrokerLinking}
        setActiveBrokerLinking={broker.setActiveBrokerLinking}
        submitLinkBroker={broker.submitLinkBroker}
        brokerEmailInput={broker.brokerEmailInput}
        setBrokerEmailInput={broker.setBrokerEmailInput}
        brokerPassInput={broker.brokerPassInput}
        setBrokerPassInput={broker.setBrokerPassInput}
        isLinkingLoading={broker.isLinkingLoading}
        t={ui.t}
      />

      <PixModal
        showPixModal={license.showPixModal}
        pixAmount={license.pixAmount}
        handlePixSuccess={license.handlePixSuccess}
        setShowPixModal={license.setShowPixModal}
        t={ui.t}
        formatMoney={ui.formatMoney}
      />

      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
    </div>
  );
}
