import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { readAuthEnv } from './config';
import { createChunkedStorage, type KeyValueStore } from './session-storage';

const nativeStore: KeyValueStore = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

const webStore: KeyValueStore = {
  async getItem(key) {
    return globalThis.localStorage?.getItem(key) ?? null;
  },
  async setItem(key, value) {
    globalThis.localStorage?.setItem(key, value);
  },
  async removeItem(key) {
    globalThis.localStorage?.removeItem(key);
  },
};

export const authStorage = createChunkedStorage(Platform.OS === 'web' ? webStore : nativeStore);

let client: SupabaseClient | null | undefined;

export function supabaseAuth(): SupabaseClient | null {
  if (Platform.OS === 'web' && typeof window === 'undefined') return null;
  if (client !== undefined) return client;
  const env = readAuthEnv();
  if (!env.configured) {
    client = null;
    return null;
  }
  client = createClient(env.url, env.anonKey, {
    auth: {
      storage: authStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  });
  return client;
}
