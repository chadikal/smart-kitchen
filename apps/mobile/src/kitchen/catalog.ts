import { demoRecipes } from '../demo/catalog.ts';

export type KitchenLanguage = 'en' | 'ar';

export type KitchenIngredient = {
  slug: string;
  names: Record<KitchenLanguage, string>;
};

export type KitchenLine = {
  ingredientSlug: string;
  optional: boolean;
};

export type KitchenRecipe = {
  slug: string;
  originalLanguage: KitchenLanguage;
  titles: Partial<Record<KitchenLanguage, string>>;
  lines: readonly KitchenLine[];
};

export type KitchenMatch = {
  slug: string;
  requiredCount: number;
  matchedRequired: number;
  missingRequired: string[];
  matchedOptional: string[];
};

/** Ingredient ids shared with the portfolio catalog. This is not a live API response. */
export const kitchenIngredients: readonly KitchenIngredient[] = (() => {
  const seen = new Map<string, KitchenIngredient>();
  for (const recipe of demoRecipes) {
    for (const line of recipe.ingredients) {
      if (!line.name.en || !line.name.ar || seen.has(line.slug)) continue;
      seen.set(line.slug, { slug: line.slug, names: { en: line.name.en, ar: line.name.ar } });
    }
  }
  return [...seen.values()];
})();

/** Every portfolio recipe, so a selected ingredient can match the dish that uses it. */
export const kitchenRecipes: readonly KitchenRecipe[] = demoRecipes.map((recipe) => ({
  slug: recipe.slug,
  originalLanguage: recipe.original,
  titles: recipe.title,
  lines: recipe.ingredients.map((line) => ({ ingredientSlug: line.slug, optional: line.optional === true })),
}));

const ingredientBySlug = new Map(kitchenIngredients.map((item) => [item.slug, item]));

export function kitchenIngredientName(slug: string, language: KitchenLanguage): string | null {
  return ingredientBySlug.get(slug)?.names[language] ?? null;
}

export function filterKitchenIngredients(query: string, language: KitchenLanguage): KitchenIngredient[] {
  const needle = query.trim().toLocaleLowerCase(language);
  return kitchenIngredients
    .filter((item) => needle.length === 0 || item.names[language].toLocaleLowerCase(language).includes(needle))
    .slice()
    .sort((left, right) => left.names[language].localeCompare(right.names[language], language));
}

export function toggleKitchenIngredient(selected: readonly string[], slug: string): string[] {
  if (!ingredientBySlug.has(slug)) return [...selected];
  return selected.includes(slug) ? selected.filter((item) => item !== slug) : [...selected, slug];
}

export function kitchenRecipeCopy(recipe: KitchenRecipe, language: KitchenLanguage): {
  title: string;
  contentLanguage: KitchenLanguage;
  fallback: boolean;
} {
  const translated = recipe.titles[language];
  if (translated) return { title: translated, contentLanguage: language, fallback: false };
  const title = recipe.titles[recipe.originalLanguage] ?? recipe.slug;
  return { title, contentLanguage: recipe.originalLanguage, fallback: true };
}

/** Identity match only. An empty kitchen returns no recipes, which is not a failed search. */
export function matchKitchen(selected: readonly string[], recipes: readonly KitchenRecipe[] = kitchenRecipes): KitchenMatch[] {
  const chosen = new Set(selected);
  const matches: KitchenMatch[] = [];
  for (const recipe of recipes) {
    const requiredLines = recipe.lines.filter((line) => !line.optional);
    const matchedRequired = requiredLines.filter((line) => chosen.has(line.ingredientSlug));
    const matchedOptional = recipe.lines.filter((line) => line.optional && chosen.has(line.ingredientSlug));
    if (matchedRequired.length === 0 && matchedOptional.length === 0) continue;
    matches.push({
      slug: recipe.slug,
      requiredCount: requiredLines.length,
      matchedRequired: matchedRequired.length,
      missingRequired: requiredLines.filter((line) => !chosen.has(line.ingredientSlug)).map((line) => line.ingredientSlug),
      matchedOptional: matchedOptional.map((line) => line.ingredientSlug),
    });
  }
  matches.sort((left, right) => {
    const proportion = right.matchedRequired * left.requiredCount - left.matchedRequired * right.requiredCount;
    if (proportion !== 0) return proportion;
    if (right.matchedRequired !== left.matchedRequired) return right.matchedRequired - left.matchedRequired;
    return left.slug.localeCompare(right.slug);
  });
  return matches;
}

export function previewMissing(slugs: readonly string[], limit = 2): { shown: string[]; extra: number } {
  return {
    shown: slugs.slice(0, limit),
    extra: Math.max(0, slugs.length - limit),
  };
}

export function readKitchenSelection(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    const slugs: string[] = [];
    for (const item of value) {
      if (typeof item === 'string' && ingredientBySlug.has(item) && !slugs.includes(item)) slugs.push(item);
    }
    return slugs;
  } catch {
    return [];
  }
}

export function serializeKitchenSelection(slugs: readonly string[]): string {
  return JSON.stringify(readKitchenSelection(JSON.stringify(slugs)));
}
