import { Platform } from 'react-native';
import { googleCallbackFor } from './auth-runtime';
import { readAuthCallback } from './callback-url';
import { currentAuthRuntime } from './current-runtime';
import { authRedirectUrl } from './redirect';
import { supabaseAuth } from './supabase';

export { authRedirectUrl };

export type ProviderResult = { status: 'success' | 'cancelled' | 'error'; message?: string; suggestedName?: string };

export async function signInWithBrowserProvider(provider: 'google' | 'apple'): Promise<ProviderResult> {
  const redirectTo = provider === 'google' ? googleRedirectTo() : authRedirectUrl();
  if (!redirectTo) return { status: 'error', message: 'google_requires_development_build' };
  const supabase = supabaseAuth();
  if (!supabase) return { status: 'error', message: 'unconfigured' };
  const WebBrowser = await import('expo-web-browser');
  WebBrowser.maybeCompleteAuthSession();
  const started = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (started.error || !started.data.url) return { status: 'error', message: started.error?.message };
  const result = await WebBrowser.openAuthSessionAsync(started.data.url, redirectTo);
  if (result.type === 'cancel' || result.type === 'dismiss') return { status: 'cancelled' };
  if (result.type !== 'success') return { status: 'error' };
  return exchangeAuthCallback(result.url);
}

function googleRedirectTo(): string | null {
  const runtime = currentAuthRuntime();
  if (runtime === 'web') {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081';
    return googleCallbackFor(runtime, origin);
  }
  return googleCallbackFor(runtime);
}

export async function exchangeAuthCallback(url: string): Promise<ProviderResult> {
  const supabase = supabaseAuth();
  if (!supabase) return { status: 'error', message: 'unconfigured' };
  const callback = readAuthCallback(url);
  if (callback.kind === 'error') return { status: 'error', message: callback.code };
  if (callback.kind !== 'code') return { status: 'error' };
  const exchanged = await supabase.auth.exchangeCodeForSession(
    callback.code,
    callback.flowId ? { flowId: callback.flowId } : undefined,
  );
  if (exchanged.error) return { status: 'error', message: exchanged.error.message };
  return { status: 'success' };
}

export async function appleNativeAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    const AppleAuthentication = await import('expo-apple-authentication');
    return AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function signInWithApple(): Promise<ProviderResult> {
  if (await appleNativeAvailable()) return signInWithAppleNative();
  return signInWithBrowserProvider('apple');
}

async function signInWithAppleNative(): Promise<ProviderResult> {
  const supabase = supabaseAuth();
  if (!supabase) return { status: 'error', message: 'unconfigured' };
  try {
    const AppleAuthentication = await import('expo-apple-authentication');
    const Crypto = await import('expo-crypto');
    const rawNonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
    if (!credential.identityToken) return { status: 'error' };
    const signedIn = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      nonce: rawNonce,
    });
    if (signedIn.error) return { status: 'error', message: signedIn.error.message };
    const suggestedName = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(' ');
    return { status: 'success', suggestedName: suggestedName || undefined };
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
    if (code === 'ERR_REQUEST_CANCELED') return { status: 'cancelled' };
    return { status: 'error' };
  }
}
