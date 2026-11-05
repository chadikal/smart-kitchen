import path from 'node:path';
import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { assertDevelopmentDatabase, developmentDatabaseUrl } from '../src/catalog/database-target';
import { publishReviewedDevelopmentRecipe } from '../src/imports/themealdb.publish';
import { MealDbError } from '../src/imports/themealdb.client';

config({ path: path.resolve(__dirname, '../.env'), quiet: true });
async function main() {
  const args = process.argv.slice(3);
  if (args.length > 1 || (args.length === 1 && args[0] !== '--apply')) throw new MealDbError('Only --apply is accepted; the default is a dry run.');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: developmentDatabaseUrl() }) });
  try {
    await assertDevelopmentDatabase(prisma);
    console.log(JSON.stringify(await publishReviewedDevelopmentRecipe(prisma, args[0] === '--apply')));
  } finally { await prisma.$disconnect(); }
}
main().catch((error: unknown) => {
  console.error(error instanceof MealDbError ? error.message : 'Development publication failed. Check the local database configuration.');
  process.exitCode = 1;
});
