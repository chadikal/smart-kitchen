import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { config } from 'dotenv';
import { PrismaClient } from '../src/generated/prisma/client';
import { openMigrationClient, expectSqlState } from './migration-database';
import { parseMealDbRecipe } from '../src/imports/themealdb.client';
import { stageMealDbBatch } from '../src/imports/themealdb.import';
import { enrichmentManifest } from '../src/imports/recipe-enrichment';
import { applyRecipeEnrichment } from '../src/imports/apply-enrichment';
import { RecipesService } from '../src/recipes/recipe.service';
import { PrismaService } from '../src/prisma/prisma.service';

config({ path: path.resolve(__dirname, '../.env'), quiet: true });
const source = parseMealDbRecipe(JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/gigantes-source.json'), 'utf8')));
const reviews = enrichmentManifest.filter((item) => item.externalId === source.externalId);
const slug = 'themealdb-gigantes-plaki';
const previousMode = process.env.NODE_ENV;
let prisma: PrismaClient;
let recipeId: string | undefined;
let importId: string | undefined;
let waitId: string | undefined;
const ingredientIds: string[] = [];
const tagIds: string[] = [];
jest.setTimeout(120000);

beforeAll(async () => {
  prisma = openMigrationClient();
  if (await prisma.recipe.findUnique({ where: { slug } }) || await prisma.recipeImport.findUnique({ where: { provider_externalId: { provider: 'THEMEALDB', externalId: source.externalId } } })) throw new Error('Enrichment fixtures conflict with existing data.');
  process.env.NODE_ENV = 'development';
  await stageMealDbBatch(prisma, [source]);
  const imported = await prisma.recipeImport.findUniqueOrThrow({ where: { provider_externalId: { provider: 'THEMEALDB', externalId: source.externalId } } });
  importId = imported.id;
  const row = await prisma.recipe.create({ data: { slug, importId, originalLanguage: 'EN', publicationStatus: 'PUBLISHED', visibility: 'PUBLIC', developmentOnly: true, prepTimeMinutes: null, cookTimeMinutes: null, servings: null, difficulty: null } });
  recipeId = row.id;
  const translation = await prisma.recipeTranslation.create({ data: { recipeId, language: 'EN', title: source.title, description: '' } });
  for (const line of source.ingredients) {
    const ingredient = await prisma.ingredient.create({ data: { slug: `review-test-${randomUUID()}`, originalLanguage: 'EN', translations: { create: { language: 'EN', name: line.ingredient! } } } });
    ingredientIds.push(ingredient.id);
    await prisma.recipeIngredient.create({ data: { recipeId, ingredientId: ingredient.id, position: line.position, sourceMeasure: line.measure } });
  }
  for (const [index, instruction] of source.instructionsText.split(/\r?\n+/).map((part) => part.trim()).filter(Boolean).entries()) {
    const step = await prisma.recipeStep.create({ data: { recipeId, position: index + 1 } });
    await prisma.recipeStepTranslation.create({ data: { recipeId, stepId: step.id, recipeTranslationId: translation.id, instruction } });
  }
  for (const tagSlug of reviews[0].dietaryTags.value) {
    if (!await prisma.dietaryTag.findUnique({ where: { slug: tagSlug } })) {
      const tag = await prisma.dietaryTag.create({ data: { slug: tagSlug, originalLanguage: 'EN', translations: { create: { language: 'EN', name: tagSlug } } } });
      tagIds.push(tag.id);
    }
  }
});

afterAll(async () => {
  if (prisma) {
    await prisma.recipe.deleteMany({ where: { id: { in: [recipeId, waitId].filter((id): id is string => !!id) } } });
    await prisma.ingredient.deleteMany({ where: { id: { in: ingredientIds } } });
    if (importId) await prisma.recipeImport.delete({ where: { id: importId } });
    await prisma.dietaryTag.deleteMany({ where: { id: { in: tagIds } } });
    await prisma.$disconnect();
  }
  if (previousMode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousMode;
});

it('previews without writes, applies source evidence and omits an unquantified overnight total', async () => {
  await applyRecipeEnrichment(prisma, false, reviews);
  expect((await prisma.recipe.findUniqueOrThrow({ where: { id: recipeId } })).prepTimeMinutes).toBeNull();
  expect(await prisma.recipeMetadataReview.count({ where: { recipeId } })).toBe(0);
  await applyRecipeEnrichment(prisma, true, reviews);
  const service = new RecipesService(prisma as unknown as PrismaService);
  const detail = await service.detail(slug, 'en');
  expect(detail).toMatchObject({ prepTimeMinutes: 20, cookTimeMinutes: 120, additionalTimeMinutes: null, totalTimeMinutes: null, servings: 4, difficulty: 'EASY', factSources: { prepTimeMinutes: 'SOURCE', totalTimeMinutes: 'UNKNOWN', difficulty: 'EDITORIAL' } });
  expect(detail.description).not.toBe('');
  expect(detail.timingNote).toContain('overnight');
  expect(detail.dietaryTags.map((tag) => tag.slug).sort()).toEqual(['dairy-free', 'vegan', 'vegetarian']);
  expect((await service.list({ lang: 'en', q: source.title, maxTotalMinutes: 180, page: 1, pageSize: 20 })).total).toBe(0);
});

it('keeps repeated enrichment unchanged and refuses to overwrite a later manual edit', async () => {
  const before = await prisma.recipe.findUniqueOrThrow({ where: { id: recipeId } });
  expect((await applyRecipeEnrichment(prisma, true, reviews))[0].mode).toBe('unchanged');
  expect((await prisma.recipe.findUniqueOrThrow({ where: { id: recipeId } })).updatedAt).toEqual(before.updatedAt);
  await prisma.recipe.update({ where: { id: recipeId }, data: { servings: 9 } });
  await expect(applyRecipeEnrichment(prisma, true, reviews)).rejects.toThrow('was edited');
  expect((await prisma.recipe.findUniqueOrThrow({ where: { id: recipeId } })).servings).toBe(9);
  await prisma.recipe.update({ where: { id: recipeId }, data: { servings: 4 } });
});

it('rolls back earlier enrichment writes if another review in the batch fails', async () => {
  await prisma.recipeMetadataReview.delete({ where: { recipeId } });
  await prisma.recipeDietaryTag.deleteMany({ where: { recipeId } });
  await prisma.recipeTranslation.updateMany({ where: { recipeId }, data: { description: '' } });
  await prisma.recipe.update({ where: { id: recipeId }, data: { prepTimeMinutes: null, cookTimeMinutes: null, additionalTimeMinutes: 0, servings: null, difficulty: null } });
  await expect(applyRecipeEnrichment(prisma, true, [reviews[0], { ...reviews[0], externalId: 'not-reviewed' }])).rejects.toThrow('not in the reviewed');
  expect((await prisma.recipe.findUniqueOrThrow({ where: { id: recipeId } })).prepTimeMinutes).toBeNull();
  expect(await prisma.recipeMetadataReview.count({ where: { recipeId } })).toBe(0);
  expect(await prisma.recipeDietaryTag.count({ where: { recipeId } })).toBe(0);
});

it('includes specified waiting time in filters and excludes estimated times from Quick & cozy', async () => {
  const waitingSlug = `enrichment-time-${randomUUID()}`;
  const row = await prisma.recipe.create({ data: { slug: waitingSlug, originalLanguage: 'EN', publicationStatus: 'PUBLISHED', visibility: 'PUBLIC', prepTimeMinutes: 5, cookTimeMinutes: 5, additionalTimeMinutes: 30, difficulty: 'EASY', translations: { create: { language: 'EN', title: waitingSlug, description: '' } } } });
  waitId = row.id;
  const service = new RecipesService(prisma as unknown as PrismaService);
  expect((await service.detail(waitingSlug, 'en')).totalTimeMinutes).toBe(40);
  expect((await service.list({ lang: 'en', q: waitingSlug, maxTotalMinutes: 30, page: 1, pageSize: 20 })).total).toBe(0);
  await expectSqlState(() => prisma.recipe.update({ where: { id: waitId }, data: { additionalTimeMinutes: -1 } }), '23514');
  await prisma.recipe.update({ where: { id: waitId }, data: { additionalTimeMinutes: 0 } });
  await prisma.recipeMetadataReview.create({ data: { recipeId: waitId, revision: 'fixture', contentHash: 'fixture', reviewedBy: 'fixture', fields: { prepTimeMinutes: { basis: 'ESTIMATE' } } } });
  expect((await service.home('en')).quick.some((recipe) => recipe.slug === waitingSlug)).toBe(false);
});
