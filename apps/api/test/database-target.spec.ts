import {
  assertDevelopmentDatabase,
  developmentDatabaseUrl,
  migrationTestUrl,
  rejectDevelopmentSeedOverrides,
} from '../src/catalog/database-target';

const allowed =
  'postgresql://postgres:postgres@127.0.0.1:5432/smart_kitchen_migration_test?schema=public';
const application =
  'postgresql://postgres:postgres@127.0.0.1:5432/smart_kitchen?schema=public';

describe('migration test database target', () => {
  const previousTest = process.env.MIGRATION_TEST_DATABASE_URL;
  const previousApplication = process.env.DATABASE_URL;

  afterEach(() => {
    restore('MIGRATION_TEST_DATABASE_URL', previousTest);
    restore('DATABASE_URL', previousApplication);
  });

  it('accepts loopback hosts on port 5432 with only schema=public', () => {
    for (const url of [
      allowed,
      'postgresql://postgres:postgres@localhost:5432/smart_kitchen_migration_test?schema=public',
      'postgresql://postgres:postgres@[::1]:5432/smart_kitchen_migration_test?schema=public',
    ]) {
      process.env.DATABASE_URL = application;
      process.env.MIGRATION_TEST_DATABASE_URL = url;
      expect(migrationTestUrl()).toBe(url);
    }
  });

  it('rejects remote hosts, other databases, ports, schemas, and extra options', () => {
    for (const url of [
      'postgresql://postgres:postgres@example.com:5432/smart_kitchen_migration_test?schema=public',
      'postgresql://postgres:postgres@10.0.0.8:5432/smart_kitchen_migration_test?schema=public',
      'postgresql://postgres:postgres@127.0.0.1:5433/smart_kitchen_migration_test?schema=public',
      'postgresql://postgres:postgres@127.0.0.1:5432/smart_kitchen?schema=public',
      'postgresql://postgres:postgres@127.0.0.1:5432/smart_kitchen_migration_test?schema=other',
      'postgresql://postgres:postgres@127.0.0.1:5432/smart_kitchen_migration_test',
      'postgresql://postgres:postgres@127.0.0.1:5432/smart_kitchen_migration_test?schema=public&options=-csearch_path%3Dother',
      'postgresql://postgres:postgres@127.0.0.1:5432/smart_kitchen_migration_test?schema=public&hostaddr=8.8.8.8',
    ]) {
      process.env.DATABASE_URL = application;
      process.env.MIGRATION_TEST_DATABASE_URL = url;
      expect(() => migrationTestUrl()).toThrow(/loopback host/);
    }
  });

  it('rejects a test URL when DATABASE_URL uses the same database name', () => {
    process.env.DATABASE_URL = allowed;
    process.env.MIGRATION_TEST_DATABASE_URL = allowed;
    expect(() => migrationTestUrl()).toThrow(/DATABASE_URL points at the test database/);
  });
});

describe('development database target', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousApplication = process.env.DATABASE_URL;
  const previousTest = process.env.MIGRATION_TEST_DATABASE_URL;
  const secret = 'secret-token';
  const developmentUrl = `postgresql://postgres:${secret}@127.0.0.1:5432/smart_kitchen?schema=public`;

  afterEach(() => {
    restore('NODE_ENV', previousNodeEnv);
    restore('DATABASE_URL', previousApplication);
    restore('MIGRATION_TEST_DATABASE_URL', previousTest);
  });

  it('accepts only a development loopback connection to smart_kitchen', () => {
    process.env.NODE_ENV = 'development';
    process.env.MIGRATION_TEST_DATABASE_URL = allowed;
    for (const url of [
      developmentUrl,
      `postgresql://postgres:${secret}@localhost:5432/smart_kitchen?schema=public`,
      `postgresql://postgres:${secret}@[::1]:5432/smart_kitchen?schema=public`,
    ]) {
      process.env.DATABASE_URL = url;
      expect(developmentDatabaseUrl()).toBe(url);
    }
  });

  it('rejects production mode, remote hosts, test databases, and target overrides', () => {
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = developmentUrl;
    expect(() => developmentDatabaseUrl()).toThrow(/NODE_ENV is production/);

    process.env.NODE_ENV = 'test';
    expect(() => developmentDatabaseUrl()).toThrow(/NODE_ENV=development/);

    process.env.NODE_ENV = 'development';
    for (const url of [
      `postgresql://postgres:${secret}@example.com:5432/smart_kitchen?schema=public`,
      `postgresql://postgres:${secret}@10.0.0.8:5432/smart_kitchen?schema=public`,
      `postgresql://postgres:${secret}@127.0.0.1:5433/smart_kitchen?schema=public`,
      `postgresql://postgres:${secret}@127.0.0.1:5432/smart_kitchen_migration_test?schema=public`,
      `postgresql://postgres:${secret}@127.0.0.1:5432/other?schema=public`,
      `postgresql://postgres:${secret}@127.0.0.1:5432/smart_kitchen?schema=other`,
      `postgresql://postgres:${secret}@127.0.0.1:5432/smart_kitchen`,
      `postgresql://postgres:${secret}@127.0.0.1:5432/smart_kitchen?schema=public&hostaddr=8.8.8.8`,
    ]) {
      process.env.DATABASE_URL = url;
      expectSafeUrlError(() => developmentDatabaseUrl());
    }

    expect(() => rejectDevelopmentSeedOverrides(['prisma/seed-development.ts'])).not.toThrow();
    expect(() =>
      rejectDevelopmentSeedOverrides([
        'prisma/seed-development.ts',
        '--database-url',
        developmentUrl,
      ]),
    ).toThrow(/target overrides/);
  });

  it('checks current_database before any seed write', async () => {
    await expect(
      assertDevelopmentDatabase({
        $queryRaw: async <T>() => [{ name: 'smart_kitchen' }] as T,
      }),
    ).resolves.toBeUndefined();
    await expect(
      assertDevelopmentDatabase({
        $queryRaw: async <T>() => [{ name: 'smart_kitchen_migration_test' }] as T,
      }),
    ).rejects.toThrow(/not smart_kitchen/);
  });

  function expectSafeUrlError(readUrl: () => string) {
    let message = '';
    try {
      readUrl();
    } catch (error) {
      message = error instanceof Error ? error.message : '';
    }
    expect(message.length).toBeGreaterThan(0);
    expect(message).not.toContain(secret);
    expect(message).not.toContain('postgresql://');
  }
});

function restore(
  name: 'MIGRATION_TEST_DATABASE_URL' | 'DATABASE_URL' | 'NODE_ENV',
  value: string | undefined,
) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}
