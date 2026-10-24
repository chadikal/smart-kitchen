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
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  totalTimeMinutes: number;
  servings: number;
  countries: CountryLabel[];
  cuisines: CatalogLabel[];
  dietaryTags: CatalogLabel[];
}

export interface IngredientLine {
  position: number;
  ingredientSlug: string;
  name: string;
  language: PublicLanguage;
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
    totalTimeMinutes: recipe.prepTimeMinutes + recipe.cookTimeMinutes,
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
