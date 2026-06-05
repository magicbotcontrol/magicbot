import { useEffect, useState } from 'react';
import { supabase, supabaseEnabled } from '../lib/supabase/client';
import { AUTH_FEEDBACK_STATUS, createAuthFeedback, resolveAuthErrorFeedback } from '../utils/authFeedback';

export function useSessionState(showToast, t) {
  const [session, setSession] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(supabaseEnabled);
  const [authFeedback, setAuthFeedback] = useState(createAuthFeedback());
  const [profile, setProfile] = useState(null);

  const clearAuthFeedback = () => {
    setAuthFeedback(createAuthFeedback());
  };

  const getAppBaseUrl = () => {
    const configuredUrl = import.meta.env.VITE_APP_URL?.trim();
    const fallbackUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const baseUrl = configuredUrl || fallbackUrl;

    return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  };

  const getRedirectUrl = (path) => `${getAppBaseUrl()}${path}`;

  useEffect(() => {
    let mounted = true;

    if (!supabaseEnabled || !supabase || !session?.user?.id) {
      setProfile(null);
      return undefined;
    }

    supabase
      .from('profiles')
      .select('id, email, role, referral_code, referred_by_profile_id')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!mounted) return;
        setProfile(data || null);
      })
      .catch(() => {
        if (!mounted) return;
        setProfile(null);
      });

    return () => {
      mounted = false;
    };
  }, [session?.user?.id]);

  useEffect(() => {
    if (!supabaseEnabled || !supabase) {
      setIsAuthLoading(false);
      return undefined;
    }

    let mounted = true;

    supabase.auth.getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession(data.session || null);
        setIsAuthLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setSession(null);
        setIsAuthLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null);
      setIsAuthLoading(false);

      if (!nextSession?.user) {
        setProfile(null);
        setAuthFeedback(createAuthFeedback());
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleLogOut = async () => {
    if (!supabaseEnabled || !supabase) {
      return;
    }

    await supabase.auth.signOut();
    clearAuthFeedback();
    showToast(t.sessionEnded);
  };

  const handleLogIn = async ({ email, password, mode, referralCode }) => {
    if (!supabaseEnabled || !supabase) {
      showToast(t.supabaseConnectionError);
      setAuthFeedback(createAuthFeedback(AUTH_FEEDBACK_STATUS.error, t.supabaseConnectionError));
      return { ok: false };
    }

    if (mode === 'signup') {
      setAuthFeedback(createAuthFeedback(AUTH_FEEDBACK_STATUS.submitting, t.authSigningUp));
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getRedirectUrl('/confirm-email.html'),
          data: {
            referral_code: referralCode || null
          }
        }
      });

      if (error) {
        const nextFeedback = resolveAuthErrorFeedback(error, t);
        setAuthFeedback(nextFeedback);
        showToast(nextFeedback.message);
        return { ok: false, error };
      }

      if (data.session) {
        setAuthFeedback(createAuthFeedback(AUTH_FEEDBACK_STATUS.success, t.welcomeBack));
        showToast(t.welcomeBack);
      } else {
        setAuthFeedback(createAuthFeedback(AUTH_FEEDBACK_STATUS.success, t.accountCreatedCheckEmail));
        showToast(t.accountCreatedCheckEmail);
      }

      return { ok: true };
    }

    setAuthFeedback(createAuthFeedback(AUTH_FEEDBACK_STATUS.submitting, t.authSigningIn));
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      const nextFeedback = resolveAuthErrorFeedback(error, t);
      setAuthFeedback(nextFeedback);
      showToast(nextFeedback.message);
      return { ok: false, error };
    }

    setAuthFeedback(createAuthFeedback(AUTH_FEEDBACK_STATUS.success, t.welcomeBack));
    showToast(t.welcomeBack);
    return { ok: true };
  };

  const handleResetPassword = async (email) => {
    if (!supabaseEnabled || !supabase) {
      showToast(t.supabaseConnectionError);
      setAuthFeedback(createAuthFeedback(AUTH_FEEDBACK_STATUS.error, t.supabaseConnectionError));
      return { ok: false };
    }

    setAuthFeedback(createAuthFeedback(AUTH_FEEDBACK_STATUS.submitting, t.sendingResetLink));
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getRedirectUrl('/password-reset.html')
    });

    if (error) {
      const nextFeedback = resolveAuthErrorFeedback(error, t);
      setAuthFeedback(nextFeedback);
      showToast(nextFeedback.message);
      return { ok: false, error };
    }

    setAuthFeedback(createAuthFeedback(AUTH_FEEDBACK_STATUS.success, t.resetLinkSent));
    showToast(t.resetLinkSent);
    return { ok: true };
  };

  const handleUpdatePassword = async (newPassword) => {
    if (!supabaseEnabled || !supabase) {
      showToast(t.supabaseConnectionError);
      setAuthFeedback(createAuthFeedback(AUTH_FEEDBACK_STATUS.error, t.supabaseConnectionError));
      return { ok: false };
    }

    setAuthFeedback(createAuthFeedback(AUTH_FEEDBACK_STATUS.submitting, t.updatingPassword));
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      const nextFeedback = resolveAuthErrorFeedback(error, t);
      setAuthFeedback(nextFeedback);
      showToast(nextFeedback.message);
      return { ok: false, error };
    }

    setAuthFeedback(createAuthFeedback(AUTH_FEEDBACK_STATUS.success, t.passwordUpdated));
    showToast(t.passwordUpdated);
    return { ok: true };
  };

  return {
    session,
    user: session?.user || null,
    profile,
    role: profile?.role || 'user',
    isAdmin: profile?.role === 'admin',
    referralCode: profile?.referral_code || '',
    referredByProfileId: profile?.referred_by_profile_id || null,
    isLoggedIn: Boolean(session?.user),
    isAuthLoading,
    isAuthSubmitting: authFeedback.status === AUTH_FEEDBACK_STATUS.submitting,
    authFeedback,
    clearAuthFeedback,
    handleLogOut,
    handleLogIn,
    handleResetPassword,
    handleUpdatePassword
  };
}
