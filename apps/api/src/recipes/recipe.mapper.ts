import { Prisma } from '../generated/prisma/client';
import {
  DatabaseLanguage,
  PublicLanguage,
  selectCatalogLabel,
  selectRecipeDocument,
  toDatabaseLanguage,
  toPublicLanguage,
} from './recipe-language';

export const publicRecipeInclude = {
  importedFrom: true,
  metadataReview: true,
  translations: true,
  steps: {
    orderBy: { position: 'asc' as const },
    include: { translations: true },
  },
  ingredients: {
    orderBy: { position: 'asc' as const },
    include: {
      ingredient: { include: { translations: true } },
      notes: true,
    },
  },
  countries: { include: { country: { include: { translations: true } } } },
  cuisines: { include: { cuisine: { include: { translations: true } } } },
  dietaryTags: { include: { dietaryTag: { include: { translations: true } } } },
} satisfies Prisma.RecipeInclude;

export type PublicRecipeRecord = Prisma.RecipeGetPayload<{
  include: typeof publicRecipeInclude;
}>;

export interface CatalogLabel {
  slug: string;
  name: string;
  language: PublicLanguage;
}

export interface CountryLabel extends CatalogLabel {
  code: string | null;
}

export interface RecipeSummary {
  slug: string;
  title: string;
  description: string;
  requestedLanguage: PublicLanguage;
  contentLanguage: PublicLanguage;
  fallbackUsed: boolean;
  originalLanguage: PublicLanguage;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  totalTimeMinutes: number | null;
  additionalTimeMinutes: number | null;
  factSources: Record<string, string>;
  timingNote: string | null;
  servings: number | null;
  photo: { url: string; attribution: string; sourceUrl: string } | null;
  source: { name: string; url: string; originalUrl: string | null; developmentOnly: boolean } | null;
  countries: CountryLabel[];
  cuisines: CatalogLabel[];
  dietaryTags: CatalogLabel[];
}

export interface IngredientLine {
  position: number;
  ingredientSlug: string;
  name: string;
  language: PublicLanguage;
  sourceMeasure: string | null;
  quantity: string | null;
  unit:
    | 'MILLIGRAM'
    | 'GRAM'
    | 'KILOGRAM'
    | 'MILLILITER'
    | 'LITER'
    | 'TEASPOON'
    | 'TABLESPOON'
    | 'CUP'
    | 'PIECE'
    | null;
  qualitativeAmount: 'TO_TASTE' | null;
  optional: boolean;
  note: string | null;
}

export interface RecipeStepView {
  position: number;
  instruction: string;
}

export interface RecipeDetail extends RecipeSummary {
  ingredients: IngredientLine[];
  steps: RecipeStepView[];
}

export class RecipeContentError extends Error {
  constructor() {
    super('Recipe content is invalid.');
    this.name = 'RecipeContentError';
  }
}

export function formatQuantity(
  quantity: { toFixed(digits: number): string } | null,
): string | null {
  if (quantity === null) return null;
  return quantity.toFixed(3);
}

