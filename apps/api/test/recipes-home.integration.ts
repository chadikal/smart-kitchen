import path from 'node:path';
import { config } from 'dotenv';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { openMigrationClient, migrationTestUrl } from './migration-database';
import { PrismaClient } from '../src/generated/prisma/client';
import { homeSelection } from '../src/recipes/home-selection';

config({ path: path.resolve(__dirname, '../.env'), quiet: true });
const previousUrl = process.env.DATABASE_URL;
const previousMode = process.env.NODE_ENV;
let prisma: PrismaClient;
let app: INestApplication;
const fixtureIds: string[] = [];
const slugs = [homeSelection.featured[0], ...homeSelection.picks, 'home-test-quick', 'home-test-unknown', 'home-test-slow'];
jest.setTimeout(120000);

beforeAll(async () => {
  prisma = openMigrationClient();
  // Own fixtures only; never adopt a pre-existing recipe with a curated slug.
  if (await prisma.recipe.count({ where: { slug: { in: slugs } } })) throw new Error('Home fixtures conflict with existing rows.');
  for (const slug of slugs) { const row = await prisma.recipe.create({ data: {
    slug, originalLanguage: 'EN', publicationStatus: 'PUBLISHED', visibility: slug === homeSelection.picks[1] ? 'PRIVATE' : 'PUBLIC',
    developmentOnly: slug === homeSelection.featured[0], difficulty: null,
    prepTimeMinutes: slug === 'home-test-unknown' ? null : 5, cookTimeMinutes: slug === 'home-test-slow' ? 60 : 10,
    translations: { create: { language: 'EN', title: slug, description: '' } },
  } }); fixtureIds.push(row.id); }
  process.env.DATABASE_URL = migrationTestUrl();
  process.env.NODE_ENV = 'development';
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = module.createNestApplication({ logger: false });
  await app.init();
});

afterAll(async () => {
  if (app) await app.close();
  if (prisma) { await prisma.recipe.deleteMany({ where: { id: { in: fixtureIds } } }); await prisma.$disconnect(); }
  if (previousUrl === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previousUrl;
  if (previousMode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousMode;
});

it('returns curated order, known quick times and no duplicates through the public HTTP route', async () => {
  const response = await request(app.getHttpServer()).get('/recipes/home?lang=ar').expect(200);
  const body = response.body;
  expect(body.featured.slug).toBe(homeSelection.featured[0]);
  expect(body.featured.fallbackUsed).toBe(true);
  expect(body.picks.map((item: { slug: string }) => item.slug)).toEqual([homeSelection.picks[0], homeSelection.picks[2]]);
  const all = [body.featured, ...body.picks, ...body.quick, ...body.more];
  expect(new Set(all.map((item: { slug: string }) => item.slug)).size).toBe(all.length);
  expect(body.quick.every((item: { totalTimeMinutes: number | null }) => item.totalTimeMinutes !== null && item.totalTimeMinutes <= 30)).toBe(true);
  expect(body.quick.some((item: { slug: string }) => ['home-test-unknown', 'home-test-slow'].includes(item.slug))).toBe(false);
  expect(all.some((item: { slug: string }) => item.slug === homeSelection.picks[1])).toBe(false);
  await request(app.getHttpServer()).get('/recipes/home?lang=en&lang=ar').expect(400);
  await request(app.getHttpServer()).get('/recipes/home?page=1').expect(400);
});

it('rechecks curated visibility and original completeness and hides development content in production', async () => {
  process.env.NODE_ENV = 'production';
  let body = (await request(app.getHttpServer()).get('/recipes/home').expect(200)).body;
  expect(body.featured?.slug).not.toBe(homeSelection.featured[0]);
  await prisma.recipe.update({ where: { slug: homeSelection.picks[0] }, data: { publicationStatus: 'DRAFT' } });
  await prisma.recipeTranslation.updateMany({ where: { recipe: { slug: homeSelection.picks[2] } }, data: { title: ' ' } });
  body = (await request(app.getHttpServer()).get('/recipes/home').expect(200)).body;
  expect(body.picks).toEqual([]);
});
