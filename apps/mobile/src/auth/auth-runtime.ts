export type AuthRuntime = 'expo-go' | 'native' | 'web';

export const nativeAuthCallback = 'smart-kitchen://auth/callback';

export function authRuntimeFrom(executionEnvironment: string | null | undefined, os: string): AuthRuntime {
  if (os === 'web') return 'web';
  if (executionEnvironment === 'storeClient') return 'expo-go';
  return 'native';
}

export function googleSignInSupported(runtime: AuthRuntime): boolean {
  return runtime !== 'expo-go';
}

/** Portfolio screenshots show both providers. Elsewhere a provider appears only when it is configured and this runtime can complete it. */
export function visibleAccountProviders(input: {
  demo: boolean;
  runtime: AuthRuntime;
  googleConfigured: boolean;
  appleConfigured: boolean;
}): { google: boolean; apple: boolean } {
  if (input.demo) return { google: true, apple: true };
  const supported = googleSignInSupported(input.runtime);
  return {
    google: supported && input.googleConfigured,
    apple: supported && input.appleConfigured,
  };
}

export function googleCallbackFor(runtime: AuthRuntime, webOrigin = 'http://localhost:8081'): string | null {
  if (!googleSignInSupported(runtime)) return null;
  if (runtime === 'web') return `${webOrigin.replace(/\/$/, '')}/auth/callback`;
  return nativeAuthCallback;
}

export function unsupportedExpoGoRedirect(bundleAuthority: string, https = false): string {
  const scheme = https ? 'exps' : 'exp';
  return `${scheme}://${bundleAuthority.replace(/\/$/, '')}/--/auth/callback`;
}
