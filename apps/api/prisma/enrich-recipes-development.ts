import path from 'node:path';
import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { assertDevelopmentDatabase, developmentDatabaseUrl } from '../src/catalog/database-target';
import { applyRecipeEnrichment } from '../src/imports/apply-enrichment';
import { MealDbError } from '../src/imports/themealdb.client';
config({ path: path.resolve(__dirname, '../.env'), quiet: true });
async function main() {
  const args = process.argv.slice(3);
  if (args.length > 1 || (args.length === 1 && args[0] !== '--apply')) throw new MealDbError('Only --apply is accepted; default is a dry run.');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: developmentDatabaseUrl() }) });
  try { await assertDevelopmentDatabase(prisma); console.log(JSON.stringify(await applyRecipeEnrichment(prisma, args[0] === '--apply'))); }
  finally { await prisma.$disconnect(); }
}
main().catch((error: unknown) => { console.error(error instanceof MealDbError ? error.message : 'Recipe enrichment failed. Check local database configuration.'); process.exitCode = 1; });
