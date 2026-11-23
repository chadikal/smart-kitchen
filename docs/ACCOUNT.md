# Savora accounts

Supabase Auth stores credentials and sessions. The Nest API keeps the recipe database and maps a verified Supabase subject to an internal user id. Accounts are not matched or merged by email.

Guests can browse Home, Discover, and recipe details. Sign-in lives on Profile.

## Environment

Copy the examples and fill in the public values. Do not commit `.env` files, and do not put Google client secrets, Apple private keys, or the Supabase service-role key in the mobile app.

`apps/api/.env`:

```text
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
```

`apps/mobile/.env`:

```text
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_AUTH_GOOGLE=false
EXPO_PUBLIC_AUTH_APPLE=false
```

The anon key is the public client key from the Supabase dashboard. Leave a provider flag `false` until that provider is enabled. The app hides Continue with Google and Continue with Apple when the flag is not `true`.

Restart `npm run dev:api` and `npm run dev:mobile` after changing these files. The API verifies tokens with the project's public signing keys at `https://YOUR_PROJECT.supabase.co/auth/v1/.well-known/jwks.json`. It checks the issuer, the `authenticated` audience, expiry, and the signature. A project that still signs tokens only with the legacy shared JWT secret will be rejected until JWT signing keys are enabled in Supabase.

Apply the identity migration to the app database yourself when you are ready. The migration was checked against `smart_kitchen_migration_test` only:

```powershell
cd apps\api
$previous = $env:DATABASE_URL
$env:DATABASE_URL = $env:MIGRATION_TEST_DATABASE_URL
npx prisma migrate deploy
$env:DATABASE_URL = $previous
```

For the local app database, from `apps/api` with `DATABASE_URL` pointing at local `smart_kitchen`:

```powershell
npx prisma migrate deploy
```

## Supabase dashboard

1. Create a project.
2. Authentication → Providers → Email. Keep email confirmation enabled.
3. Authentication → URL configuration:
   - Site URL: `http://localhost:8081` for web development. A phone browser cannot open this address. If a redirect is missing from the allowlist, Supabase sends the browser here, which is the localhost page seen after Google account selection in Expo Go.
   - Additional redirect URLs, one exact entry for each supported Google environment:
     - Development build (iOS and Android): `smart-kitchen://auth/callback`
     - Web on this computer: `http://localhost:8081/auth/callback`
     - Web opened at another origin: that origin plus `/auth/callback`, for example `http://192.168.1.8:8081/auth/callback`
4. Authentication → JWT signing keys. Use the asymmetric keys so the API can verify signatures from the JWKS URL.

Email and password sign-in does not open a browser. Confirmation and password-recovery emails return to `auth/callback` through `Linking.createURL('auth/callback')`. The app exchanges the one-time code with PKCE. The code verifier stays on the device that started the flow, so open the link on that same device. Tokens are not written to logs. In Expo Go that generated address is `exp://<bundle host>/--/auth/callback`, and a localhost host cannot be opened on a phone.

Google does not use the Expo Go redirect. In Expo Go, `Linking.createURL('auth/callback')` ignores the `smart-kitchen` scheme and builds `exp://<bundle host>/--/auth/callback`. On a phone whose bundle host is localhost, that is `exp://localhost:8081/--/auth/callback`. That value is not a supported callback. When it is absent from the allowlist, Supabase falls back to the Site URL `http://localhost:8081`, and the phone cannot connect.

## Google

1. In Google Cloud, create an OAuth web client.
2. Authorized redirect URI: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
3. In Supabase → Authentication → Providers → Google, paste the client id and client secret. The secret stays in Supabase.
4. Set `EXPO_PUBLIC_AUTH_GOOGLE=true` and restart Metro.

Google uses the system browser and PKCE. On a phone it requires a Savora development build, which returns to `smart-kitchen://auth/callback`. Web returns to the page origin plus `/auth/callback`. Expo Go shows “Google sign-in requires a Savora development build” and does not open the browser.

## Apple

1. In the Apple Developer account, enable Sign in with Apple for the app id `com.savora.app`.
2. Create a Services ID and a Sign in with Apple key.
3. In Supabase → Authentication → Providers → Apple, enter the Services ID, team id, key id, and private key. Add `com.savora.app` as an additional client id so native iOS identity tokens are accepted. The private key stays in Supabase.
4. Return URL for the Services ID: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
5. Set `EXPO_PUBLIC_AUTH_APPLE=true`.

On iPhone, the native Apple sheet needs a development build. Expo Go does not include the Apple entitlement. Android and web use the browser PKCE flow when the provider flag is on.

```powershell
cd apps\mobile
npx expo run:ios
npx expo run:android
```

Those commands need Xcode or Android Studio. `npx eas-cli build --profile development` is the cloud alternative. Email sign-in can still be used from Expo Go. Google on a phone waits for one of those development builds. Google on web uses the Metro page at `http://localhost:8081`.

## What to try on a phone

1. Leave both provider flags false. Profile shows email sign-in only, and browsing still works while signed out.
2. Create an account. Confirm the email on the same phone, then complete or skip the welcome screen. Sign out and sign back in: welcome should not appear again.
3. Use Forgot password, open the link on the same phone, and set a new password.
4. Turn on Google only after the dashboard client is saved. Use it from a development build or from web. Expo Go keeps email sign-in and shows that Google needs a Savora development build.
5. Turn on Apple and use Continue with Apple. On iPhone, install a development build first.

No provider has been signed in with live credentials in this workspace. Treat each of those steps as still needing a real Supabase project before calling it done.
