import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { migrationTestUrl } from '../src/catalog/database-target';

export { migrationTestUrl };

export function openMigrationClient(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: migrationTestUrl() }),
  });
}

export function sqlState(error: unknown): string | undefined {
  const seen = new Set<unknown>();
  const pending = [error];
  while (pending.length > 0) {
    const current = pending.pop();
    if (!current || typeof current !== 'object' || seen.has(current)) continue;
    seen.add(current);
    const record = current as Record<string, unknown>;
    for (const key of ['originalCode', 'code']) {
      const value = record[key];
      if (typeof value === 'string' && /^[0-9]{5}$/.test(value)) return value;
    }
    for (const [key, value] of Object.entries(record)) {
      if (
        key === 'message' ||
        key === 'stack' ||
        key === 'query' ||
        key === 'connectionString'
      ) {
        continue;
      }
      if (value && typeof value === 'object') pending.push(value);
    }
  }
  return undefined;
}

export async function expectSqlState(
  action: () => Promise<unknown>,
  state: string,
): Promise<void> {
  try {
    await action();
  } catch (error) {
    const found = sqlState(error);
    if (found !== state) {
      throw new Error(`Expected SQLSTATE ${state}, received ${found ?? 'none'}.`);
    }
    return;
  }
  throw new Error(`Expected SQLSTATE ${state}, but the statement succeeded.`);
}
