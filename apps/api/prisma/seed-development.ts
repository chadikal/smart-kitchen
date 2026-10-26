import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { applySeed } from '../src/catalog/apply-seed';
import {
  assertDevelopmentDatabase,
  developmentDatabaseUrl,
  rejectDevelopmentSeedOverrides,
} from '../src/catalog/database-target';

loadEnv({ path: path.resolve(__dirname, '../.env'), quiet: true });

async function main(): Promise<void> {
  rejectDevelopmentSeedOverrides(process.argv.slice(2));
  const connectionString = developmentDatabaseUrl();
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  try {
    await assertDevelopmentDatabase(prisma);
    await applySeed(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(publicSeedError(error));
  process.exitCode = 1;
});

function publicSeedError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Development seed failed.';
  if (/postgres(ql)?:\/\//i.test(message) || message.includes('@')) {
    return 'Development seed failed before writing.';
  }
  return message;
}
