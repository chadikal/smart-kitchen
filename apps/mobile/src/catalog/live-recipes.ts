import type { AppLanguage } from '@/src/i18n/languages';
import type { SampleDifficulty } from '@/src/catalog/sample-recipes';

export type LiveRecipeCard = {
  slug: string;
  title: string;
  totalTimeMinutes: number;
  difficulty: SampleDifficulty;
  kicker: string;
  dietaryNames: string[];
  fallback: boolean;
  contentLanguage: 'en' | 'ar';
};

export type LiveRecipeResult =
  | { ok: true; items: LiveRecipeCard[]; total: number }
  | { ok: false };

export async function fetchLiveRecipes(
  baseUrl: string,
  language: AppLanguage,
  query: string,
  signal: AbortSignal,
): Promise<LiveRecipeResult> {
  try {
    const params = new URLSearchParams({
      lang: language,
      page: '1',
      pageSize: '20',
    });
    const trimmed = query.trim();
    if (trimmed.length > 0) params.set('q', trimmed);
    const response = await fetch(`${baseUrl}/recipes?${params.toString()}`, {
      signal,
      headers: { accept: 'application/json' },
    });
    if (!response.ok) return { ok: false };
    return readLiveRecipeList(await response.json());
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    return { ok: false };
  }
}

export function readLiveRecipeList(body: unknown): LiveRecipeResult {
  if (!body || typeof body !== 'object') return { ok: false };
  const record = body as { items?: unknown; total?: unknown };
  if (!Array.isArray(record.items) || typeof record.total !== 'number') return { ok: false };
  const items: LiveRecipeCard[] = [];
  for (const item of record.items) {
    const card = readCard(item);
    if (card) items.push(card);
  }
  return { ok: true, items, total: record.total };
}

function readCard(value: unknown): LiveRecipeCard | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as {
    slug?: unknown;
    title?: unknown;
    totalTimeMinutes?: unknown;
    difficulty?: unknown;
    fallbackUsed?: unknown;
    contentLanguage?: unknown;
    countries?: unknown;
    cuisines?: unknown;
    dietaryTags?: unknown;
  };
  if (typeof item.slug !== 'string' || typeof item.title !== 'string') return null;
  if (typeof item.totalTimeMinutes !== 'number') return null;
  if (!isDifficulty(item.difficulty) || typeof item.fallbackUsed !== 'boolean') return null;
  if (item.contentLanguage !== 'en' && item.contentLanguage !== 'ar') return null;
  const names = [...namesFrom(item.countries), ...namesFrom(item.cuisines)];
  return {
    slug: item.slug,
    title: item.title,
    totalTimeMinutes: item.totalTimeMinutes,
    difficulty: item.difficulty,
    kicker: names.join(' · '),
    dietaryNames: namesFrom(item.dietaryTags),
    fallback: item.fallbackUsed,
    contentLanguage: item.contentLanguage,
  };
}

function namesFrom(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const name = (entry as { name?: unknown }).name;
    return typeof name === 'string' && name.trim() !== '' ? [name] : [];
  });
}

function isDifficulty(value: unknown): value is SampleDifficulty {
  return value === 'EASY' || value === 'MEDIUM' || value === 'HARD';
}
