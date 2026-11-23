import type { RecipeDetail, DetailLoad } from '../catalog/recipe-detail.ts';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const accountIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SavedListOwner = 'guest' | string;

export type SavedRecipeCard = {
  slug: string;
  title: string;
  photo: RecipeDetail['photo'];
  contentLanguage: RecipeDetail['contentLanguage'];
  fallback: boolean;
  totalTimeMinutes: number | null;
  difficulty: RecipeDetail['difficulty'];
  factSources: RecipeDetail['factSources'];
  kicker?: string;
};

export type SavedRecipeResolution =
  | { status: 'ready'; card: SavedRecipeCard }
  | { status: 'missing' }
  | { status: 'error' };

export function isSavedSlug(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 80 && slugPattern.test(value);
}

export function savedListOwner(
  status: 'loading' | 'unconfigured' | 'guest' | 'signed-in',
  accountId: string | null,
): string | null {
  if (status === 'guest' || status === 'unconfigured') return 'guest';
  if (status === 'signed-in' && accountId && accountIdPattern.test(accountId)) return accountId;
  return null;
}

export function readSavedSlugs(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    const slugs: string[] = [];
    for (const item of value) {
      if (isSavedSlug(item) && !slugs.includes(item)) slugs.push(item);
    }
    return slugs;
  } catch {
    return [];
  }
}

export function serializeSavedSlugs(slugs: readonly string[]): string {
  return JSON.stringify(readSavedSlugs(JSON.stringify(slugs)));
}

export function toggleSavedSlug(slugs: readonly string[], slug: string): string[] {
  const current = readSavedSlugs(JSON.stringify(slugs));
  if (!isSavedSlug(slug)) return current;
  if (current.includes(slug)) return current.filter((item) => item !== slug);
  return [slug, ...current];
}

/** Each saved identity is resolved on its own through the recipe detail loader. */
export function savedRecipeFromDetail(result: DetailLoad): SavedRecipeResolution {
  if (result.status === 'missing') return { status: 'missing' };
  if (result.status === 'error') return { status: 'error' };
  const recipe = result.recipe;
  return {
    status: 'ready',
    card: {
      slug: recipe.slug,
      title: recipe.title,
      photo: recipe.photo,
      contentLanguage: recipe.contentLanguage,
      fallback: recipe.fallbackUsed,
      totalTimeMinutes: recipe.totalTimeMinutes,
      difficulty: recipe.difficulty,
      factSources: recipe.factSources,
      kicker: recipe.cuisines[0]?.name ?? recipe.countries[0]?.name ?? '',
    },
  };
}
