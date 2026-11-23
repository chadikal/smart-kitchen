import { apiBaseUrl } from '../config/api.ts';
import { readCatalogOptions, type CatalogOption } from '../catalog/discover.ts';
import { demoCatalogBody } from '../demo/catalog.ts';
import { isDemoMode } from '../demo/mode.ts';

export type PreferenceCatalogKind = 'dietary-tags' | 'cuisines' | 'countries';

export async function fetchPreferenceCatalog(
  kind: PreferenceCatalogKind,
  language: 'en' | 'ar',
  signal?: AbortSignal,
): Promise<CatalogOption[] | null> {
  if (isDemoMode()) return readCatalogOptions(demoCatalogBody(`http://savora.local/${kind}?lang=${language}`));
  try {
    const response = await fetch(`${apiBaseUrl}/${kind}?lang=${language}`, {
      signal,
      headers: { accept: 'application/json' },
    });
    if (!response.ok) return null;
    return readCatalogOptions(await response.json());
  } catch {
    return null;
  }
}

export function toggleSlug(selected: string[], slug: string): string[] {
  return selected.includes(slug) ? selected.filter((item) => item !== slug) : [...selected, slug];
}
