import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { useRouter } from 'expo-router';
import { apiBaseUrl } from '@/src/config/api';
import { demoAccountProfile, loadDemoProfile, localizeDemoProfile, storeDemoProfile } from '@/src/demo/profile';
import { isDemoMode } from '@/src/demo/mode';
import { useAppLanguage } from '@/src/i18n/language-provider';
import { destinationAfterSignIn } from './callback-url';
import { readAuthEnv } from './config';
import { googleRequiresDevelopmentBuild } from './current-runtime';
import { authRedirectUrl } from './redirect';
import { requestAccountProfile, type AccountProfile, type ProfilePatch } from './profile-client';
import { supabaseAuth } from './supabase';

type SessionStatus = 'loading' | 'unconfigured' | 'guest' | 'signed-in';

type SessionContextValue = {
  status: SessionStatus;
  profile: AccountProfile | null;
  profileError: boolean;
  googleEnabled: boolean;
  googleRequiresDevelopmentBuild: boolean;
  appleEnabled: boolean;
  redirectUrl: string;
  refreshProfile: () => Promise<AccountProfile | null>;
  saveProfile: (patch: ProfilePatch) => Promise<AccountProfile | null>;
  finishSignIn: (recovery?: boolean, suggestedName?: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { language, setLanguage } = useAppLanguage();
  const env = useMemo(() => readAuthEnv(), []);
  const demo = isDemoMode();
  const [status, setStatus] = useState<SessionStatus>(demo ? 'signed-in' : env.configured ? 'loading' : 'unconfigured');
  const [profile, setProfile] = useState<AccountProfile | null>(demo ? loadDemoProfile('en') : null);
  const [profileError, setProfileError] = useState(false);

  const accessToken = useCallback(async () => {
    const supabase = supabaseAuth();
    if (!supabase) return null;
    const session = await supabase.auth.getSession();
    return session.data.session?.access_token ?? null;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (demo) {
      const next = loadDemoProfile(language);
      setProfile(next);
      setProfileError(false);
      setStatus('signed-in');
      return next;
    }
    const token = await accessToken();
    if (!token) {
      setProfile(null);
      setStatus(env.configured ? 'guest' : 'unconfigured');
      return null;
    }
    const result = await requestAccountProfile(apiBaseUrl, token);
    if (result.status === 'unauthorized') {
      await supabaseAuth()?.auth.signOut();
      setProfile(null);
      setStatus('guest');
      return null;
    }
    if (result.status !== 'ok') {
      setProfileError(true);
      setStatus('signed-in');
      return null;
    }
    setProfileError(false);
    setProfile(result.profile);
    setStatus('signed-in');
    if (result.profile.language) setLanguage(result.profile.language);
    return result.profile;
  }, [accessToken, demo, env.configured, language, setLanguage]);

  const finishSignIn = useCallback(async (recovery = false, suggestedName?: string) => {
    const next = await refreshProfile();
    if (!next) {
      router.replace('/profile');
      return;
    }
    const destination = destinationAfterSignIn(next, recovery);
    if (destination.pathname === '/account/welcome' && suggestedName) {
      router.replace({ pathname: destination.pathname, params: { name: suggestedName } });
      return;
    }
    router.replace(destination.pathname);
  }, [refreshProfile, router]);

  const saveProfile = useCallback(async (patch: ProfilePatch) => {
    if (demo) {
      const base = profile ?? demoAccountProfile(language);
      const merged: AccountProfile = {
        ...base,
        firstName: patch.firstName !== undefined ? patch.firstName : base.firstName,
        lastName: patch.lastName !== undefined ? patch.lastName : base.lastName,
        displayName: patch.displayName !== undefined ? patch.displayName : base.displayName,
        language: patch.language ?? base.language,
        welcomeCompleted: patch.welcomeCompleted ?? base.welcomeCompleted,
        dietaryPreferences: patch.dietaryPreferences ?? base.dietaryPreferences,
        cuisineInterests: patch.cuisineInterests ?? base.cuisineInterests,
        countryInterests: patch.countryInterests ?? base.countryInterests,
      };
      const next = patch.language ? localizeDemoProfile(merged, patch.language) : merged;
      storeDemoProfile(next);
      setProfile(next);
      setProfileError(false);
      setStatus('signed-in');
      return next;
    }
    const token = await accessToken();
    if (!token) return null;
    const result = await requestAccountProfile(apiBaseUrl, token, { method: 'PATCH', body: patch });
    if (result.status !== 'ok') {
      setProfileError(true);
      return null;
    }
    setProfile(result.profile);
    setProfileError(false);
    return result.profile;
  }, [accessToken, demo, language, profile]);

  const signOut = useCallback(async () => {
    if (demo) {
      setProfile(null);
      setProfileError(false);
      setStatus('guest');
      router.replace('/profile');
      return;
    }
    await supabaseAuth()?.auth.signOut();
    setProfile(null);
    setProfileError(false);
    setStatus(env.configured ? 'guest' : 'unconfigured');
    router.replace('/profile');
  }, [demo, env.configured, router]);

  useEffect(() => {
    if (demo) return undefined;
    const supabase = supabaseAuth();
    if (!supabase) return undefined;
    let active = true;
    void supabase.auth.getSession().then(() => {
      if (active) void refreshProfile();
    });
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (!active) return;
      if (event === 'SIGNED_OUT') {
        setProfile(null);
        setStatus('guest');
        return;
      }
      if (event === 'PASSWORD_RECOVERY') {
        router.replace('/account/reset-password');
        return;
      }
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
        void refreshProfile();
      }
    });
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active') void supabase.auth.startAutoRefresh();
      else void supabase.auth.stopAutoRefresh();
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
      appState.remove();
    };
  }, [demo, refreshProfile, router]);

  const value = useMemo<SessionContextValue>(() => ({
    status,
    profile,
    profileError,
    googleEnabled: env.google,
    googleRequiresDevelopmentBuild: env.google && googleRequiresDevelopmentBuild(),
    appleEnabled: env.apple,
    redirectUrl: authRedirectUrl(),
    refreshProfile,
    saveProfile,
    finishSignIn,
    signOut,
  }), [env.apple, env.google, finishSignIn, profile, profileError, refreshProfile, saveProfile, signOut, status]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used within SessionProvider');
  return value;
}
