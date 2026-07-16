import { useEffect, useState } from 'react';
import { MobileNavItem } from './components/MobileNavItem';
import { BrokerLinkModal } from './components/modals/BrokerLinkModal';
import { PixModal } from './components/modals/PixModal';
import { AppHeader } from './components/layout/AppHeader';
import { AppSidebar } from './components/layout/AppSidebar';
import { ConfirmEmailScreen } from './components/layout/ConfirmEmailScreen';
import { ForgotPasswordScreen } from './components/layout/ForgotPasswordScreen';
import { LoginScreen } from './components/layout/LoginScreen';
import { ResetPasswordScreen } from './components/layout/ResetPasswordScreen';
import { ToastNotification } from './components/layout/ToastNotification';
import { AccountTab } from './components/tabs/AccountTab';
import { AdminTab } from './components/tabs/AdminTab';
import { AffiliatesTab } from './components/tabs/AffiliatesTab';
import { CopyTab } from './components/tabs/CopyTab';
import { DashboardTab } from './components/tabs/DashboardTab';
import { DailySignalsTab } from './components/tabs/DailySignalsTab';
import { SettingsTab } from './components/tabs/SettingsTab';
import { ShopTab } from './components/tabs/ShopTab';
import { SignalsTab } from './components/tabs/SignalsTab';
import { PremiumBlockedTab } from './components/tabs/PremiumBlockedTab';
import { Icons } from './constants/icons';
import { globalStyles } from './constants/globalStyles';
import { useBrokerState } from './hooks/useBrokerState';
import { useAdminState } from './hooks/useAdminState';
import { useAffiliatesState } from './hooks/useAffiliatesState';
import { useDashboardState } from './hooks/useDashboardState';
import { useLicenseState } from './hooks/useLicenseState';
import { useCopyTradingEntitlementState } from './hooks/useCopyTradingEntitlementState';
import { useSignalsEntitlementState } from './hooks/useSignalsEntitlementState';
import { useSessionState } from './hooks/useSessionState';
import { useSettingsState } from './hooks/useSettingsState';
import { useSignalsState } from './hooks/useSignalsState';
import { useSupabaseWorkspace } from './hooks/useSupabaseWorkspace';
import { useUiState } from './hooks/useUiState';
import { playAlertSound } from './utils/audio';
import { getBrokerExternalUrl } from './utils/brokerNavigation';

