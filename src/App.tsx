import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Users from './components/Users';
import Indicators from './components/Indicators';
import Billing from './components/Billing';
import LinksAndInstructions from './components/LinksAndInstructions';
import Settings from './components/Settings';
import PublicClientSignup from './components/PublicClientSignup';
import MyCopy from './components/MyCopy';
import ControlCopySignupLinks from './components/ControlCopySignupLinks';
import ResetPassword from './components/ResetPassword';
import { BRANDING } from './branding';
import Auth from './components/Auth';
import { UserAuth } from './types';
import {
  clearLegacyBrowserStorage,
  consumeAuthNotice,
  getCurrentAuthProfile,
  subscribeToAuthChanges,
  signOutCurrentUser,
} from './lib/auth';
import {
  APP_ROUTES,
  extractPublicIndicatorCode,
  isResetPasswordRoute as matchesResetPasswordRoute,
  replaceBrowserPath,
} from './lib/app-routes';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [auth, setAuth] = useState<UserAuth | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  const publicIndicatorCode = (() => {
    if (typeof window === 'undefined') {
      return null;
    }
    return extractPublicIndicatorCode(window.location.pathname);
  })();

  const isPasswordResetPage =
    typeof window !== 'undefined' && matchesResetPasswordRoute(window.location.pathname);

  useEffect(() => {
    if (isPasswordResetPage) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    let bootstrapFinished = false;

    document.title = BRANDING.documentTitle;
    clearLegacyBrowserStorage();

    const bootstrapGuardId = window.setTimeout(() => {
      if (!isMounted || bootstrapFinished) {
        return;
      }

      setAuth(null);
      setIsAuthenticated(false);
      setAuthNotice('Nao foi possivel restaurar sua sessao automaticamente. Entre novamente.');
      setIsLoading(false);
    }, 6500);

    const bootstrap = async () => {
      try {
        const storedAuth = await getCurrentAuthProfile();
        if (!isMounted) return;
        setAuth(storedAuth);
        setIsAuthenticated(!!storedAuth?.email);
      } catch {
        if (!isMounted) return;
        setAuth(null);
        setIsAuthenticated(false);
      } finally {
        bootstrapFinished = true;
        window.clearTimeout(bootstrapGuardId);
        if (isMounted) {
          setAuthNotice((currentNotice) => currentNotice ?? consumeAuthNotice());
          setIsLoading(false);
        }
      }
    };

    bootstrap();

    const { data: authListener } = subscribeToAuthChanges((nextAuth) => {
      if (!isMounted) return;
      setAuth(nextAuth);
      setIsAuthenticated(!!nextAuth?.email);
      setAuthNotice((currentNotice) => currentNotice ?? consumeAuthNotice());
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      window.clearTimeout(bootstrapGuardId);
      authListener.subscription.unsubscribe();
    };
  }, [isPasswordResetPage]);

  const handleLoginSuccess = (userAuth: UserAuth) => {
    setAuth(userAuth);
    setIsAuthenticated(true);
    setAuthNotice(null);
    setActiveTab(userAuth.level === 'Cliente' ? 'my-copy' : 'dashboard');
  };

  const handleLogout = async () => {
    try {
      await signOutCurrentUser();
    } finally {
      setAuth(null);
      setIsAuthenticated(false);
      setActiveTab('dashboard');
    }
  };

  if (isPasswordResetPage) {
    return (
      <ResetPassword
        onBackToLogin={() => {
          setAuth(null);
          setIsAuthenticated(false);
          setActiveTab('dashboard');
          setIsLoading(false);
          replaceBrowserPath(APP_ROUTES.home);
        }}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-zinc-50 flex items-center justify-center text-sm font-semibold text-zinc-500">
        Carregando ControlCopy...
      </div>
    );
  }

  if ((!isAuthenticated || !auth) && publicIndicatorCode) {
    return (
      <PublicClientSignup
        indicatorCode={publicIndicatorCode}
        onSuccess={async () => {
          const profile = await getCurrentAuthProfile();
          if (profile) {
            replaceBrowserPath(APP_ROUTES.home);
            handleLoginSuccess(profile);
          }
        }}
      />
    );
  }

  if (!isAuthenticated || !auth) {
    return <Auth onLoginSuccess={handleLoginSuccess} sessionNotice={authNotice} />;
  }

  return (
    <div className="min-h-[100dvh] bg-zinc-50 flex flex-col xl:flex-row">
      {/* Persistent Left Sidebar Header */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        auth={auth} 
        onLogout={handleLogout} 
      />

      {/* Main Content Area */}
      <main className="flex-1 p-4 xl:p-8 pb-[calc(6.5rem+env(safe-area-inset-bottom))] xl:pb-8">
        {activeTab === 'dashboard' && <Dashboard onNavigate={setActiveTab} />}
        {activeTab === 'users' && <Users auth={auth} />}
        {activeTab === 'indicators' && <Indicators auth={auth} />}
        {activeTab === 'billing' && <Billing />}
        {activeTab === 'controlcopy-signup' && <ControlCopySignupLinks auth={auth} />}
        {activeTab === 'links' && <LinksAndInstructions auth={auth} />}
        {activeTab === 'settings' && <Settings />}
        {activeTab === 'my-copy' && <MyCopy auth={auth} onNavigate={setActiveTab} />}
      </main>
    </div>
  );
}
