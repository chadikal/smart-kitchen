import path from 'node:path';
import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { assertDevelopmentDatabase, developmentDatabaseUrl } from '../src/catalog/database-target';
import { MealDbClient, MealDbError, MealDbRecipe } from '../src/imports/themealdb.client';
import { reviewedRecipes } from '../src/imports/reviewed-recipes';
import { sourceFingerprint } from '../src/imports/themealdb.publish';
import { stageMealDbBatch } from '../src/imports/themealdb.import';
config({ path: path.resolve(__dirname, '../.env'), quiet: true });
async function main() {
  const args = process.argv.slice(3);
  if (args.length > 1 || (args.length === 1 && args[0] !== '--apply')) throw new MealDbError('Only --apply is accepted.');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: developmentDatabaseUrl() }) });
  try {
    await assertDevelopmentDatabase(prisma);
    const client = new MealDbClient(process.env.THEMEALDB_API_KEY ?? '1');
    const recipes: MealDbRecipe[] = [];
    for (const review of reviewedRecipes) {
      const existing = await prisma.recipeImport.findUnique({ where: { provider_externalId: { provider: 'THEMEALDB', externalId: review.externalId } } });
      if (existing && existing.reviewStatus !== 'PENDING_REVIEW') continue;
      const recipe = await client.lookup(review.externalId);
      if (!recipe || sourceFingerprint(recipe.rawPayload) !== review.hash) throw new MealDbError('Source changed after review; the whole batch was left unstaged.');
      recipes.push(recipe);
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
    if (args[0] === '--apply') await stageMealDbBatch(prisma, recipes);
    console.log(JSON.stringify({ mode: args[0] === '--apply' ? 'staged' : 'dry-run', ids: recipes.map((recipe) => recipe.externalId) }));
  } finally { await prisma.$disconnect(); }
}
main().catch((error: unknown) => { console.error(error instanceof MealDbError ? error.message : 'Reviewed staging failed. Check local configuration.'); process.exitCode = 1; });
