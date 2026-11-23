import type { KeyValueStore } from '../auth/session-storage.ts';
import { isDemoMode } from '../demo/mode.ts';
import { demoSavedKey, demoSavedSeed } from '../demo/seed.ts';
import { readSavedSlugs, serializeSavedSlugs } from './saved.ts';

export function savedRecipesKey(owner: string): string {
  if (isDemoMode()) return demoSavedKey;
  return owner === 'guest' ? 'savora.recipes.saved.guest' : `savora.recipes.saved.account.${owner}`;
}

export async function loadSavedSlugs(store: KeyValueStore, owner: string): Promise<string[]> {
  const key = savedRecipesKey(owner);
  const raw = await store.getItem(key);
  if (raw == null && isDemoMode()) {
    await store.setItem(key, JSON.stringify(demoSavedSeed));
    return [...demoSavedSeed];
  }
  return readSavedSlugs(raw);
}

export async function saveSavedSlugs(store: KeyValueStore, owner: string, slugs: readonly string[]): Promise<void> {
  await store.setItem(savedRecipesKey(owner), serializeSavedSlugs(slugs));
}
