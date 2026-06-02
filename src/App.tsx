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
import { BRANDING } from '@/branding';
import Auth from './components/Auth';
import { UserAuth } from './types';
import {
  clearLegacyBrowserStorage,
  consumeAuthNotice,
  getCurrentAuthProfile,
  subscribeToAuthChanges,
  signOutCurrentUser,
} from './lib/auth';

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
    const match = window.location.pathname.match(/^\/c\/([^/]+)\/?$/i);
    return match ? match[1] : null;
  })();

  useEffect(() => {
    let isMounted = true;

    document.title = BRANDING.documentTitle;
    clearLegacyBrowserStorage();

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
        if (isMounted) {
          setAuthNotice(consumeAuthNotice());
          setIsLoading(false);
        }
      }
    };

    bootstrap();

    const { data: authListener } = subscribeToAuthChanges((nextAuth) => {
      if (!isMounted) return;
      setAuth(nextAuth);
      setIsAuthenticated(!!nextAuth?.email);
      setAuthNotice(consumeAuthNotice());
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

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
            window.history.replaceState(null, '', '/');
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
        {activeTab === 'indicators' && <Indicators />}
        {activeTab === 'billing' && <Billing />}
        {activeTab === 'links' && <LinksAndInstructions auth={auth} />}
        {activeTab === 'settings' && <Settings />}
        {activeTab === 'my-copy' && <MyCopy auth={auth} onNavigate={setActiveTab} />}
      </main>
    </div>
  );
}
