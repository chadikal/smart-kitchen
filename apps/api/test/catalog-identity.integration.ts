import { config as loadEnv } from 'dotenv';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { PrismaClient } from '../src/generated/prisma/client';
import { openMigrationClient } from './migration-database';

loadEnv({ path: path.resolve(__dirname, '../.env'), quiet: true });

const prefix = `identity-${randomUUID()}`;
const userIds: string[] = [];
let prisma: PrismaClient;

beforeAll(async () => {
  prisma = openMigrationClient();
  const rows = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
  if (rows[0]?.name !== 'smart_kitchen_migration_test') {
    throw new Error('Connected to a database other than the migration test database.');
  }
});

afterAll(async () => {
  await prisma.recipe.deleteMany({ where: { slug: { startsWith: prefix } } });
  if (userIds.length > 0) await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

describe('user identity migration', () => {
  it('keeps an existing user id and recipe owner when a subject is linked', async () => {
    const owner = await prisma.user.create({ data: {} });
    userIds.push(owner.id);
    const recipe = await prisma.recipe.create({
      data: { slug: `${prefix}-owned`, originalLanguage: 'EN', ownerId: owner.id },
    });
    const subject = randomUUID();
    const linked = await prisma.user.update({
      where: { id: owner.id },
      data: { authSubject: subject, displayName: 'Nour', preferredLanguage: 'AR', welcomeCompletedAt: new Date() },
    });
    const stored = await prisma.recipe.findUniqueOrThrow({ where: { id: recipe.id } });

    expect(linked.id).toBe(owner.id);
    expect(linked.authSubject).toBe(subject);
    expect(linked.welcomeCompletedAt).not.toBeNull();
    expect(stored.ownerId).toBe(owner.id);
  });

  it('rejects a second user with the same subject and still allows users without one', async () => {
    const subject = randomUUID();
    const first = await prisma.user.create({ data: { authSubject: subject } });
    const unsigned = await prisma.user.create({ data: {} });
    userIds.push(first.id, unsigned.id);

    await expect(prisma.user.create({ data: { authSubject: subject } })).rejects.toThrow();
    expect(unsigned.authSubject).toBeNull();
    expect(unsigned.id).not.toBe(first.id);
  });
});
