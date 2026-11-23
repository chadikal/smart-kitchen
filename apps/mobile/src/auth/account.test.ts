import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { authRuntimeFrom, googleCallbackFor, googleSignInSupported, unsupportedExpoGoRedirect, visibleAccountProviders } from './auth-runtime.ts';
import { classifyAuthError, passwordIsLongEnough, passwordMismatchVisible, samePassword } from './auth-errors.ts';
import { destinationAfterSignIn, guestCanBrowse, readAuthCallback, requiresSignedInSession } from './callback-url.ts';
import { readAuthEnv } from './config.ts';
import { readAccountProfile } from './profile-client.ts';
import { createChunkedStorage, splitUtf8 } from './session-storage.ts';

test('guests can browse home, discover, and recipe details without a session', () => {
  assert.equal(guestCanBrowse('/'), true);
  assert.equal(guestCanBrowse('/discover'), true);
  assert.equal(guestCanBrowse('/recipe/red-lentil-lemon-soup'), true);
  assert.equal(requiresSignedInSession('/'), false);
  assert.equal(requiresSignedInSession('/discover'), false);
  assert.equal(requiresSignedInSession('/recipe/red-lentil-lemon-soup'), false);
});

test('welcome is shown once, and a completed welcome returns to profile', () => {
  assert.deepEqual(destinationAfterSignIn({ welcomeCompleted: false }), {
    pathname: '/account/welcome',
    onboarding: 'required',
  });
  assert.deepEqual(destinationAfterSignIn({ welcomeCompleted: true }), {
    pathname: '/profile',
    onboarding: 'complete',
  });
  assert.deepEqual(destinationAfterSignIn({ welcomeCompleted: false }, true), {
    pathname: '/account/reset-password',
    onboarding: 'deferred',
  });
  const failed = destinationAfterSignIn(null);
  assert.equal(failed.pathname, '/profile');
  assert.equal(failed.onboarding, 'unavailable');
  assert.notEqual(failed.onboarding, destinationAfterSignIn({ welcomeCompleted: true }).onboarding);
});

test('auth return urls reject tokens and keep the authorization code', () => {
  assert.deepEqual(readAuthCallback('smart-kitchen://auth/callback?code=abc&type=recovery&sb_flow_id=flow-1'), {
    kind: 'code',
    code: 'abc',
    flowId: 'flow-1',
    recovery: true,
  });
  assert.equal(readAuthCallback('smart-kitchen://auth/callback?error=access_denied').kind, 'error');
  assert.equal(readAuthCallback('smart-kitchen://auth/callback#access_token=secret').kind, 'error');
  assert.equal(readAuthCallback('smart-kitchen://auth/callback?access_token=secret').kind, 'error');
});

test('provider flags stay off until supabase and the provider flag are configured', () => {
  const missing = readAuthEnv({});
  assert.equal(missing.configured, false);
  assert.equal(missing.google, false);
  assert.equal(missing.apple, false);
  const ready = readAuthEnv({
    EXPO_PUBLIC_SUPABASE_URL: 'https://project.example.supabase.co',
    EXPO_PUBLIC_SUPABASE_ANON_KEY: 'public-anon-key-value-123456',
    EXPO_PUBLIC_AUTH_GOOGLE: 'true',
  });
  assert.equal(ready.google, true);
  assert.equal(ready.apple, false);
});

test('session storage round-trips a value larger than one secure-store entry', async () => {
  const saved = new Map<string, string>();
  const storage = createChunkedStorage({
    async getItem(key) { return saved.get(key) ?? null; },
    async setItem(key, value) { saved.set(key, value); },
    async removeItem(key) { saved.delete(key); },
  });
  const value = 'session-secret '.repeat(400);
  assert.ok(splitUtf8(value).length > 1);
  await storage.setItem('sb-session', value);
  assert.equal(await storage.getItem('sb-session'), value);
  await storage.removeItem('sb-session');
  assert.equal(await storage.getItem('sb-session'), null);
});

