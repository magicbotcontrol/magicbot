import { useEffect, useState } from 'react';
import { MobileNavItem } from './components/MobileNavItem';
import { BrokerLinkModal } from './components/modals/BrokerLinkModal';
import { NowPaymentsModal } from './components/modals/NowPaymentsModal';
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
import { ShopTab } from './components/tabs/ShopTab';
import { Icons } from './constants/icons';
import { globalStyles } from './constants/globalStyles';
import { useBrokerState } from './hooks/useBrokerState';
import { useAdminState } from './hooks/useAdminState';
import { useAffiliatesState } from './hooks/useAffiliatesState';
import { useDashboardState } from './hooks/useDashboardState';
import { useLicenseState } from './hooks/useLicenseState';
import { useCopyTradingEntitlementState } from './hooks/useCopyTradingEntitlementState';
import { useSessionState } from './hooks/useSessionState';
import { useSettingsState } from './hooks/useSettingsState';
import { useSupabaseWorkspace } from './hooks/useSupabaseWorkspace';
import { useUiState } from './hooks/useUiState';
import { playAlertSound } from './utils/audio';

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
  const copyEntitlement = useCopyTradingEntitlementState(workspace.workspaceId, session.isLoggedIn, ui.showToast, ui.t, entitlementsReloadToken);
  const broker = useBrokerState(workspace.workspaceId, ui.showToast, playAlertSound, ui.t);
  const settings = useSettingsState(workspace.workspaceId, ui.showToast, ui.t);
  const selectedBrokerName = settings.config.broker;
  const selectedBrokerItem = broker.brokersList.find((item) => item.name === selectedBrokerName) || null;
  const monthlyBankrollUsd = (() => {
    const getBrokerBalance = (item) => {
      const sessionBalance = Number(item?.brokerSession?.account_balance);
      if (Number.isFinite(sessionBalance) && sessionBalance > 0) {
        return sessionBalance;
      }
      const fallbackBalance = Number(item?.balance);
      return Number.isFinite(fallbackBalance) && fallbackBalance > 0 ? fallbackBalance : 0;
    };

    const selectedBalance = getBrokerBalance(selectedBrokerItem);
    if (selectedBalance > 0) {
      return selectedBalance;
    }

    return broker.brokersList.reduce((highest, item) => Math.max(highest, getBrokerBalance(item)), 0);
  })();
  const hasMembershipActive = session.isAdmin || license.isMembershipActive;
  const hasCopyAccess = session.isAdmin || (hasMembershipActive && copyEntitlement.isCopyTradingActive);

  const visibleTabs = session.isAdmin ? null : ['dashboard', 'account', 'copy', 'shop', 'affiliates'];

  useEffect(() => {
    if (session.isAdmin) return;
    const allowed = new Set(['dashboard', 'account', 'affiliates', ...(visibleTabs || [])]);
    if (!allowed.has(ui.activeTab)) {
      ui.setActiveTab('copy');
    }
  }, [session.isAdmin, ui.activeTab, ui.setActiveTab, visibleTabs]);

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
      case 'copy':
        return (
          <CopyTab
            showToast={ui.showToast}
            t={ui.t}
            promoCode={session.promoCode}
            copyEntitlement={copyEntitlement.copyEntitlement}
            isCopyTradingActive={copyEntitlement.isCopyTradingActive}
            isCopyEntitlementLoading={copyEntitlement.isCopyEntitlementLoading}
            workspaceId={workspace.workspaceId}
            isLoggedIn={session.isLoggedIn}
            isAdmin={session.isAdmin}
            setActiveTab={ui.setActiveTab}
          />
        );
      case 'affiliates':
        return (
          <AffiliatesTab
            handleCopyText={handleCopyText}
            t={ui.t}
            formatMoney={ui.formatMoney}
            username={session.username}
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
            syncBrokerOperationalSession={broker.syncBrokerOperationalSession}
            confirmBrokerOperationalAccount={broker.confirmBrokerOperationalAccount}
            clearBrokerOperationalAccount={broker.clearBrokerOperationalAccount}
            brokerActionLoading={broker.brokerActionLoading}
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
            selectedChargeUser={admin.selectedChargeUser}
            chargePreview={admin.chargePreview}
            isAdminLoading={admin.isAdminLoading}
            isWorkspaceDetailsLoading={admin.isWorkspaceDetailsLoading}
            isGrantingWaiver={admin.isGrantingWaiver}
            isChargePreviewLoading={admin.isChargePreviewLoading}
            isChargingMembership={admin.isChargingMembership}
            isUpdatingTestAccount={admin.isUpdatingTestAccount}
            openWorkspaceDetails={admin.openWorkspaceDetails}
            closeWorkspaceDetails={admin.closeWorkspaceDetails}
            openWaiverModal={admin.openWaiverModal}
            closeWaiverModal={admin.closeWaiverModal}
            openChargeModal={admin.openChargeModal}
            closeChargeModal={admin.closeChargeModal}
            confirmMonthlyWaiver={admin.confirmMonthlyWaiver}
            confirmMonthlyCharge={admin.confirmMonthlyCharge}
            toggleTestAccount={admin.toggleTestAccount}
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
            monthlyBankrollUsd={monthlyBankrollUsd}
            hasCopyAccess={hasCopyAccess}
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
        <MobileNavItem icon={Icons.User} label="Conta" active={ui.activeTab === 'account'} onClick={() => ui.setActiveTab('account')} />
        <MobileNavItem prominent icon={Icons.Copy} label="Copy" active={ui.activeTab === 'copy'} onClick={() => ui.setActiveTab('copy')} />
        <MobileNavItem icon={Icons.ShoppingBag} label="Loja" active={ui.activeTab === 'shop'} onClick={() => ui.setActiveTab('shop')} />
        <MobileNavItem icon={Icons.Users} label="Afiliado" active={ui.activeTab === 'affiliates'} onClick={() => ui.setActiveTab('affiliates')} />
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

      <NowPaymentsModal
        isOpen={Boolean(license.nowPaymentsModalOffer)}
        offer={license.nowPaymentsModalOffer}
        paymentOrder={license.nowPaymentsPaymentOrder}
        currencies={license.nowPaymentsCurrencies}
        selectedCurrency={license.nowPaymentsSelectedCurrency}
        setSelectedCurrency={license.setNowPaymentsSelectedCurrency}
        onCreatePayment={license.createPaymentCheckout}
        onRefreshStatus={license.refreshPaymentCheckout}
        onClose={license.closeNowPaymentsModal}
        isCreating={license.isNowPaymentsPreparing}
        isRefreshing={license.isNowPaymentsRefreshing}
        errorMessage={license.nowPaymentsErrorMessage}
        formatMoney={ui.formatMoney}
      />

      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
    </div>
  );
}
