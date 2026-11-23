import type { KeyValueStore } from '../auth/session-storage.ts';
import { demoKitchenKey, demoKitchenSeed } from '../demo/seed.ts';
import { isDemoMode } from '../demo/mode.ts';
import { readKitchenSelection, serializeKitchenSelection } from './catalog.ts';

export const kitchenStorageKey = 'savora.kitchen.ingredients';

function activeKitchenKey(): string {
  return isDemoMode() ? demoKitchenKey : kitchenStorageKey;
}

export async function loadKitchenSelection(store: KeyValueStore): Promise<string[]> {
  const key = activeKitchenKey();
  const raw = await store.getItem(key);
  if (raw == null && isDemoMode()) {
    await store.setItem(key, JSON.stringify(demoKitchenSeed));
    return [...demoKitchenSeed];
  }
  return readKitchenSelection(raw);
}

export async function saveKitchenSelection(store: KeyValueStore, slugs: readonly string[]): Promise<void> {
  await store.setItem(activeKitchenKey(), serializeKitchenSelection(slugs));
}
