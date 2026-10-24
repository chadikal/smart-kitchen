import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { migrationTestUrl } from '../src/catalog/database-target';
import {
  formatReconciliationReport,
  reconcileSeed,
  SeedReconciliationError,
} from '../src/catalog/reconcile-seed';

loadEnv({ path: path.resolve(__dirname, '../.env'), quiet: true });

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((arg) => !arg.endsWith('prisma/reconcile-seed.ts'));
  const unexpected = args.filter((arg) => arg !== '--apply' && !/postgres(ql)?:\/\//i.test(arg));
  if (unexpected.length > 0 || args.length !== unexpected.length + (args.includes('--apply') ? 1 : 0)) {
    throw new Error(
      `Use no arguments for a dry run, or --apply to record provenance. Unexpected: ${unexpected.join(', ')}`,
    );
  }
  const apply = args.includes('--apply');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: migrationTestUrl() }),
  });
  try {
    const report = await reconcileSeed(prisma, { apply });
    console.log(formatReconciliationReport(report));
    if (report.findings.some((finding) => finding.fields.length > 0)) {
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  if (error instanceof SeedReconciliationError) {
    console.log(
      formatReconciliationReport({
        mode: process.argv.includes('--apply') ? 'apply' : 'dry-run',
        findings: [...error.findings],
      }),
    );
  } else {
    console.error(error instanceof Error ? error.message : 'Reconciliation failed');
  }
  process.exitCode = 1;
});
