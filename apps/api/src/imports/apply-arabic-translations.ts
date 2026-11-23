import { PrismaClient } from '../generated/prisma/client';
import { genderedArabicCommand } from '../catalog/seed-catalog';
import { contentHash, enrichmentRecipeInclude } from './apply-enrichment';
import { arabicCuisineNames, arabicRecipeTranslations, ArabicRecipeTranslation } from './arabic-recipe-translations';
import { reviewedRecipes } from './reviewed-recipes';
import { MealDbError } from './themealdb.client';

function assertNeutral(slug: string, text: string): void {
  if (genderedArabicCommand.test(text)) {
    throw new MealDbError(`${slug} Arabic uses a gendered command.`);
  }
}

/** Adds a complete Arabic document beside the imported English. English text is not changed. */
export async function applyArabicTranslations(
  prisma: PrismaClient,
  apply: boolean,
  documents: readonly ArabicRecipeTranslation[] = arabicRecipeTranslations,
) {
  if (process.env.NODE_ENV !== 'development') throw new MealDbError('Arabic translation requires development mode.');
  for (const document of documents) {
    assertNeutral(document.slug, document.title);
    assertNeutral(document.slug, document.description);
    for (const step of document.steps) assertNeutral(document.slug, step);
    for (const name of document.ingredients) assertNeutral(document.slug, name);
  }
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(872431::integer, 2::integer)`;
    const results = [];
    for (const document of documents) {
      const reviewed = reviewedRecipes.find((item) => item.slug === document.slug);
      if (!reviewed) throw new MealDbError('Arabic translation is not in the reviewed recipe manifest.');
      await tx.$queryRaw`SELECT id FROM recipes WHERE slug = ${document.slug} FOR UPDATE`;
      const row = await tx.recipe.findUniqueOrThrow({ where: { slug: document.slug }, include: enrichmentRecipeInclude });
      if (row.ownerId !== null || !row.developmentOnly || row.originalLanguage !== 'EN'
        || row.publicationStatus !== 'PUBLISHED' || row.visibility !== 'PUBLIC') {
        throw new MealDbError('Recipe ownership or publication state changed. Nothing was translated.');
      }
      if (row.steps.length !== document.steps.length || row.ingredients.length !== document.ingredients.length) {
        throw new MealDbError(`${document.slug} no longer matches the Arabic document. Nothing was translated.`);
      }
      const english = row.translations.find((item) => item.language === 'EN');
      if (!english) throw new MealDbError(`${document.slug} is missing its English document.`);
      const existing = row.translations.find((item) => item.language === 'AR');
      const existingSteps = row.steps.map((step) => step.translations.find((item) => item.recipeTranslationId === existing?.id)?.instruction);
      const sameDocument = existing?.title === document.title && existing.description === document.description
        && existingSteps.every((instruction, index) => instruction === document.steps[index]);
      if (existing && !sameDocument) throw new MealDbError(`${document.slug} already has a different Arabic document. Nothing was overwritten.`);
      if (reviewed.cuisine) {
        const cuisine = await tx.cuisine.findUnique({
          where: { slug: `themealdb-${reviewed.cuisine}` },
          include: { translations: true },
        });
        const arabicName = arabicCuisineNames[reviewed.cuisine];
        const current = cuisine?.translations.find((item) => item.language === 'AR');
        if (cuisine && arabicName && current && current.name !== arabicName) {
          throw new MealDbError(`${cuisine.slug} already has a different Arabic name.`);
        }
        if (apply && cuisine && arabicName && !current) {
          await tx.cuisineTranslation.create({ data: { cuisineId: cuisine.id, language: 'AR', name: arabicName } });
        }
      }
      for (const [index, line] of row.ingredients.entries()) {
        const name = document.ingredients[index];
        const current = line.ingredient.translations.find((item) => item.language === 'AR');
        if (current && current.name !== name) throw new MealDbError(`${document.slug} ingredient ${line.position} already has a different Arabic name.`);
        if (apply && !current) {
          await tx.ingredientTranslation.create({ data: { ingredientId: line.ingredientId, language: 'AR', name } });
        }
      }
      if (apply && !existing) {
        const translation = await tx.recipeTranslation.create({
          data: { recipeId: row.id, language: 'AR', title: document.title, description: document.description },
        });
        for (const [index, step] of row.steps.entries()) {
          await tx.recipeStepTranslation.create({
            data: {
              recipeId: row.id,
              stepId: step.id,
              recipeTranslationId: translation.id,
              instruction: document.steps[index],
            },
          });
        }
      }
      if (apply && row.metadataReview) {
        const updated = await tx.recipe.findUniqueOrThrow({ where: { id: row.id }, include: enrichmentRecipeInclude });
        const hash = contentHash(updated);
        if (hash !== row.metadataReview.contentHash) {
          await tx.recipeMetadataReview.update({ where: { recipeId: row.id }, data: { contentHash: hash } });
        }
      }
      results.push({ slug: document.slug, mode: !apply ? 'dry-run' : existing ? 'unchanged' : 'translated' });
    }
    return results;
  }, { timeout: 30_000 });
}
