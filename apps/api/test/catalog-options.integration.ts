import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { migrationTestUrl } from './migration-database';

loadEnv({ path: path.resolve(__dirname, '../.env'), quiet: true });

const prefix = 'api-check-catalog-';
const previousDatabaseUrl = process.env.DATABASE_URL;
const testDatabaseUrl = migrationTestUrl();

let prisma: PrismaClient;
let app: INestApplication<App>;
let server: ReturnType<INestApplication<App>['getHttpServer']>;

jest.setTimeout(120000);

beforeAll(async () => {
  prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: testDatabaseUrl }),
  });
  await expectDatabase(prisma, 'fixture client');
  process.env.DATABASE_URL = testDatabaseUrl;
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  app = moduleFixture.createNestApplication({ logger: false });
  await app.init();
  server = app.getHttpServer();
  await expectDatabase(app.get(PrismaService), 'API client');
  await removeFixtures();
  await createFixtures();
});

afterAll(async () => {
  if (prisma) {
    await removeFixtures();
    await prisma.$disconnect();
  }
  if (app) await app.close();
  if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = previousDatabaseUrl;
});

describe('public catalog options', () => {
  it('returns translated options only for publicly listed recipes', async () => {
    const countries = await request(server).get('/countries').query({ lang: 'ar' }).expect(200);
    const bySlug = new Map(
      (countries.body.items as Array<{ slug: string; name: string; language: string; fallbackUsed: boolean; code: string | null }>).map(
        (item) => [item.slug, item],
      ),
    );
    expect(bySlug.get(`${prefix}public`)).toMatchObject({
      name: 'بلد عام',
      language: 'ar',
      fallbackUsed: false,
      code: 'Z9',
    });
    expect(bySlug.get(`${prefix}fallback`)).toMatchObject({
      name: 'Fallback land',
      language: 'en',
      fallbackUsed: true,
      code: null,
    });
    expect(bySlug.has(`${prefix}private`)).toBe(false);
    expect(bySlug.has(`${prefix}incomplete`)).toBe(false);

    const names = (countries.body.items as Array<{ name: string }>).map((item) => item.name);
    expect(names).toEqual(
      [...names].sort((left, right) => left.localeCompare(right, 'ar', { sensitivity: 'base' })),
    );

    const cuisines = await request(server).get('/cuisines').expect(200);
    const cuisineSlugs = (cuisines.body.items as Array<{ slug: string }>).map((item) => item.slug);
    expect(cuisineSlugs).toContain(`${prefix}public-cuisine`);
    expect(cuisineSlugs).not.toContain(`${prefix}draft-cuisine`);

    const tags = await request(server).get('/dietary-tags').query({ lang: 'en' }).expect(200);
    const tag = (tags.body.items as Array<{ slug: string; name: string; fallbackUsed: boolean }>).find(
      (item) => item.slug === `${prefix}public-tag`,
    );
    expect(tag).toMatchObject({ name: 'Public diet', fallbackUsed: false });
    expect(
      (tags.body.items as Array<{ slug: string }>).some((item) => item.slug === `${prefix}hidden-tag`),
    ).toBe(false);
  });

  it('rejects unknown parameters and unsupported languages', async () => {
    await request(server).get('/countries').query({ sort: 'name' }).expect(400);
    await request(server).get('/cuisines').query({ lang: 'fr' }).expect(400);
    await request(server).get('/dietary-tags').query({ page: '1' }).expect(400);
  });
});

async function expectDatabase(client: { $queryRaw: PrismaClient['$queryRaw'] }, label: string) {
  const rows = await client.$queryRaw<Array<{ name: string }>>`
    SELECT current_database() AS name
  `;
  if (rows[0]?.name !== 'smart_kitchen_migration_test') {
    throw new Error(`${label} is not connected to the migration test database.`);
  }
}

async function removeFixtures(): Promise<void> {
  await prisma.recipe.deleteMany({ where: { slug: { startsWith: prefix } } });
  await prisma.country.deleteMany({ where: { slug: { startsWith: prefix } } });
  await prisma.cuisine.deleteMany({ where: { slug: { startsWith: prefix } } });
  await prisma.dietaryTag.deleteMany({ where: { slug: { startsWith: prefix } } });
}

async function createFixtures(): Promise<void> {
  const country = (slug: string, english: string, arabic?: string, code?: string) =>
    prisma.country.create({
      data: {
        slug,
        code,
        originalLanguage: 'EN',
        translations: {
          create: [
            { language: 'EN', name: english },
            ...(arabic ? [{ language: 'AR' as const, name: arabic }] : []),
          ],
        },
      },
    });
  const published = await country(`${prefix}public`, 'Public land', 'بلد عام', 'Z9');
  const fallback = await country(`${prefix}fallback`, 'Fallback land');
  const hidden = await country(`${prefix}private`, 'Private land', 'بلد خاص', 'Z8');
  const incomplete = await country(`${prefix}incomplete`, 'Incomplete land');
  const cuisine = await prisma.cuisine.create({
    data: {
      slug: `${prefix}public-cuisine`,
      originalLanguage: 'EN',
      translations: { create: [{ language: 'EN', name: 'Public cuisine' }] },
    },
  });
  const draftCuisine = await prisma.cuisine.create({
    data: {
      slug: `${prefix}draft-cuisine`,
      originalLanguage: 'EN',
      translations: { create: [{ language: 'EN', name: 'Draft cuisine' }] },
    },
  });
  const tag = await prisma.dietaryTag.create({
    data: {
      slug: `${prefix}public-tag`,
      originalLanguage: 'EN',
      translations: { create: [{ language: 'EN', name: 'Public diet' }] },
    },
  });
  const hiddenTag = await prisma.dietaryTag.create({
    data: {
      slug: `${prefix}hidden-tag`,
      originalLanguage: 'EN',
      translations: { create: [{ language: 'EN', name: 'Hidden diet' }] },
    },
  });

  await recipe(`${prefix}listed`, 'PUBLISHED', 'PUBLIC', 'Listed stew', published.id, cuisine.id, tag.id);
  await recipe(`${prefix}secret`, 'PUBLISHED', 'PRIVATE', 'Secret stew', hidden.id, draftCuisine.id, hiddenTag.id);
  await recipe(`${prefix}blank`, 'PUBLISHED', 'PUBLIC', '   ', incomplete.id, cuisine.id, tag.id);
  await recipe(`${prefix}fallback-recipe`, 'PUBLISHED', 'PUBLIC', 'Fallback stew', fallback.id, cuisine.id, tag.id);
}

async function recipe(
  slug: string,
  publicationStatus: 'DRAFT' | 'PUBLISHED',
  visibility: 'PRIVATE' | 'PUBLIC',
  title: string,
  countryId: string,
  cuisineId: string,
  dietaryTagId: string,
): Promise<void> {
  await prisma.recipe.create({
    data: {
      slug,
      originalLanguage: 'EN',
      publicationStatus,
      visibility,
      difficulty: 'EASY',
      translations: { create: [{ language: 'EN', title, description: '' }] },
      countries: { create: [{ countryId }] },
      cuisines: { create: [{ cuisineId }] },
      dietaryTags: { create: [{ dietaryTagId }] },
    },
  });
}
