import { createHash } from 'node:crypto';
import { PrismaClient, RecipeImport } from '../generated/prisma/client';
import { MealDbError, parseMealDbRecipe } from './themealdb.client';

import { reviewedRecipes, reviewedCuisineNames } from './reviewed-recipes';

const reviewNote = 'Content reviewed 2026-10-30 for local development use. Source measures and instructions preserved; no inferred numeric facts or diets. Provider cuisine labels reviewed without assigning an exclusive country of origin. Production rights remain unreviewed.';

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]));
  return value;
}

export function sourceFingerprint(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}

export function reviewedDevelopmentRecipe(row: RecipeImport) {
  const review = reviewedRecipes.find((item) => item.externalId === row.externalId);
  const hash = sourceFingerprint(row.rawPayload);
  if (row.provider !== 'THEMEALDB' || !review || hash !== review.hash || row.reviewStatus === 'REJECTED') {
    throw new MealDbError('Import does not match the reviewed development document. Nothing was published.');
  }
  const recipe = parseMealDbRecipe(row.rawPayload);
  if (recipe.title !== row.title || recipe.imageUrl !== row.imageUrl || recipe.instructionsText !== row.instructionsText || JSON.stringify(canonical(recipe.ingredients)) !== JSON.stringify(canonical(row.ingredients))) {
    throw new MealDbError('Staged content differs from the reviewed source. Nothing was published.');
  }
  if (!recipe.imageUrl || recipe.ingredients.some((line) => !line.ingredient?.trim() || !line.measure?.trim())) throw new MealDbError('Reviewed recipe is incomplete.');
  return recipe;
}

/** Caller must use the guarded development database. Dry run locks and reads only. */
export async function publishReviewedDevelopmentRecipe(prisma: PrismaClient, apply: boolean) {
  if (process.env.NODE_ENV !== 'development') throw new MealDbError('Publication requires development mode.');
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(872431::integer, 2::integer)`;
    const results = [];
    for (const review of reviewedRecipes) {
      const reviewedId = review.externalId;
      const slug = review.slug;
      await tx.$queryRaw`SELECT id FROM recipe_imports WHERE provider = 'THEMEALDB' AND external_id = ${reviewedId} FOR UPDATE`;
      const row = await tx.recipeImport.findUniqueOrThrow({ where: { provider_externalId: { provider: 'THEMEALDB', externalId: reviewedId } } });
      const source = reviewedDevelopmentRecipe(row);
      const existing = await tx.recipe.findFirst({ where: { OR: [{ importId: row.id }, { slug }] } });
      if (existing) {
        if (existing.importId !== row.id || existing.slug !== slug || existing.ownerId !== null || !existing.developmentOnly) throw new MealDbError('Existing recipe conflicts with this development import.');
        // Never republish or overwrite a recipe that has subsequently been edited.
        results.push({ mode: apply ? 'unchanged' : 'dry-run', slug, id: existing.id, developmentOnly: true });
        continue;
      }
      if (!apply) { results.push({ mode: 'dry-run', slug, developmentOnly: true, ingredientLines: source.ingredients.length }); continue; }
      const recipe = await tx.recipe.create({ data: {
        slug, importId: row.id, originalLanguage: 'EN', developmentOnly: true,
        publicationStatus: 'PUBLISHED', visibility: 'PUBLIC',
        prepTimeMinutes: null, cookTimeMinutes: null, servings: null, difficulty: null,
      } });
      const translation = await tx.recipeTranslation.create({ data: { recipeId: recipe.id, language: 'EN', title: source.title, description: '' } });
      for (const line of source.ingredients) {
        // Dedicated source identities avoid silently merging differently prepared ingredients.
        const ingredient = await tx.ingredient.create({ data: {
          slug: `themealdb-${reviewedId}-ingredient-${line.position}`, originalLanguage: 'EN',
          translations: { create: { language: 'EN', name: line.ingredient! } },
        } });
        await tx.recipeIngredient.create({ data: { recipeId: recipe.id, ingredientId: ingredient.id, position: line.position, sourceMeasure: line.measure } });
      }
      if (review.cuisine) {
        const cuisineSlug = `themealdb-${review.cuisine}`;
        const name = reviewedCuisineNames[review.cuisine];
        const existingCuisine = await tx.cuisine.findUnique({ where: { slug: cuisineSlug }, include: { translations: true } });
        if (existingCuisine && (existingCuisine.originalLanguage !== 'EN' || existingCuisine.translations.find((item) => item.language === 'EN')?.name !== name)) throw new MealDbError('Reviewed cuisine conflicts with existing content.');
        const cuisine = existingCuisine ?? await tx.cuisine.create({ data: { slug: cuisineSlug, originalLanguage: 'EN', translations: { create: { language: 'EN', name } } } });
        await tx.recipeCuisine.create({ data: { recipeId: recipe.id, cuisineId: cuisine.id } });
      }
      const paragraphs = source.instructionsText.split(/\r?\n+/).map((part) => part.trim()).filter(Boolean);
      for (const [index, instruction] of paragraphs.entries()) {
        const step = await tx.recipeStep.create({ data: { recipeId: recipe.id, position: index + 1 } });
        await tx.recipeStepTranslation.create({ data: { recipeId: recipe.id, stepId: step.id, recipeTranslationId: translation.id, instruction } });
      }
      await tx.recipeImport.update({ where: { id: row.id }, data: { reviewStatus: 'APPROVED', developmentReviewNote: reviewNote, developmentReviewedAt: new Date() } });
      results.push({ mode: 'published', slug, id: recipe.id, developmentOnly: true });
    }
    return { items: results };
  }, { timeout: 30_000 });
}
