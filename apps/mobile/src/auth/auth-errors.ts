export type AuthErrorKind =
  | 'invalidCredentials'
  | 'emailNotConfirmed'
  | 'passwordShort'
  | 'passwordMismatch'
  | 'network'
  | 'rateLimit'
  | 'googleNeedsDevelopmentBuild'
  | 'generic';

type AuthErrorLike = { message?: string; code?: string; status?: number } | null | undefined;

export function classifyAuthError(error: AuthErrorLike): AuthErrorKind {
  const code = error?.code ?? '';
  const message = (error?.message ?? '').toLowerCase();
  if (code === 'invalid_credentials' || message.includes('invalid login')) return 'invalidCredentials';
  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) return 'emailNotConfirmed';
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit' || error?.status === 429) return 'rateLimit';
  if (code === 'google_requires_development_build' || message.includes('google_requires_development_build')) return 'googleNeedsDevelopmentBuild';
  if (message.includes('network') || message.includes('failed to fetch') || message.includes('network request failed')) return 'network';
  return 'generic';
}

export function samePassword(password: string, confirmation: string): boolean {
  return password.length > 0 && password === confirmation;
}

/** A blank form stays quiet. A typed confirmation or a submit attempt reveals a mismatch, and a match clears it. */
export function passwordMismatchVisible(password: string, confirmation: string, submitted: boolean): boolean {
  if (samePassword(password, confirmation)) return false;
  return submitted || confirmation.length > 0;
}

export function passwordIsLongEnough(password: string): boolean {
  return password.length >= 8 && password.length <= 72;
}
