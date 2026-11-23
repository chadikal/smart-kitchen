import { jwtVerify, type JWTVerifyGetKey } from 'jose';

export const supabaseAudience = 'authenticated';

export class AuthConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthConfigurationError';
  }
}

export class AccessTokenError extends Error {
  constructor() {
    super('Access token was rejected.');
    this.name = 'AccessTokenError';
  }
}

export function supabaseAuthIssuer(projectUrl: string): string {
  let url: URL;
  try {
    url = new URL(projectUrl);
  } catch {
    throw new AuthConfigurationError('SUPABASE_URL is not a valid URL.');
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new AuthConfigurationError('SUPABASE_URL must be an https project URL without credentials.');
  }
  const path = url.pathname.replace(/\/+$/, '');
  if (path !== '' && path !== '/auth/v1') {
    throw new AuthConfigurationError('SUPABASE_URL must be the project origin.');
  }
  return `${url.origin}/auth/v1`;
}

const subjectPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function verifySupabaseAccessToken(
  token: string,
  options: {
    issuer: string;
    audience: string;
    key: CryptoKey | Uint8Array | JWTVerifyGetKey;
  },
): Promise<{ subject: string }> {
  try {
    const verified = await jwtVerify(token, options.key, {
      issuer: options.issuer,
      audience: options.audience,
      algorithms: ['RS256', 'ES256', 'EdDSA'],
    });
    const subject = verified.payload.sub;
    const role = verified.payload['role'];
    if (role !== 'authenticated' || typeof subject !== 'string' || !subjectPattern.test(subject)) {
      throw new AccessTokenError();
    }
    return { subject: subject.toLowerCase() };
  } catch (error) {
    if (error instanceof AccessTokenError) throw error;
    throw new AccessTokenError();
  }
}
