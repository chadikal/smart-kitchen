import { randomInt } from 'node:crypto';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { parseMealDbRecipe } from '../src/imports/themealdb.client';
import { stageMealDbBatch } from '../src/imports/themealdb.import';
import { openMigrationClient } from './migration-database';
import type { PrismaClient } from '../src/generated/prisma/client';

loadEnv({ path: path.resolve(__dirname, '../.env'), quiet: true });
let prisma: PrismaClient;
const base = 990000000000 + randomInt(0, 1000000) * 10;
const ids = [String(base), String(base + 1), String(base + 2)];

function meal(id = ids[0], title = 'Import review fixture') {
  return parseMealDbRecipe({
    idMeal: id, strMeal: title, strInstructions: 'Keep the source instructions.',
    strIngredient1: 'Flour', strMeasure1: '1 1/2 cups', strArea: 'Italian',
    strMealThumb: 'https://www.themealdb.com/images/media/meals/example.jpg',
    strSource: 'https://example.org/source', strCreativeCommonsConfirmed: null,
  });
}

beforeAll(() => { prisma = openMigrationClient(); });
afterAll(async () => {
  if (!prisma) return;
  await prisma.recipeImport.deleteMany({ where: { provider: 'THEMEALDB', externalId: { in: ids } } });
  await prisma.$disconnect();
});

describe('external recipe staging', () => {
  it('stores raw measurements and photo provenance without adding public recipes or translations', async () => {
    const publicCount = await prisma.recipe.count();
    const translationCount = await prisma.recipeTranslation.count();
    await stageMealDbBatch(prisma, [meal()]);
    const row = await prisma.recipeImport.findUniqueOrThrow({ where: { provider_externalId: { provider: 'THEMEALDB', externalId: ids[0] } } });
    expect(row.reviewStatus).toBe('PENDING_REVIEW');
    expect(row.rightsReviewed).toBe(false);
    expect(row.ingredients).toEqual([{ position: 1, ingredient: 'Flour', measure: '1 1/2 cups' }]);
    expect(row.imageUrl).toContain('/images/media/meals/');
    expect(row.licenseMetadata).toEqual({ strCreativeCommons: null, strCreativeCommonsConfirmed: null });
    expect(await prisma.recipe.count()).toBe(publicCount);
    expect(await prisma.recipeTranslation.count()).toBe(translationCount);
  });

  it('refreshes pending imports with the same ID, without duplicate source records', async () => {
    await stageMealDbBatch(prisma, [meal(ids[1])]);
    const first = await prisma.recipeImport.findUniqueOrThrow({ where: { provider_externalId: { provider: 'THEMEALDB', externalId: ids[1] } } });
    await stageMealDbBatch(prisma, [meal(ids[1], 'Updated source title')]);
    const second = await prisma.recipeImport.findUniqueOrThrow({ where: { id: first.id } });
    expect(second.title).toBe('Updated source title');
    expect(second.createdAt).toEqual(first.createdAt);
    expect(await prisma.recipeImport.count({ where: { provider: 'THEMEALDB', externalId: ids[1] } })).toBe(1);
  });

  it('preserves reviewed records and rolls back earlier inserts on a conflict', async () => {
    await stageMealDbBatch(prisma, [meal()]);
    await prisma.recipeImport.updateMany({ where: { provider: 'THEMEALDB', externalId: ids[0] }, data: { reviewStatus: 'REJECTED' } });
    await expect(stageMealDbBatch(prisma, [meal(ids[2]), meal(ids[0], 'Must not replace')])).rejects.toThrow('rolled back');
    expect(await prisma.recipeImport.count({ where: { provider: 'THEMEALDB', externalId: ids[2] } })).toBe(0);
    const kept = await prisma.recipeImport.findUniqueOrThrow({ where: { provider_externalId: { provider: 'THEMEALDB', externalId: ids[0] } } });
    expect(kept.title).toBe('Import review fixture');
    expect(kept.reviewStatus).toBe('REJECTED');
    await prisma.recipeImport.update({ where: { id: kept.id }, data: { reviewStatus: 'PENDING_REVIEW', rightsReviewed: true } });
    await expect(stageMealDbBatch(prisma, [meal()])).rejects.toThrow('reviewed import');
  });
});
