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
