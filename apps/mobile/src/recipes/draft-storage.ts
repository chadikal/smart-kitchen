import { Platform } from 'react-native';
import { isDemoMode } from '../demo/mode';
import { demoDraftKey, demoDraftSeed } from '../demo/seed';
import { readDrafts, type RecipeDraft } from './drafts';

export function draftStorageKey(owner: string): string {
  if (isDemoMode()) return demoDraftKey;
  return owner === 'guest' ? 'savora.recipes.drafts.guest' : `savora.recipes.drafts.account.${owner}`;
}

async function nativeFile(owner: string) {
  const { File, Paths } = await import('expo-file-system');
  return new File(Paths.document, `${draftStorageKey(owner)}.json`);
}

export async function loadDrafts(owner: string): Promise<RecipeDraft[]> {
  if (Platform.OS === 'web') {
    const key = draftStorageKey(owner);
    const raw = globalThis.localStorage?.getItem(key) ?? null;
    if (raw == null && isDemoMode()) {
      const seed = demoDraftSeed();
      globalThis.localStorage?.setItem(key, JSON.stringify(seed));
      return seed;
    }
    return readDrafts(raw);
  }
  const file = await nativeFile(owner);
  if (!file.exists) {
    if (!isDemoMode()) return [];
    const seed = demoDraftSeed();
    file.create();
    await file.write(JSON.stringify(seed));
    return seed;
  }
  return readDrafts(await file.text());
}

export async function saveDrafts(owner: string, drafts: readonly RecipeDraft[]): Promise<void> {
  const serialized = JSON.stringify(drafts);
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(draftStorageKey(owner), serialized);
    return;
  }
  const file = await nativeFile(owner);
  if (!file.exists) file.create();
  await file.write(serialized);
}
