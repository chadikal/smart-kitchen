import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { KeyValueStore } from '@/src/auth/session-storage';
import { useSession } from '@/src/auth/session-provider';
import { savedListOwner, toggleSavedSlug } from '@/src/recipes/saved';
import { loadSavedSlugs, saveSavedSlugs } from '@/src/recipes/storage';

const savedStore: KeyValueStore = Platform.OS === 'web'
  ? {
      async getItem(key) { return globalThis.localStorage?.getItem(key) ?? null; },
      async setItem(key, value) { globalThis.localStorage?.setItem(key, value); },
      async removeItem(key) { globalThis.localStorage?.removeItem(key); },
    }
  : {
      getItem: (key) => SecureStore.getItemAsync(key),
      setItem: (key, value) => SecureStore.setItemAsync(key, value),
      removeItem: (key) => SecureStore.deleteItemAsync(key),
    };

type SavedRecipesValue = {
  ready: boolean;
  saved: readonly string[];
  toggle: (slug: string) => void;
};

const SavedRecipesContext = createContext<SavedRecipesValue | null>(null);

export function SavedRecipesProvider({ children }: { children: ReactNode }) {
  const session = useSession();
  const owner = savedListOwner(session.status, session.profile?.id ?? null);
  const [saved, setSaved] = useState<string[]>([]);
  const [readyOwner, setReadyOwner] = useState<string | null>(null);

  useEffect(() => {
    if (!owner) return undefined;
    let active = true;
    void loadSavedSlugs(savedStore, owner).then((stored) => {
      if (!active) return;
      setSaved(stored);
      setReadyOwner(owner);
    });
    return () => { active = false; };
  }, [owner]);

  useEffect(() => {
    if (!owner || readyOwner !== owner) return;
    void saveSavedSlugs(savedStore, owner, saved);
  }, [owner, readyOwner, saved]);

  const toggle = useCallback((slug: string) => {
    if (!owner || readyOwner !== owner) return;
    setSaved((current) => toggleSavedSlug(current, slug));
  }, [owner, readyOwner]);

  const value = useMemo<SavedRecipesValue>(() => ({
    ready: owner !== null && readyOwner === owner,
    saved: owner !== null && readyOwner === owner ? saved : [],
    toggle,
  }), [owner, readyOwner, saved, toggle]);

  return <SavedRecipesContext.Provider value={value}>{children}</SavedRecipesContext.Provider>;
}

export function useSavedRecipes(): SavedRecipesValue {
  const value = useContext(SavedRecipesContext);
  if (!value) throw new Error('useSavedRecipes must be used within SavedRecipesProvider');
  return value;
}