export default function App() {
  const ui = useUiState();
  const session = useSessionState(ui.showToast, ui.t);
  const [authView, setAuthView] = useState('login');
  const [entitlementsReloadToken, setEntitlementsReloadToken] = useState(0);
  const admin = useAdminState(session.isAdmin, ui.showToast, ui.t);
  const affiliates = useAffiliatesState(session.isLoggedIn, ui.showToast, ui.t);
  const workspace = useSupabaseWorkspace(session.isLoggedIn, ui.showToast, ui.t);
  const dashboard = useDashboardState(workspace.workspaceId, session.isLoggedIn, ui.showToast, ui.t);
  const license = useLicenseState(
    workspace.workspaceId,
    session.isLoggedIn,
    session.isAdmin,
    ui.showToast,
    playAlertSound,
    ui.t,
    () => setEntitlementsReloadToken((current) => current + 1)
  );
  const signalsEntitlement = useSignalsEntitlementState(workspace.workspaceId, session.isLoggedIn, ui.showToast, ui.t, entitlementsReloadToken);
  const copyEntitlement = useCopyTradingEntitlementState(workspace.workspaceId, session.isLoggedIn, ui.showToast, ui.t, entitlementsReloadToken);
  const broker = useBrokerState(workspace.workspaceId, ui.showToast, playAlertSound, ui.t);
  const settings = useSettingsState(workspace.workspaceId, ui.showToast, ui.t);
  const selectedBrokerName = settings.config.broker;
  const selectedBrokerItem = broker.brokersList.find((item) => item.name === selectedBrokerName) || null;
  const linkedBrokersCount = broker.brokersList.filter((item) => item.status === 'Linked').length;
  const hasMembershipActive = session.isAdmin || license.isMembershipActive;
  const hasDailyListAccess = session.isAdmin || (hasMembershipActive && signalsEntitlement.isSignalsDailyListActive);
  const hasAutomatorAccess = session.isAdmin || (hasMembershipActive && signalsEntitlement.isSignalsAutomatorActive);
  const hasCopyAccess = session.isAdmin || (hasMembershipActive && copyEntitlement.isCopyTradingActive);
  const hasSignalsPackageAccess = hasDailyListAccess || hasAutomatorAccess;
  const hasFullAccess = hasCopyAccess && hasDailyListAccess && hasAutomatorAccess;
  const signals = useSignalsState({
    workspaceId: workspace.workspaceId,
    isLoggedIn: session.isLoggedIn,
    hasAutomatorAccess,
    hasDailyListAccess,
    t: ui.t,
    showToast: ui.showToast,
    playAlertSound,
    setActiveTab: ui.setActiveTab,
    entryValue: settings.config.entryValue,
    executionMode: settings.config.executionMode,
    preExecutionLeadSeconds: settings.config.preExecutionLeadSeconds,
    browserAlertsEnabled: settings.config.browserAlertsEnabled
  });

  const visibleTabs = session.isAdmin
    ? null
    : [
      'dashboard',
      ...(hasSignalsPackageAccess ? ['signals'] : []),
      ...(hasDailyListAccess ? ['live', 'strategies', 'ai'] : []),
      ...(hasCopyAccess ? ['copy'] : []),
      ...(hasSignalsPackageAccess ? ['settings'] : []),
      'shop'
    ];

  useEffect(() => {
    if (session.isAdmin) return;
    const allowed = new Set(['dashboard', 'account', 'affiliates', 'shop', ...(visibleTabs || [])]);
    if (!allowed.has(ui.activeTab)) {
      ui.setActiveTab(hasSignalsPackageAccess ? 'signals' : 'shop');
    }
  }, [session.isAdmin, ui.activeTab, ui.setActiveTab, visibleTabs, hasSignalsPackageAccess]);

  useEffect(() => {
    const routeView = new URLSearchParams(window.location.search).get('authView');
    if (routeView === 'forgot-password' || routeView === 'reset-password' || routeView === 'confirm-email') {
      setAuthView(routeView);
      return;
    }

    const path = window.location.pathname.toLowerCase();

    if (path.endsWith('/forgot-password.html')) {
      setAuthView('forgot-password');
      return;
    }

    if (path.endsWith('/password-reset.html')) {
      setAuthView('reset-password');
      return;
    }

    if (path.endsWith('/confirm-email.html')) {
      setAuthView('confirm-email');
      return;
    }

    setAuthView('login');
  }, []);

  const navigateToAuthView = (nextView) => {
    const authRoutes = {
      login: '/',
      'forgot-password': '/forgot-password.html',
      'reset-password': '/password-reset.html',
      'confirm-email': '/confirm-email.html'
    };

    const nextPath = authRoutes[nextView] || '/';
    window.history.replaceState({}, '', nextPath);
    setAuthView(nextView);
  };

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
    const effectiveAccountType = signal?.effectiveAccountType === 'Real' ? 'Real' : settings.config.accountType;
    const accountTypeLabel = effectiveAccountType === 'Real' ? 'LIVE/REAL' : 'DEMO';

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
    signals.handleSignalBrokerOpen?.(signal);
    const amountLabel = signal?.effectiveAmount ? ` com valor ${Number(signal.effectiveAmount).toFixed(2)}` : '';
    ui.showToast(`A corretora foi aberta em modo assistido. Confirme manualmente: ${signal.asset} ${signal.timeframe} ${signal.timeOrRate} ${signal.action} na conta ${accountTypeLabel}${amountLabel}.`);
  };

  const renderActiveTab = () => {
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
        if (!hasSignalsPackageAccess) {
          return (
            <PremiumBlockedTab
              t={ui.t}
              setActiveTab={ui.setActiveTab}
              title="Pacote do Automatizador necessário"
              subtitle="Para usar o AutoTrader (Lista), o workspace precisa de mensalidade base ativa e de um pacote com Automatizador + Listas ou Full Access."
            />
          );
        }
        return (
          <SignalsTab
            t={ui.t}
            botStatus={signals.botStatus}
            botSlot={signals.botSlot}
            setBotSlot={signals.setBotSlot}
            selectedBotInstance={signals.selectedBotInstance}
            isBotInstancesLoading={signals.isBotInstancesLoading}
            botToleranceSeconds={signals.botToleranceSeconds}
            setBotToleranceSeconds={signals.setBotToleranceSeconds}
            isBotToleranceSaving={signals.isBotToleranceSaving}
            botExecutionAccountType={signals.botExecutionAccountType}
            setBotExecutionAccountType={signals.setBotExecutionAccountType}
            botDefaultOrderAmountInput={signals.botDefaultOrderAmountInput}
            setBotDefaultOrderAmountInput={signals.setBotDefaultOrderAmountInput}
            isBotExecutionConfigSaving={signals.isBotExecutionConfigSaving}
            handleSaveBotExecutionConfig={signals.handleSaveBotExecutionConfig}
            isBotStatusSyncing={signals.isBotStatusSyncing}
            botQueueSummary={signals.botQueueSummary}
            botRecentEvents={signals.botRecentEvents}
            isBotQueueLoading={signals.isBotQueueLoading}
            botDayJobs={signals.botDayJobs}
            isBotDayJobsLoading={signals.isBotDayJobsLoading}
            workerNode={signals.workerNode}
            workerCommands={signals.workerCommands}
            workerAttempts={signals.workerAttempts}
            isWorkerRuntimeLoading={signals.isWorkerRuntimeLoading}
            isWorkerBlueprintAvailable={signals.isWorkerBlueprintAvailable}
            workerCommandPendingType={signals.workerCommandPendingType}
            isBotActionLoading={signals.isBotActionLoading}
            handleRefreshRuntime={signals.handleRefreshRuntime}
            handleForceReleaseLease={signals.handleForceReleaseLease}
            handleRequeueFailedJobs={signals.handleRequeueFailedJobs}
            handleClearExpiredJobs={signals.handleClearExpiredJobs}
            handleStartBot={signals.handleStartBot}
            canStartBot={signals.canStartBot}
            canEditSignals={signals.canEditSignals}
            canUsePublished={signals.canUsePublished}
            sourceMode={signals.sourceMode}
            setSourceMode={signals.setSourceMode}
            selectedMarket={signals.selectedMarket}
            setSelectedMarket={signals.setSelectedMarket}
            availableFeeds={signals.availableFeeds}
            selectedAsset={signals.selectedAsset}
            setSelectedAsset={signals.setSelectedAsset}
            copyPublishedListToWorkspace={signals.copyPublishedListToWorkspace}
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
            executableSignalsCount={signals.executableSignalsCount}
            ignoredCount={signals.ignoredCount}
            isExclusionsSaving={signals.isExclusionsSaving}
            toggleSignalIgnored={signals.toggleSignalIgnored}
            isSignalsLoading={signals.isSignalsLoading}
            isSignalsSaving={signals.isSignalsSaving}
            handleOpenInBroker={handleOpenSignalInBroker}
            selectedBrokerName={selectedBrokerName}
            selectedBrokerItem={selectedBrokerItem}
            selectedAccountType={settings.config.accountType}
            isBrokerLinked={selectedBrokerItem?.status === 'Linked'}
            linkedBrokersCount={linkedBrokersCount}
            isBrokerExecutionAutomatic={false}
            brokerSession={signals.brokerSession}
            brokerSessionState={signals.brokerSessionState}
            isBrokerSessionConnected={signals.isBrokerSessionConnected}
            isBrokerSessionQaEnabled={signals.isBrokerSessionQaEnabled}
            brokerSessionQaState={signals.brokerSessionQaState}
            setBrokerSessionQaState={signals.setBrokerSessionQaState}
            executionMode={settings.config.executionMode}
            leadWindowSeconds={signals.leadWindowSeconds}
            isSimulationMode={signals.isSimulationMode}
            nextExecutionSignal={signals.nextExecutionSignal}
            runtimeTimeline={signals.runtimeTimeline}
            timelineCounts={signals.timelineCounts}
            clearRuntimeTimeline={signals.clearRuntimeTimeline}
            handleSignalManualResult={signals.handleSignalManualResult}
            signalRuntimeRows={signals.signalRuntimeRows}
            setSignalAccountTypeOverride={signals.setSignalAccountTypeOverride}
            setSignalAmountOverride={signals.setSignalAmountOverride}
          />
        );
      case 'live':
        if (!hasDailyListAccess) {
          return (
            <PremiumBlockedTab
              t={ui.t}
              setActiveTab={ui.setActiveTab}
              title="Pacote de listas necessário"
              subtitle="OB, Cripto e Forex exigem mensalidade base ativa e um pacote com acesso às listas."
            />
          );
        }
        return (
          <DailySignalsTab
            t={ui.t}
            showToast={ui.showToast}
            canViewDailyList={hasDailyListAccess}
            marketCode="ob"
            title={ui.t.live}
          />
        );
      case 'strategies':
        if (!hasDailyListAccess) {
          return (
            <PremiumBlockedTab
              t={ui.t}
              setActiveTab={ui.setActiveTab}
              title="Pacote de listas necessário"
              subtitle="OB, Cripto e Forex exigem mensalidade base ativa e um pacote com acesso às listas."
            />
          );
        }
        return (
          <DailySignalsTab
            t={ui.t}
            showToast={ui.showToast}
            canViewDailyList={hasDailyListAccess}
            marketCode="forex"
            title={ui.t.strategies}
          />
        );
      case 'ai':
        if (!hasDailyListAccess) {
          return (
            <PremiumBlockedTab
              t={ui.t}
              setActiveTab={ui.setActiveTab}
              title="Pacote de listas necessário"
              subtitle="OB, Cripto e Forex exigem mensalidade base ativa e um pacote com acesso às listas."
            />
          );
        }
        return (
          <DailySignalsTab
            t={ui.t}
            showToast={ui.showToast}
            canViewDailyList={hasDailyListAccess}
            marketCode="crypto"
            title={ui.t.ai}
          />
        );
      case 'copy':
        if (!hasCopyAccess) {
          return (
            <PremiumBlockedTab
              t={ui.t}
              setActiveTab={ui.setActiveTab}
              title="Pacote Copy Trading necessário"
              subtitle="Para usar o Copy Trading, o workspace precisa de mensalidade base ativa e do pacote Copy Trading ou Full Access."
            />
          );
        }
        return (
          <CopyTab
            showToast={ui.showToast}
            t={ui.t}
            promoCode={session.promoCode}
            copyEntitlement={copyEntitlement.copyEntitlement}
            isCopyTradingActive={copyEntitlement.isCopyTradingActive}
            isCopyEntitlementLoading={copyEntitlement.isCopyEntitlementLoading}
          />
        );
      case 'affiliates':
        return (
          <AffiliatesTab
            handleCopyText={handleCopyText}
            t={ui.t}
            formatMoney={ui.formatMoney}
            referralCode={session.referralCode}
            summary={affiliates.affiliateSummary}
            network={affiliates.affiliateNetwork}
            matrix={affiliates.affiliateMatrix}
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
            showToast={ui.showToast}
            summary={admin.summary}
            users={admin.users}
            workspaces={admin.workspaces}
            filters={admin.filters}
            setFilter={admin.setFilter}
            sortOrders={admin.sortOrders}
            setSortOrder={admin.setSortOrder}
            userPage={admin.userPage}
            workspacePage={admin.workspacePage}
            workspacePackageCounters={admin.workspacePackageCounters}
            userTotalPages={admin.userTotalPages}
            workspaceTotalPages={admin.workspaceTotalPages}
            setUserPage={admin.setUserPage}
            setWorkspacePage={admin.setWorkspacePage}
            usersTotalFiltered={admin.usersTotalFiltered}
            workspacesTotalFiltered={admin.workspacesTotalFiltered}
            selectedWorkspaceId={admin.selectedWorkspaceId}
            workspaceDetails={admin.workspaceDetails}
            selectedWaiverUser={admin.selectedWaiverUser}
            signalsFeedDate={admin.signalsFeedDate}
            signalsFeedMarket={admin.signalsFeedMarket}
            signalsFeedAssets={admin.signalsFeedAssets}
            signalsFeedAsset={admin.signalsFeedAsset}
            signalsFeedAssetInput={admin.signalsFeedAssetInput}
            signalsFeedText={admin.signalsFeedText}
            isAdminLoading={admin.isAdminLoading}
            isWorkspaceDetailsLoading={admin.isWorkspaceDetailsLoading}
            isGrantingWaiver={admin.isGrantingWaiver}
            isSignalsFeedLoading={admin.isSignalsFeedLoading}
            isSignalsFeedSaving={admin.isSignalsFeedSaving}
            isGrantingSignalsAccess={admin.isGrantingSignalsAccess}
            openWorkspaceDetails={admin.openWorkspaceDetails}
            closeWorkspaceDetails={admin.closeWorkspaceDetails}
            openWaiverModal={admin.openWaiverModal}
            closeWaiverModal={admin.closeWaiverModal}
            confirmMonthlyWaiver={admin.confirmMonthlyWaiver}
            setSignalsFeedDate={admin.setSignalsFeedDate}
            setSignalsFeedMarket={admin.setSignalsFeedMarket}
            setSignalsFeedAsset={admin.setSignalsFeedAsset}
            setSignalsFeedAssetInput={admin.setSignalsFeedAssetInput}
            setSignalsFeedText={admin.setSignalsFeedText}
            saveSignalsFeed={admin.saveSignalsFeed}
            grantDailyListAccess={admin.grantDailyListAccess}
            revokeDailyListAccess={admin.revokeDailyListAccess}
            grantAutomatorAccess={admin.grantAutomatorAccess}
            revokeAutomatorAccess={admin.revokeAutomatorAccess}
            grantSignalsBundleAccess={admin.grantSignalsBundleAccess}
            revokeSignalsBundleAccess={admin.revokeSignalsBundleAccess}
          />
        );
      case 'settings':
        if (!hasSignalsPackageAccess) {
          return (
            <PremiumBlockedTab
              t={ui.t}
              setActiveTab={ui.setActiveTab}
              title="Pacote operacional necessário"
              subtitle="As configurações operacionais são liberadas junto com os pacotes que incluem Automatizador e listas."
            />
          );
        }
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
        return (
          <ShopTab
            buyDaysSimulate={license.buyDaysSimulate}
            t={ui.t}
            formatMoney={ui.formatMoney}
            isMembershipActive={license.isMembershipActive}
            membershipExpirationDate={license.expirationDate}
            hasCopyAccess={hasCopyAccess}
            hasSignalsPackageAccess={hasSignalsPackageAccess}
            hasFullAccess={hasFullAccess}
          />
        );
      default:
        return null;
    }
  };

  const isAuthFlowView = authView === 'forgot-password' || authView === 'reset-password' || authView === 'confirm-email';

  if (session.isAuthLoading || (!isAuthFlowView && session.isLoggedIn && (workspace.isWorkspaceLoading || license.isLicenseLoading))) {
    return (
      <>
        <ToastNotification toastMessage={ui.toastMessage} />
        <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-[#070B14]">
          <div className="text-sm font-semibold text-gray-500 dark:text-[#CBD5E1]">{ui.t.loadingSignals}</div>
        </div>
      </>
    );
  }

  if (authView === 'reset-password') {
    return (
      <>
        <ToastNotification toastMessage={ui.toastMessage} />
        <ResetPasswordScreen
          handleUpdatePassword={session.handleUpdatePassword}
          t={ui.t}
          isAuthLoading={session.isAuthLoading}
          authFeedback={session.authFeedback}
          clearAuthFeedback={session.clearAuthFeedback}
          onBackToLogin={() => navigateToAuthView('login')}
        />
      </>
    );
  }

  if (authView === 'confirm-email') {
    return (
      <>
        <ToastNotification toastMessage={ui.toastMessage} />
        <ConfirmEmailScreen
          onBackToLogin={() => navigateToAuthView('login')}
          onGoToForgotPassword={() => navigateToAuthView('forgot-password')}
        />
      </>
    );
  }

  if (!session.isLoggedIn) {
    if (authView === 'forgot-password') {
      return (
        <>
          <ToastNotification toastMessage={ui.toastMessage} />
          <ForgotPasswordScreen
            handleResetPassword={session.handleResetPassword}
            t={ui.t}
            isAuthLoading={session.isAuthLoading}
            authFeedback={session.authFeedback}
            clearAuthFeedback={session.clearAuthFeedback}
            onBackToLogin={() => navigateToAuthView('login')}
          />
        </>
      );
    }

    return (
      <>
        <ToastNotification toastMessage={ui.toastMessage} />
        <LoginScreen
          handleLogIn={session.handleLogIn}
          validateReferralCode={session.validateReferralCode}
          t={ui.t}
          isAuthLoading={session.isAuthLoading}
          isAuthSubmitting={session.isAuthSubmitting}
          authFeedback={session.authFeedback}
          clearAuthFeedback={session.clearAuthFeedback}
          onForgotPassword={() => navigateToAuthView('forgot-password')}
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

      {ui.isSidebarOpen ? (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-10"
          onClick={() => ui.setIsSidebarOpen(false)}
        />
      ) : null}

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
        <MobileNavItem icon={Icons.Dashboard} label="Dash" active={ui.activeTab === 'dashboard'} onClick={() => ui.setActiveTab('dashboard')} />
        {hasDailyListAccess ? <MobileNavItem icon={Icons.Activity} label="Sinais" active={ui.activeTab === 'live'} onClick={() => ui.setActiveTab('live')} /> : null}
        {hasSignalsPackageAccess ? (
          <MobileNavItem prominent icon={Icons.Signals} label="Auto" active={ui.activeTab === 'signals'} onClick={() => ui.setActiveTab('signals')} />
        ) : hasCopyAccess ? (
          <MobileNavItem prominent icon={Icons.Copy} label="Copy" active={ui.activeTab === 'copy'} onClick={() => ui.setActiveTab('copy')} />
        ) : (
          <MobileNavItem prominent icon={Icons.ShoppingBag} label="Loja" active={ui.activeTab === 'shop'} onClick={() => ui.setActiveTab('shop')} />
        )}
        {!(!hasSignalsPackageAccess && !hasCopyAccess) ? <MobileNavItem icon={Icons.ShoppingBag} label="Loja" active={ui.activeTab === 'shop'} onClick={() => ui.setActiveTab('shop')} /> : null}
        <MobileNavItem icon={Icons.Menu} label="Menu" active={ui.isSidebarOpen} onClick={() => ui.setIsSidebarOpen(!ui.isSidebarOpen)} />
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
        pixTitle={license.pixTitle}
        pixDescription={license.pixDescription}
        handlePixSuccess={license.handlePixSuccess}
        setShowPixModal={license.setShowPixModal}
        t={ui.t}
        formatMoney={ui.formatMoney}
      />

      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
    </div>
  );
}