export function mapPublicRecipe(
  recipe: PublicRecipeRecord,
  requested: PublicLanguage,
  detail: false,
): RecipeSummary | null;
export function mapPublicRecipe(
  recipe: PublicRecipeRecord,
  requested: PublicLanguage,
  detail: true,
): RecipeDetail | null;
export function mapPublicRecipe(
  recipe: PublicRecipeRecord,
  requested: PublicLanguage,
  detail: boolean,
): RecipeSummary | RecipeDetail | null {
  const requestedLanguage = toDatabaseLanguage(requested);
  const documents = recipe.translations.map((translation) => ({
    translation,
    language: translation.language,
    title: translation.title,
    instructions: recipe.steps.map(
      (step) =>
        step.translations.find((written) => written.recipeTranslationId === translation.id)
          ?.instruction,
    ),
  }));
  const selected = selectRecipeDocument(
    recipe.originalLanguage,
    documents,
    requestedLanguage,
  );
  if (!selected) return null;

  const summary: RecipeSummary = {
    slug: recipe.slug,
    title: selected.translation.title,
    description: selected.translation.translation.description,
    requestedLanguage: requested,
    contentLanguage: toPublicLanguage(selected.translation.language),
    fallbackUsed: selected.fallbackUsed,
    originalLanguage: toPublicLanguage(recipe.originalLanguage),
    difficulty: recipe.difficulty,
    prepTimeMinutes: recipe.prepTimeMinutes,
    cookTimeMinutes: recipe.cookTimeMinutes,
    totalTimeMinutes: recipe.prepTimeMinutes === null || recipe.cookTimeMinutes === null || recipe.additionalTimeMinutes === null ? null : recipe.prepTimeMinutes + recipe.cookTimeMinutes + recipe.additionalTimeMinutes,
    photo: recipe.importedFrom?.imageUrl ? { url: recipe.importedFrom.imageUrl, attribution: "TheMealDB", sourceUrl: `https://www.themealdb.com/meal/${recipe.importedFrom.externalId}` } : null,
    source: recipe.importedFrom ? { name: "TheMealDB", url: `https://www.themealdb.com/meal/${recipe.importedFrom.externalId}`, originalUrl: recipe.importedFrom.sourceUrl ?? reviewedSourceUrl(recipe.metadataReview?.fields), developmentOnly: recipe.developmentOnly } : null,
    additionalTimeMinutes: recipe.additionalTimeMinutes,
    factSources: publicFactSources(recipe.metadataReview?.fields),
    timingNote: recipe.metadataReview?.timingNote ?? null,
    servings: recipe.servings,
    countries: bySlug(
      recipe.countries.flatMap((link) => {
        const label = catalogName(
          link.country.originalLanguage,
          link.country.translations,
          requestedLanguage,
        );
        if (!label) return [];
        const code = link.country.code?.trim() ?? '';
        return [
          {
            slug: link.country.slug,
            name: label.name,
            language: toPublicLanguage(label.language),
            code: code === '' ? null : code,
          },
        ];
      }),
    ),
    cuisines: bySlug(
      recipe.cuisines.flatMap((link) => {
        const label = labeled(
          link.cuisine.slug,
          link.cuisine.originalLanguage,
          link.cuisine.translations,
          requestedLanguage,
        );
        return label ? [label] : [];
      }),
    ),
    dietaryTags: bySlug(
      recipe.dietaryTags.flatMap((link) => {
        const label = labeled(
          link.dietaryTag.slug,
          link.dietaryTag.originalLanguage,
          link.dietaryTag.translations,
          requestedLanguage,
        );
        return label ? [label] : [];
      }),
    ),
  };
  if (!detail) return summary;

  const translationId = selected.translation.translation.id;
  return {
    ...summary,
    ingredients: [...recipe.ingredients]
      .sort((left, right) => left.position - right.position)
      .map((line) => {
        const label = selectCatalogLabel(
          line.ingredient.originalLanguage,
          line.ingredient.translations,
          requestedLanguage,
        );
        if (!label) throw new RecipeContentError();
        const note = line.notes.find((item) => item.recipeTranslationId === translationId);
        return {
          position: line.position,
          ingredientSlug: line.ingredient.slug,
          name: label.name,
          language: toPublicLanguage(label.language),
          sourceMeasure: line.sourceMeasure,
          quantity: formatQuantity(line.quantity),
          unit: line.unit,
          qualitativeAmount: line.qualitativeAmount,
          optional: line.isOptional,
          note: note && note.note.trim() !== '' ? note.note : null,
        };
      }),
    steps: [...recipe.steps]
      .sort((left, right) => left.position - right.position)
      .map((step, index) => {
        const instruction = selected.translation.instructions[index];
        if (instruction === undefined || instruction.trim() === '') throw new RecipeContentError();
        return { position: step.position, instruction };
      }),
  };
}

function labeled(
  slug: string,
  originalLanguage: DatabaseLanguage,
  names: readonly { language: DatabaseLanguage; name: string }[],
  requested: DatabaseLanguage,
): CatalogLabel | null {
  const label = catalogName(originalLanguage, names, requested);
  if (!label) return null;
  return {
    slug,
    name: label.name,
    language: toPublicLanguage(label.language),
  };
}

function catalogName(
  originalLanguage: DatabaseLanguage,
  names: readonly { language: DatabaseLanguage; name: string }[],
  requested: DatabaseLanguage,
): { name: string; language: DatabaseLanguage } | null {
  return selectCatalogLabel(originalLanguage, names, requested);
}

function bySlug<T extends { slug: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => (left.slug < right.slug ? -1 : left.slug > right.slug ? 1 : 0));
}

function publicFactSources(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: Record<string, string> = {};
  for (const [key, field] of Object.entries(value)) {
    if (field && typeof field === 'object' && 'basis' in field && typeof field.basis === 'string') result[key] = field.basis;
  }
  const timeKeys = ['prepTimeMinutes', 'cookTimeMinutes', 'additionalTimeMinutes'];
  if (timeKeys.some((key) => result[key] === 'UNKNOWN')) result.totalTimeMinutes = 'UNKNOWN';
  else if (timeKeys.some((key) => result[key] === 'ESTIMATE')) result.totalTimeMinutes = 'ESTIMATE';
  else if (timeKeys.every((key) => result[key] === 'SOURCE')) result.totalTimeMinutes = 'SOURCE';
  return result;
}

function reviewedSourceUrl(fields: unknown): string | null {
  if (!fields || typeof fields !== 'object') return null;
  for (const key of ['servings', 'prepTimeMinutes', 'cookTimeMinutes']) {
    const value: unknown = (fields as Record<string, unknown>)[key];
    if (!value || typeof value !== 'object') continue;
    const field = value as Record<string, unknown>;
    if (field.basis !== 'SOURCE' || typeof field.sourceUrl !== 'string') continue;
    try {
      const url = new URL(field.sourceUrl);
      if (['https:', 'http:'].includes(url.protocol) && !url.username && !url.password && !['www.themealdb.com', 'themealdb.com'].includes(url.hostname)) return url.href;
    } catch { /* Ignore invalid review links. */ }
  }
  return null;
}