test('English and Arabic account copy have the same entries', () => {
  const english = JSON.parse(readFileSync(new URL('../i18n/locales/en.json', import.meta.url), 'utf8')) as {
    account: { errors: { googleNeedsDevelopmentBuild: string } };
    profile: unknown;
  };
  const arabic = JSON.parse(readFileSync(new URL('../i18n/locales/ar.json', import.meta.url), 'utf8')) as { account: unknown; profile: unknown };
  assert.deepEqual(keys(arabic.account), keys(english.account));
  assert.deepEqual(keys(arabic.profile), keys(english.profile));
  assert.equal(english.account.errors.googleNeedsDevelopmentBuild, 'Google sign-in requires a Savora development build');
});

test('a password mismatch waits for a confirmation or a submit, then clears when the values match', () => {
  assert.equal(passwordMismatchVisible('', '', false), false);
  assert.equal(passwordMismatchVisible('secret-pass', '', false), false);
  assert.equal(passwordMismatchVisible('secret-pass', 'other-pass', false), true);
  assert.equal(passwordMismatchVisible('secret-pass', '', true), true);
  assert.equal(passwordMismatchVisible('secret-pass', 'secret-pass', true), false);
});

test('portfolio demo shows both providers, and other builds show only a configured supported provider', () => {
  assert.deepEqual(visibleAccountProviders({ demo: true, runtime: 'web', googleConfigured: false, appleConfigured: false }), { google: true, apple: true });
  assert.deepEqual(visibleAccountProviders({ demo: false, runtime: 'expo-go', googleConfigured: true, appleConfigured: true }), { google: false, apple: false });
  assert.deepEqual(visibleAccountProviders({ demo: false, runtime: 'web', googleConfigured: true, appleConfigured: false }), { google: true, apple: false });
});

test('google sign-in is blocked in expo go and uses a stable callback elsewhere', () => {
  assert.equal(authRuntimeFrom('storeClient', 'ios'), 'expo-go');
  assert.equal(googleSignInSupported('expo-go'), false);
  assert.equal(googleCallbackFor('expo-go'), null);
  assert.equal(unsupportedExpoGoRedirect('localhost:8081'), 'exp://localhost:8081/--/auth/callback');
  assert.equal(googleSignInSupported('native'), true);
  assert.equal(googleCallbackFor('native'), 'smart-kitchen://auth/callback');
  assert.equal(googleCallbackFor('web', 'http://localhost:8081'), 'http://localhost:8081/auth/callback');
  assert.equal(googleCallbackFor('web', 'http://192.168.1.8:8081/'), 'http://192.168.1.8:8081/auth/callback');
  assert.equal(authRuntimeFrom('bare', 'web'), 'web');
  assert.equal(classifyAuthError({ code: 'google_requires_development_build' }), 'googleNeedsDevelopmentBuild');
});

function keys(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => keys(child, prefix ? `${prefix}.${key}` : key));
}

test('profile responses and auth errors stay explicit', () => {
  assert.deepEqual(readAccountProfile({
    id: 'user-1',
    firstName: null,
    lastName: null,
    displayName: null,
    language: 'ar',
    welcomeCompleted: false,
    dietaryPreferences: [],
    cuisineInterests: [],
    countryInterests: [],
  }), {
    id: 'user-1',
    firstName: null,
    lastName: null,
    displayName: null,
    language: 'ar',
    welcomeCompleted: false,
    dietaryPreferences: [],
    cuisineInterests: [],
    countryInterests: [],
  });
  assert.deepEqual(readAccountProfile({
    id: 'user-1',
    displayName: 'Nour',
    language: 'en',
    welcomeCompleted: true,
  }), {
    id: 'user-1',
    firstName: null,
    lastName: null,
    displayName: 'Nour',
    language: 'en',
    welcomeCompleted: true,
    dietaryPreferences: [],
    cuisineInterests: [],
    countryInterests: [],
  });
  assert.equal(readAccountProfile({ id: 'user-1', email: 'a@b.c' }), null);
  assert.equal(classifyAuthError({ code: 'invalid_credentials' }), 'invalidCredentials');
  assert.equal(classifyAuthError({ code: 'email_not_confirmed' }), 'emailNotConfirmed');
  assert.equal(passwordIsLongEnough('short'), false);
  assert.equal(samePassword('longpassword', 'longpassword'), true);
});
