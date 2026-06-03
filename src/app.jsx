import { useEffect } from 'react';
import { MobileNavItem } from './components/MobileNavItem';
import { BrokerLinkModal } from './components/modals/BrokerLinkModal';
import { PixModal } from './components/modals/PixModal';
import { AppHeader } from './components/layout/AppHeader';
import { AppSidebar } from './components/layout/AppSidebar';
import { LoginScreen } from './components/layout/LoginScreen';
import { ToastNotification } from './components/layout/ToastNotification';
import { AccountTab } from './components/tabs/AccountTab';
import { AdminTab } from './components/tabs/AdminTab';
import { AffiliatesTab } from './components/tabs/AffiliatesTab';
import { AiTab } from './components/tabs/AiTab';
import { CopyTab } from './components/tabs/CopyTab';
import { DashboardTab } from './components/tabs/DashboardTab';
import { LiveTab } from './components/tabs/LiveTab';
import { SettingsTab } from './components/tabs/SettingsTab';
import { ShopTab } from './components/tabs/ShopTab';
import { SignalsTab } from './components/tabs/SignalsTab';
import { StrategiesTab } from './components/tabs/StrategiesTab';
import { PremiumBlockedTab } from './components/tabs/PremiumBlockedTab';
import { Icons } from './constants/icons';
import { globalStyles } from './constants/globalStyles';
import { useBrokerState } from './hooks/useBrokerState';
import { useAdminState } from './hooks/useAdminState';
import { useAffiliatesState } from './hooks/useAffiliatesState';
import { useDashboardState } from './hooks/useDashboardState';
import { useLicenseState } from './hooks/useLicenseState';
import { useSignalsEntitlementState } from './hooks/useSignalsEntitlementState';
import { useSessionState } from './hooks/useSessionState';
import { useSettingsState } from './hooks/useSettingsState';
import { useSignalsState } from './hooks/useSignalsState';
import { useSupabaseWorkspace } from './hooks/useSupabaseWorkspace';
import { useStrategyState } from './hooks/useStrategyState';
import { useUiState } from './hooks/useUiState';
import { playAlertSound } from './utils/audio';
import { getBrokerExternalUrl } from './utils/brokerNavigation';

