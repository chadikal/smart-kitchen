const allowedDatabase = 'smart_kitchen_migration_test';
const loopbackHosts = new Set(['127.0.0.1', 'localhost', '::1']);

export function migrationTestUrl(): string {
  const raw = process.env.MIGRATION_TEST_DATABASE_URL;
  if (!raw) {
    throw new Error(
      'MIGRATION_TEST_DATABASE_URL is required. The application DATABASE_URL is not used.',
    );
  }
  const url = new URL(raw);
  if (!isAllowedTestTarget(url)) {
    throw new Error(
      'MIGRATION_TEST_DATABASE_URL must use postgresql on a loopback host, port 5432, database smart_kitchen_migration_test, and schema=public, with no other connection options.',
    );
  }
  const applicationUrl = process.env.DATABASE_URL;
  if (applicationUrl) {
    const applicationDatabase = decodeURIComponent(
      new URL(applicationUrl).pathname.replace(/^\//, ''),
    );
    if (applicationDatabase === allowedDatabase) {
      throw new Error(
        'Refusing to run because DATABASE_URL points at the test database.',
      );
    }
  }
  return raw;
}

const applicationDatabase = 'smart_kitchen';

export function developmentDatabaseUrl(): string {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Development seed refuses to run when NODE_ENV is production.');
  }
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Development seed requires NODE_ENV=development.');
  }
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error('DATABASE_URL is required for the development seed.');
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('DATABASE_URL must be a PostgreSQL connection URL.');
  }
  const database = decodeURIComponent(url.pathname.replace(/^\//, ''));
  if (database === allowedDatabase) {
    throw new Error('Development seed refuses the migration-test database.');
  }
  if (!isDevelopmentTarget(url)) {
    throw new Error(
      'Development seed requires postgresql on a loopback host, port 5432, database smart_kitchen, and schema=public, with no other connection options.',
    );
  }
  return raw;
}

export function rejectDevelopmentSeedOverrides(argv: readonly string[]): void {
  const extras = argv.filter((argument) => argument !== 'prisma/seed-development.ts');
  if (extras.length > 0) {
    throw new Error('Development seed does not accept target overrides.');
  }
}

export async function assertDevelopmentDatabase(client: {
  $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: unknown[]): Promise<T>;
}): Promise<void> {
  const rows = await client.$queryRaw<Array<{ name?: string }>>`SELECT current_database() AS name`;
  if (rows[0]?.name !== applicationDatabase) {
    throw new Error('Refusing to seed because the connected database is not smart_kitchen.');
  }
}

function isDevelopmentTarget(url: URL): boolean {
  const database = decodeURIComponent(url.pathname.replace(/^\//, ''));
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  const parameters = [...url.searchParams.keys()];
  return (
    url.protocol === 'postgresql:' &&
    url.hash === '' &&
    loopbackHosts.has(host) &&
    url.port === '5432' &&
    database === applicationDatabase &&
    parameters.length === 1 &&
    parameters[0] === 'schema' &&
    url.searchParams.get('schema') === 'public'
  );
}

function isAllowedTestTarget(url: URL): boolean {
  const database = decodeURIComponent(url.pathname.replace(/^\//, ''));
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  const parameters = [...url.searchParams.keys()];
  return (
    url.protocol === 'postgresql:' &&
    url.hash === '' &&
    loopbackHosts.has(host) &&
    url.port === '5432' &&
    database === allowedDatabase &&
    parameters.length === 1 &&
    parameters[0] === 'schema' &&
    url.searchParams.get('schema') === 'public'
  );
}
