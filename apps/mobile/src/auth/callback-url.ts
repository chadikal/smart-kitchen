export type AuthCallback =
  | { kind: 'code'; code: string; flowId?: string; recovery: boolean }
  | { kind: 'error'; code: string }
  | { kind: 'ignored' };

/** Reads an auth return URL without accepting tokens placed in the query or fragment. */
export function readAuthCallback(value: string): AuthCallback {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { kind: 'ignored' };
  }
  if (url.searchParams.has('access_token') || url.searchParams.has('refresh_token') || url.hash.includes('access_token')) {
    return { kind: 'error', code: 'implicit_flow_rejected' };
  }
  const error = url.searchParams.get('error');
  if (error) return { kind: 'error', code: error };
  const code = url.searchParams.get('code');
  if (!code || code.length > 2048) return { kind: 'ignored' };
  const flowId = url.searchParams.get('sb_flow_id') ?? undefined;
  return { kind: 'code', code, flowId, recovery: url.searchParams.get('type') === 'recovery' };
}

export function requiresSignedInSession(pathname: string): boolean {
  return pathname === '/account/welcome' || pathname === '/account/reset-password';
}

export type SignInDestination = {
  pathname: '/account/reset-password' | '/account/welcome' | '/profile';
  onboarding: 'deferred' | 'required' | 'complete' | 'unavailable';
};

/** A missing profile is a load failure, not a completed welcome. */
export function destinationAfterSignIn(
  profile: { welcomeCompleted: boolean } | null,
  recovery = false,
): SignInDestination {
  if (recovery) return { pathname: '/account/reset-password', onboarding: 'deferred' };
  if (!profile) return { pathname: '/profile', onboarding: 'unavailable' };
  if (!profile.welcomeCompleted) return { pathname: '/account/welcome', onboarding: 'required' };
  return { pathname: '/profile', onboarding: 'complete' };
}

export function guestCanBrowse(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === '/discover' ||
    pathname === '/kitchen' ||
    pathname === '/recipes' ||
    pathname === '/profile' ||
    pathname.startsWith('/recipe/')
  );
}