export default function App() {
  const ui = useUiState();
  const session = useSessionState(ui.showToast, ui.t);
  const admin = useAdminState(session.isAdmin, ui.showToast, ui.t);
  const affiliates = useAffiliatesState(session.isLoggedIn, ui.showToast, ui.t);
  const workspace = useSupabaseWorkspace(session.isLoggedIn, ui.showToast, ui.t);
  const dashboard = useDashboardState(workspace.workspaceId, session.isLoggedIn, ui.showToast, ui.t);
  const license = useLicenseState(workspace.workspaceId, session.isLoggedIn, session.isAdmin, ui.showToast, playAlertSound, ui.t);
  const signalsEntitlement = useSignalsEntitlementState(workspace.workspaceId, session.isLoggedIn, ui.showToast, ui.t);
  const broker = useBrokerState(workspace.workspaceId, ui.showToast, playAlertSound, ui.t);
  const strategy = useStrategyState(ui.showToast, ui.t);
  const settings = useSettingsState(workspace.workspaceId, ui.showToast, ui.t);
  const signals = useSignalsState({
    workspaceId: workspace.workspaceId,
    isLoggedIn: session.isLoggedIn,
    remainingDays: license.remainingDays,
    hasSignalsListAccess: signalsEntitlement.isSignalsListActive || session.isAdmin,
    t: ui.t,
    showToast: ui.showToast,
    playAlertSound,
    setActiveTab: ui.setActiveTab,
    entryValue: settings.config.entryValue
  });

  const isSignalsOnly = !session.isAdmin && license.remainingDays <= 0 && signalsEntitlement.isSignalsListActive;
  const visibleTabs = isSignalsOnly ? ['signals', 'account', 'shop'] : null;

  useEffect(() => {
    if (!isSignalsOnly) return;
    const allowed = new Set(['signals', 'account', 'shop']);
    if (!allowed.has(ui.activeTab)) {
      ui.setActiveTab('signals');
    }
  }, [isSignalsOnly, ui.activeTab, ui.setActiveTab]);

  const handleCopyText = (text, label) => {
    const dummy = document.createElement('textarea');
    document.body.appendChild(dummy);
    dummy.value = text;
    dummy.select();
    document.execCommand('copy');
    document.body.removeChild(dummy);
    ui.showToast(`${label} copiado para a área de transferência!`);
  };

  const handleOpenSignalInBroker = (signal) => {
    const brokerName = settings.config.broker;
    const brokerKey = broker.brokersList.find((item) => item.name === brokerName)?.id || null;
    const brokerItem = brokerKey ? broker.brokersList.find((item) => item.id === brokerKey) : null;
    const accountTypeLabel = settings.config.accountType === 'Real' ? 'LIVE/REAL' : 'DEMO';

    if (!brokerItem || brokerItem.status !== 'Linked') {
      ui.showToast(`Vincule a corretora "${brokerName}" antes de abrir sinais (${accountTypeLabel}).`);
      ui.setActiveTab('account');
      return;
    }

    const url = getBrokerExternalUrl({ brokerKey, brokerName, brokersList: broker.brokersList });
    if (!url) {
      ui.showToast(`URL externa não configurada para "${brokerName}".`);
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
    ui.showToast(`Abra a conta ${accountTypeLabel} na corretora e execute: ${signal.asset} ${signal.timeframe} ${signal.timeOrRate} ${signal.action}.`);
  };

  const renderActiveTab = () => {
    const isSignalsUnlocked = session.isAdmin || license.remainingDays > 0 || signalsEntitlement.isSignalsListActive;
    const premiumTabs = new Set(['live', 'strategies', 'ai', 'copy', 'settings']);
    if (!isSignalsUnlocked) {
      premiumTabs.add('signals');
      premiumTabs.add('account');
    }

    if (license.isPremiumBlocked && premiumTabs.has(ui.activeTab)) {
      return <PremiumBlockedTab t={ui.t} setActiveTab={ui.setActiveTab} />;
    }

    switch (ui.activeTab) {
      case 'dashboard':
        return (
          <DashboardTab
            remainingDays={license.remainingDays}
            expirationDate={license.expirationDate}
            t={ui.t}
            setActiveTab={ui.setActiveTab}
            formatMoney={ui.formatMoney}
            dashboard={dashboard.metrics}
            isDashboardLoading={dashboard.isDashboardLoading}
          />
        );
      case 'signals':
        return (
          <SignalsTab
            t={ui.t}
            botStatus={signals.botStatus}
            handleStartBot={signals.handleStartBot}
            signalsText={signals.signalsText}
            setSignalsText={signals.setSignalsText}
            isSignalsReadOnly={signals.isSignalsReadOnly}
            selectedDate={signals.selectedDate}
            setSelectedDate={signals.setSelectedDate}
            fileInputRef={signals.fileInputRef}
            handleFileUpload={signals.handleFileUpload}
            handleSaveSignals={signals.handleSaveSignals}
            handleClearSignals={signals.handleClearSignals}
            handleExport={signals.handleExport}
            parsedSignals={signals.parsedSignals}
            validCount={signals.validCount}
            isSignalsLoading={signals.isSignalsLoading}
            isSignalsSaving={signals.isSignalsSaving}
            handleOpenInBroker={handleOpenSignalInBroker}
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
            baseBalance={(broker.brokersList.find((b) => b.status === 'Linked' && b.name === settings.config.broker) || broker.brokersList.find((b) => b.status === 'Linked'))?.balance ?? 0}
            baseBalanceCurrency={(broker.brokersList.find((b) => b.status === 'Linked' && b.name === settings.config.broker) || broker.brokersList.find((b) => b.status === 'Linked'))?.baseCurrency ?? 'USD'}
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
        return (
          <AffiliatesTab
            handleCopyText={handleCopyText}
            t={ui.t}
            referralCode={session.referralCode}
            summary={affiliates.affiliateSummary}
            network={affiliates.affiliateNetwork}
            isLoading={affiliates.isAffiliatesLoading}
          />
        );
      case 'account':
        return (
          <AccountTab
            userEmail={session.user?.email || ''}
            selectedTimezone={broker.selectedTimezone}
            saveSelectedTimezone={broker.saveSelectedTimezone}
            brokersList={broker.brokersList}
            triggerLinkBroker={broker.triggerLinkBroker}
            disconnectBroker={broker.disconnectBroker}
            showToast={ui.showToast}
            t={ui.t}
          />
        );
      case 'admin':
        if (!session.isAdmin) {
          return (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm font-semibold text-gray-600 dark:border-[#334155] dark:bg-[#0B1220] dark:text-[#CBD5E1]">
              Acesso restrito a administradores.
            </div>
          );
        }
        return (
          <AdminTab
            t={ui.t}
            summary={admin.summary}
            users={admin.users}
            workspaces={admin.workspaces}
            filters={admin.filters}
            setFilter={admin.setFilter}
            sortOrders={admin.sortOrders}
            setSortOrder={admin.setSortOrder}
            userPage={admin.userPage}
            workspacePage={admin.workspacePage}
            userTotalPages={admin.userTotalPages}
            workspaceTotalPages={admin.workspaceTotalPages}
            setUserPage={admin.setUserPage}
            setWorkspacePage={admin.setWorkspacePage}
            usersTotalFiltered={admin.usersTotalFiltered}
            workspacesTotalFiltered={admin.workspacesTotalFiltered}
            selectedWorkspaceId={admin.selectedWorkspaceId}
            workspaceDetails={admin.workspaceDetails}
            selectedWaiverUser={admin.selectedWaiverUser}
            isAdminLoading={admin.isAdminLoading}
            isWorkspaceDetailsLoading={admin.isWorkspaceDetailsLoading}
            isGrantingWaiver={admin.isGrantingWaiver}
            openWorkspaceDetails={admin.openWorkspaceDetails}
            closeWorkspaceDetails={admin.closeWorkspaceDetails}
            openWaiverModal={admin.openWaiverModal}
            closeWaiverModal={admin.closeWaiverModal}
            confirmMonthlyWaiver={admin.confirmMonthlyWaiver}
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

  if (session.isAuthLoading || (session.isLoggedIn && (workspace.isWorkspaceLoading || license.isLicenseLoading))) {
    return (
      <>
        <ToastNotification toastMessage={ui.toastMessage} />
        <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-[#070B14]">
          <div className="text-sm font-semibold text-gray-500 dark:text-[#CBD5E1]">{ui.t.loadingSignals}</div>
        </div>
      </>
    );
  }

  if (!session.isLoggedIn) {
    return (
      <>
        <ToastNotification toastMessage={ui.toastMessage} />
        <LoginScreen
          handleLogIn={session.handleLogIn}
          t={ui.t}
          isAuthLoading={session.isAuthLoading}
          isAuthSubmitting={session.isAuthSubmitting}
          authFeedback={session.authFeedback}
          clearAuthFeedback={session.clearAuthFeedback}
        />
      </>
    );
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
        visibleTabs={visibleTabs}
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
          isAdmin={session.isAdmin}
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
        {!isSignalsOnly ? <MobileNavItem icon={Icons.Dashboard} label="Dash" active={ui.activeTab === 'dashboard'} onClick={() => ui.setActiveTab('dashboard')} /> : null}
        {!isSignalsOnly ? <MobileNavItem icon={Icons.Activity} label="Ao Vivo" active={ui.activeTab === 'live'} onClick={() => ui.setActiveTab('live')} /> : null}
        <MobileNavItem prominent icon={Icons.Signals} label="Sinais" active={ui.activeTab === 'signals'} onClick={() => ui.setActiveTab('signals')} />
        {!isSignalsOnly ? <MobileNavItem icon={Icons.Settings} label="Config" active={ui.activeTab === 'settings'} onClick={() => ui.setActiveTab('settings')} /> : null}
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
