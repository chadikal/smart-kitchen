import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { developmentDatabaseUrl, assertDevelopmentDatabase } from '../src/catalog/database-target';
import { MealDbClient, MealDbError } from '../src/imports/themealdb.client';
import { collectMealDbBatch, parseImportOptions, stageMealDbBatch } from '../src/imports/themealdb.import';

loadEnv({ path: path.resolve(__dirname, '../.env'), quiet: true });

async function main(): Promise<void> {
  const options = parseImportOptions(process.argv.slice(3));
  // Also restrict dry runs to the development workflow; no credentials are sent to the provider.
  const connectionString = developmentDatabaseUrl();
  if (options.list) {
    const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    try {
      await assertDevelopmentDatabase(prisma);
      const items = await prisma.recipeImport.findMany({
        where: { provider: 'THEMEALDB' },
        select: { id: true, externalId: true, title: true, area: true, imageUrl: true, sourceUrl: true,
          reviewStatus: true, rightsReviewed: true, reviewWarnings: true },
        orderBy: [{ area: 'asc' }, { externalId: 'asc' }],
      });
      console.log(JSON.stringify({ mode: 'list', attribution: 'TheMealDB', items }, null, 2));
    } finally { await prisma.$disconnect(); }
    return;
  }
  const batch = await collectMealDbBatch(new MealDbClient(process.env.THEMEALDB_API_KEY ?? '1'), options);
  if (options.apply) {
    const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    try {
      await assertDevelopmentDatabase(prisma);
      await stageMealDbBatch(prisma, batch.recipes);
    } finally { await prisma.$disconnect(); }
  }
  console.log(JSON.stringify({
    mode: options.apply ? 'staged' : 'dry-run',
    attribution: 'TheMealDB', providerWebsite: 'https://www.themealdb.com',
    published: false, areas: batch.areas,
    items: batch.recipes.map((recipe) => ({
      externalId: recipe.externalId, title: recipe.title, area: recipe.area,
      imageUrl: recipe.imageUrl, sourceUrl: recipe.sourceUrl,
      ingredientLines: recipe.ingredients.length, licenseMetadata: recipe.licenseMetadata,
      reviewWarnings: recipe.reviewWarnings,
    })),
  }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof MealDbError ? error.message : 'TheMealDB import failed. Check the local database and configuration.');
  process.exitCode = 1;
});
