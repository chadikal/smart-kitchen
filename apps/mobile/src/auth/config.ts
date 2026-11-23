function enabled(value: string | undefined): boolean {
  return value === 'true' || value === '1';
}

export type AuthEnv = {
  configured: boolean;
  url: string;
  anonKey: string;
  google: boolean;
  apple: boolean;
};

export function readAuthEnv(env: Record<string, string | undefined> = process.env): AuthEnv {
  const url = env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';
  const configured = url.startsWith('https://') && anonKey.length >= 20;
  return {
    configured,
    url,
    anonKey,
    google: configured && enabled(env.EXPO_PUBLIC_AUTH_GOOGLE),
    apple: configured && enabled(env.EXPO_PUBLIC_AUTH_APPLE),
  };
}
