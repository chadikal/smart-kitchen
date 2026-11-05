import { Prisma, PrismaClient } from '../generated/prisma/client';
import { enrichmentManifest, enrichmentRevision, Enrichment } from './recipe-enrichment';
import { reviewedRecipes } from './reviewed-recipes';
import { reviewedDevelopmentRecipe, sourceFingerprint } from './themealdb.publish';
import { MealDbError } from './themealdb.client';

const include = {
  importedFrom: true, metadataReview: true, translations: true,
  ingredients: { orderBy: { position: 'asc' as const }, include: { ingredient: { include: { translations: true } }, notes: true } },
  steps: { orderBy: { position: 'asc' as const }, include: { translations: true } },
  dietaryTags: { include: { dietaryTag: true } },
} satisfies Prisma.RecipeInclude;
type RecordForReview = Prisma.RecipeGetPayload<{ include: typeof include }>;

function contentHash(row: RecordForReview): string {
  return sourceFingerprint({
    slug: row.slug, importId: row.importId, ownerId: row.ownerId, originalLanguage: row.originalLanguage,
    publicationStatus: row.publicationStatus, visibility: row.visibility, developmentOnly: row.developmentOnly,
    prep: row.prepTimeMinutes, cook: row.cookTimeMinutes, wait: row.additionalTimeMinutes,
    servings: row.servings, difficulty: row.difficulty,
    translations: row.translations.map((item) => ({ language: item.language, title: item.title, description: item.description })).sort((a, b) => a.language.localeCompare(b.language)),
    lines: row.ingredients.map((line) => ({
      position: line.position, sourceMeasure: line.sourceMeasure, quantity: line.quantity?.toFixed(3) ?? null,
      unit: line.unit, qualitativeAmount: line.qualitativeAmount, optional: line.isOptional,
      names: line.ingredient.translations.map((item) => ({ language: item.language, name: item.name })).sort((a, b) => a.language.localeCompare(b.language)),
      notes: line.notes.map((item) => item.note),
    })),
    steps: row.steps.map((step) => ({ position: step.position, instructions: step.translations.map((item) => item.instruction) })),
    tags: row.dietaryTags.map((link) => link.dietaryTag.slug).sort(),
  });
}

function validateUnenriched(row: RecordForReview): void {
  if (!row.importedFrom) throw new MealDbError('Recipe is not linked to a reviewed import.');
  const source = reviewedDevelopmentRecipe(row.importedFrom);
  const original = row.translations.find((item) => item.language === 'EN');
  const paragraphs = source.instructionsText.split(/\r?\n+/).map((text) => text.trim()).filter(Boolean);
  const unchanged = row.translations.length === 1 && original?.title === source.title && original.description === ''
    && row.prepTimeMinutes === null && row.cookTimeMinutes === null && row.additionalTimeMinutes === 0
    && row.servings === null && row.difficulty === null && row.dietaryTags.length === 0
    && row.ingredients.length === source.ingredients.length && row.steps.length === paragraphs.length
    && row.ingredients.every((line, index) => {
      const expected = source.ingredients[index];
      return line.position === expected.position && line.sourceMeasure === expected.measure
        && line.ingredient.translations.length === 1 && line.ingredient.translations[0].language === 'EN'
        && line.ingredient.translations[0].name === expected.ingredient && line.quantity === null && line.unit === null
        && line.qualitativeAmount === null && !line.isOptional && line.notes.length === 0;
    })
    && row.steps.every((step, index) => step.position === index + 1 && step.translations.length === 1
      && step.translations[0].recipeTranslationId === original?.id && step.translations[0].instruction === paragraphs[index]);
  if (!unchanged) throw new MealDbError('Recipe was edited after import. Enrichment refuses to overwrite it.');
}

/** Caller supplies the guarded development/test database; no public write endpoint. */
export async function applyRecipeEnrichment(prisma: PrismaClient, apply: boolean, reviews: readonly Enrichment[] = enrichmentManifest) {
  if (process.env.NODE_ENV !== 'development') throw new MealDbError('Metadata enrichment requires development mode.');
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(872431::integer, 2::integer)`;
    const results = [];
    for (const review of reviews) {
      const imported = reviewedRecipes.find((item) => item.externalId === review.externalId);
      if (!imported) throw new MealDbError('Metadata review is not in the reviewed recipe manifest.');
      await tx.$queryRaw`SELECT id FROM recipes WHERE slug = ${imported.slug} FOR UPDATE`;
      const row = await tx.recipe.findUniqueOrThrow({ where: { slug: imported.slug }, include });
      if (row.ownerId !== null || !row.developmentOnly || row.originalLanguage !== 'EN'
        || row.publicationStatus !== 'PUBLISHED' || row.visibility !== 'PUBLIC'
        || row.importedFrom?.externalId !== review.externalId) throw new MealDbError('Recipe ownership or publication state changed. Nothing was enriched.');
      reviewedDevelopmentRecipe(row.importedFrom);
      if (row.metadataReview) {
        if (row.metadataReview.revision !== enrichmentRevision || row.metadataReview.contentHash !== contentHash(row)) {
          throw new MealDbError('Reviewed recipe was edited. A new explicit review is required; nothing was overwritten.');
        }
        results.push({ slug: row.slug, mode: 'unchanged' });
        continue;
      }
      validateUnenriched(row);
      const tags = await tx.dietaryTag.findMany({ where: { slug: { in: review.dietaryTags.value } } });
      if (tags.length !== review.dietaryTags.value.length) throw new MealDbError('Required dietary catalog labels are missing.');
      if (!apply) { results.push({ slug: row.slug, mode: 'dry-run', prep: review.prepTimeMinutes.value, cook: review.cookTimeMinutes.value, servings: review.servings.value }); continue; }
      await tx.recipe.update({ where: { id: row.id }, data: {
        prepTimeMinutes: review.prepTimeMinutes.value, cookTimeMinutes: review.cookTimeMinutes.value,
        additionalTimeMinutes: review.additionalTimeMinutes.value, servings: review.servings.value, difficulty: review.difficulty.value,
      } });
      await tx.recipeTranslation.update({ where: { recipeId_language: { recipeId: row.id, language: 'EN' } }, data: { description: review.description } });
      for (const tag of tags) await tx.recipeDietaryTag.create({ data: { recipeId: row.id, dietaryTagId: tag.id } });
      const updated = await tx.recipe.findUniqueOrThrow({ where: { id: row.id }, include });
      const fields = { ...review, description: { value: review.description, basis: 'EDITORIAL', sourceUrl: row.importedFrom.sourceUrl, note: 'Savora summary of the actual imported ingredients and instructions.' } };
      await tx.recipeMetadataReview.create({ data: {
        recipeId: row.id, revision: enrichmentRevision, contentHash: contentHash(updated),
        fields: JSON.parse(JSON.stringify(fields)) as Prisma.InputJsonValue,
        timingNote: review.timingNote, reviewedBy: 'Savora editorial review; not independently kitchen-tested',
      } });
      results.push({ slug: row.slug, mode: 'enriched' });
    }
    return results;
  }, { timeout: 30_000 });
}
