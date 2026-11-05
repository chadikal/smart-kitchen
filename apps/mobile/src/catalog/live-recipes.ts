import { readFactSources, qualifyFact, type FactSources } from './recipe-facts.ts';
import { readRecipePhoto, type RecipePhoto } from './recipe-photo.ts';
import type { AppLanguage } from '@/src/i18n/languages';

export type LiveRecipeDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type LiveRecipeCard = {
  slug: string;
  title: string;
  photo?: RecipePhoto | null;
  totalTimeMinutes: number | null;
  difficulty: LiveRecipeDifficulty | null;
  factSources?: FactSources;
  kicker: string;
  dietaryNames: string[];
  fallback: boolean;
  contentLanguage: 'en' | 'ar';
};

export type LiveRecipeResult =
  | { ok: true; items: LiveRecipeCard[]; total: number; home?: HomeRecipeSections }
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
    photo?: unknown;
    slug?: unknown;
    title?: unknown;
    totalTimeMinutes?: unknown;
    difficulty?: unknown;
    factSources?: unknown;
    fallbackUsed?: unknown;
    contentLanguage?: unknown;
    countries?: unknown;
    cuisines?: unknown;
    dietaryTags?: unknown;
  };
  if (typeof item.slug !== 'string' || typeof item.title !== 'string') return null;
  if (item.totalTimeMinutes !== null && typeof item.totalTimeMinutes !== 'number') return null;
  if ((item.difficulty !== null && !isDifficulty(item.difficulty)) || typeof item.fallbackUsed !== 'boolean') return null;
  if (item.contentLanguage !== 'en' && item.contentLanguage !== 'ar') return null;
  const names = [...namesFrom(item.countries), ...namesFrom(item.cuisines)];
  return {
    photo: readRecipePhoto(item.photo),
    slug: item.slug,
    title: item.title,
    totalTimeMinutes: item.totalTimeMinutes,
    difficulty: item.difficulty,
    factSources: readFactSources(item.factSources),
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

function isDifficulty(value: unknown): value is LiveRecipeDifficulty {
  return value === 'EASY' || value === 'MEDIUM' || value === 'HARD';
}

export function recipeFactsText(item: Pick<LiveRecipeCard, 'totalTimeMinutes' | 'difficulty' | 'factSources'>, t: (key: string, values?: Record<string, unknown>) => string): string {
  const parts = [item.totalTimeMinutes === null ? null : qualifyFact(t('recipe.minutes', { count: item.totalTimeMinutes }), item.factSources?.totalTimeMinutes), item.difficulty === null ? null : t(`home.difficulty.${item.difficulty}`)].filter(Boolean);
  return parts.join(' · ');
}


export type HomeRecipeSections = { featured: LiveRecipeCard | null; picks: LiveRecipeCard[]; quick: LiveRecipeCard[]; more: LiveRecipeCard[] };

export function readHomeRecipes(body: unknown): LiveRecipeResult {
  if (!body || typeof body !== 'object') return { ok: false };
  const raw = body as Record<string, unknown>;
  const featured = raw.featured === null ? null : readCard(raw.featured);
  if (raw.featured !== null && !featured) return { ok: false };
  const home: HomeRecipeSections = { featured, picks: [], quick: [], more: [] };
  for (const key of ['picks', 'quick', 'more'] as const) {
    const values = raw[key];
    if (!Array.isArray(values)) return { ok: false };
    for (const value of values) { const card = readCard(value); if (!card) return { ok: false }; home[key].push(card); }
  }
  const items = [...(featured ? [featured] : []), ...home.picks, ...home.quick, ...home.more];
  if (new Set(items.map((item) => item.slug)).size !== items.length) return { ok: false };
  if (home.quick.some((item) => item.totalTimeMinutes === null || item.totalTimeMinutes > 30 || item.factSources?.totalTimeMinutes === 'ESTIMATE')) return { ok: false };
  return { ok: true, home, items, total: items.length };
}

export async function fetchHomeRecipes(baseUrl: string, language: AppLanguage, signal: AbortSignal): Promise<LiveRecipeResult> {
  try {
    const response = await fetch(`${baseUrl}/recipes/home?lang=${language}`, { signal, headers: { accept: 'application/json' } });
    return response.ok ? readHomeRecipes(await response.json()) : { ok: false };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    return { ok: false };
  }
}
