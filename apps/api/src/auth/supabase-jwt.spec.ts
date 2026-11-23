import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { createLocalJWKSet } from 'jose';
import {
  AccessTokenError,
  AuthConfigurationError,
  supabaseAuthIssuer,
  verifySupabaseAccessToken,
} from './supabase-jwt';

const issuer = 'https://project.example.supabase.co/auth/v1';
const subject = '11111111-1111-4111-8111-111111111111';

async function token(key: CryptoKey, claims: Record<string, unknown>, expiresIn = '5m'): Promise<string> {
  let builder = new SignJWT(claims).setProtectedHeader({ alg: 'ES256' }).setIssuer(issuer).setSubject(subject).setIssuedAt();
  if (expiresIn !== 'none') builder = builder.setExpirationTime(expiresIn);
  return builder.sign(key);
}

describe('Supabase access tokens', () => {
  let privateKey: CryptoKey;
  let keys: ReturnType<typeof createLocalJWKSet>;

  beforeAll(async () => {
    const pair = await generateKeyPair('ES256');
    privateKey = pair.privateKey;
    keys = createLocalJWKSet({ keys: [await exportJWK(pair.publicKey)] });
  });

  it('accepts a signed, unexpired token for the configured issuer and audience', async () => {
    const access = await token(privateKey, { role: 'authenticated', aud: 'authenticated', email: 'person@example.com' });
    await expect(verifySupabaseAccessToken(access, { issuer, audience: 'authenticated', key: keys })).resolves.toEqual({
      subject,
    });
  });

  it('rejects an expired token, the wrong issuer, the wrong audience, and a token signed by another key', async () => {
    const expired = await token(privateKey, { role: 'authenticated', aud: 'authenticated' }, '-1m');
    const wrongAudience = await token(privateKey, { role: 'authenticated', aud: 'anon' });
    const wrongIssuer = await new SignJWT({ role: 'authenticated' })
      .setProtectedHeader({ alg: 'ES256' })
      .setIssuer('https://other.example/auth/v1')
      .setAudience('authenticated')
      .setSubject(subject)
      .setExpirationTime('5m')
      .sign(privateKey);
    const other = await generateKeyPair('ES256');
    const otherKeys = createLocalJWKSet({ keys: [await exportJWK(other.publicKey)] });
    const foreign = await token(privateKey, { role: 'authenticated', aud: 'authenticated' });

    await expect(verifySupabaseAccessToken(expired, { issuer, audience: 'authenticated', key: keys })).rejects.toBeInstanceOf(AccessTokenError);
    await expect(verifySupabaseAccessToken(wrongAudience, { issuer, audience: 'authenticated', key: keys })).rejects.toBeInstanceOf(AccessTokenError);
    await expect(verifySupabaseAccessToken(wrongIssuer, { issuer, audience: 'authenticated', key: keys })).rejects.toBeInstanceOf(AccessTokenError);
    await expect(verifySupabaseAccessToken(foreign, { issuer, audience: 'authenticated', key: otherKeys })).rejects.toBeInstanceOf(AccessTokenError);
  });

  it('rejects an anonymous role and does not return the email claim', async () => {
    const anon = await token(privateKey, { role: 'anon', aud: 'authenticated', email: 'person@example.com' });
    await expect(verifySupabaseAccessToken(anon, { issuer, audience: 'authenticated', key: keys })).rejects.toBeInstanceOf(AccessTokenError);
  });

  it('reads the project issuer from SUPABASE_URL', () => {
    expect(supabaseAuthIssuer('https://project.example.supabase.co')).toBe(issuer);
    expect(supabaseAuthIssuer('https://project.example.supabase.co/auth/v1/')).toBe(issuer);
    expect(() => supabaseAuthIssuer('http://project.example.supabase.co')).toThrow(AuthConfigurationError);
  });
});
