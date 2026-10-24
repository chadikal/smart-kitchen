import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { applySeed } from '../src/catalog/apply-seed';
import { migrationTestUrl } from '../src/catalog/database-target';

loadEnv({ path: path.resolve(__dirname, '../.env'), quiet: true });

async function main(): Promise<void> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: migrationTestUrl() }),
  });
  try {
    await applySeed(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Seed failed';
  console.error(message);
  process.exitCode = 1;
});
