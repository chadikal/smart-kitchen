import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { config } from 'dotenv';
import { openMigrationClient, expectSqlState } from './migration-database';
import { RecipesService } from '../src/recipes/recipe.service';
import { PrismaService } from '../src/prisma/prisma.service';
import type { PrismaClient } from '../src/generated/prisma/client';

config({ path: path.resolve(__dirname, '../.env'), quiet: true });
const slug = `publication-${randomUUID()}`;
let prisma: PrismaClient;
let recipeId: string;
let ingredientId: string;
let cuisineId: string;
const originalMode = process.env.NODE_ENV;
beforeAll(async () => {
  prisma = openMigrationClient();
  const recipe = await prisma.recipe.create({ data: {
    slug, originalLanguage: 'EN', publicationStatus: 'PUBLISHED', visibility: 'PUBLIC', developmentOnly: true,
    difficulty: null, prepTimeMinutes: null, cookTimeMinutes: null, servings: null,
    translations: { create: { language: 'EN', title: slug, description: '' } },
  } });
  recipeId = recipe.id;
  const ingredient = await prisma.ingredient.create({ data: { slug, originalLanguage: 'EN', translations: { create: { language: 'EN', name: 'Source ingredient' } } } });
  ingredientId = ingredient.id;
  const cuisine = await prisma.cuisine.create({ data: { slug, originalLanguage: 'EN', translations: { create: { language: 'EN', name: 'Source cuisine' } } } });
  cuisineId = cuisine.id;
  await prisma.recipeCuisine.create({ data: { recipeId, cuisineId } });
});
afterAll(async () => {
  if (originalMode === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalMode;
  if (prisma) {
    await prisma.recipe.deleteMany({ where: { slug } });
    await prisma.ingredient.deleteMany({ where: { slug } });
    await prisma.cuisine.deleteMany({ where: { slug } });
    await prisma.$disconnect();
  }
});

it('preserves raw measures and rejects blank or mixed measured/source amounts', async () => {
  const line = await prisma.recipeIngredient.create({ data: { recipeId, ingredientId, position: 1, sourceMeasure: '14 oz jar' } });
  expect(line.quantity).toBeNull();
  expect(line.sourceMeasure).toBe('14 oz jar');
  for (const data of [{ sourceMeasure: ' ' }, { sourceMeasure: '3 Cups', quantity: '3.000', unit: 'CUP' as const }, { sourceMeasure: 'a pinch', qualitativeAmount: 'TO_TASTE' as const }]) {
    await expectSqlState(() => prisma.recipeIngredient.create({ data: { recipeId, ingredientId, position: 2, ...data } }), '23514');
  }
});

it('shows unknown facts honestly in development, but excludes trial recipes and catalog options elsewhere', async () => {
  const service = new RecipesService(prisma as unknown as PrismaService);
  process.env.NODE_ENV = 'development';
  const detail = await service.detail(slug, 'ar');
  expect(detail.totalTimeMinutes).toBeNull();
  expect(detail.difficulty).toBeNull();
  expect(detail.servings).toBeNull();
  expect(detail.fallbackUsed).toBe(true);
  expect(detail.ingredients[0].sourceMeasure).toBe('14 oz jar');
  expect((await service.catalog('cuisine', 'en')).some((item) => item.slug === slug)).toBe(true);
  for (const mode of ['production', 'test', '']) {
    process.env.NODE_ENV = mode;
    await expect(service.detail(slug, 'en')).rejects.toThrow('Recipe not found');
    expect((await service.list({ lang: 'en', q: slug, page: 1, pageSize: 20 })).total).toBe(0);
    expect((await service.catalog('cuisine', 'en')).some((item) => item.slug === slug)).toBe(false);
  }
});
