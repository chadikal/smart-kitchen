import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { Prisma, PrismaClient } from '../src/generated/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { migrationTestUrl } from './migration-database';

loadEnv({ path: path.resolve(__dirname, '../.env'), quiet: true });

const prefix = 'api-check-recipe-';
const previousDatabaseUrl = process.env.DATABASE_URL;
const testDatabaseUrl = migrationTestUrl();

let prisma: PrismaClient;
let app: INestApplication<App>;
let server: ReturnType<INestApplication<App>['getHttpServer']>;
const hiddenIds = new Set<string>();

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

describe('public recipe API', () => {
  it('uses the same Unicode whitespace completeness rules in SQL and responses', async () => {
    const whitespace = '\t\n\r\u00a0\u2003\ufeff';
    const slug = `${prefix}whitespace`;
    const row = await prisma.recipe.create({ data: {
      slug, originalLanguage: 'EN', publicationStatus: 'PUBLISHED', visibility: 'PUBLIC', difficulty: 'EASY',
      translations: { create: [
        { language: 'EN', title: 'Whitespace fallback', description: '' },
        { language: 'AR', title: whitespace, description: '' },
      ] },
    } });
    const detail = await request(server).get(`/recipes/${slug}`).query({ lang: 'ar' }).expect(200);
    expect(detail.body).toMatchObject({ contentLanguage: 'en', fallbackUsed: true });
    const list = await request(server).get('/recipes').query({ lang: 'ar', q: 'Whitespace fallback' }).expect(200);
    expect(list.body.items.some((item: { slug: string }) => item.slug === slug)).toBe(true);
    await prisma.recipeTranslation.update({ where: { recipeId_language: { recipeId: row.id, language: 'EN' } }, data: { title: whitespace } });
    await request(server).get(`/recipes/${slug}`).query({ lang: 'ar' }).expect(404);
    await prisma.recipe.delete({ where: { id: row.id } });
  });

  it('returns the same 404 for private, draft, incomplete, and missing recipes', async () => {
    const hidden = [
      `${prefix}private`,
      `${prefix}draft-public`,
      `${prefix}draft-private`,
      `${prefix}invalid-original`,
      `${prefix}missing`,
    ];
    const first = await request(server).get(`/recipes/${hidden[0]}`).expect(404);
    for (const slug of hidden) {
      for (const lang of ['en', 'ar']) {
        const response = await request(server).get(`/recipes/${slug}`).query({ lang }).expect(404);
        expect(response.body).toEqual(first.body);
        expect(response.body).toEqual({
          statusCode: 404,
          message: 'Recipe not found',
          error: 'Not Found',
        });
      }
    }
  });

  it('lists only the published public recipe from the access fixtures', async () => {
    for (const lang of ['en', 'ar']) {
      const response = await request(server)
        .get('/recipes')
        .query({ cuisine: `${prefix}access`, lang, pageSize: '10' })
        .expect(200);
      expect(response.body.items.map((item: { slug: string }) => item.slug)).toEqual([
        `${prefix}public`,
      ]);
      expect(response.body.total).toBe(1);
      expect(response.body.items[0]).not.toHaveProperty('ingredients');
      expect(response.body.items[0]).not.toHaveProperty('steps');
      const serialized = JSON.stringify(response.body);
      for (const id of hiddenIds) expect(serialized).not.toContain(id);
    }
  });

  it('does not expose owner ids, database ids, or seed provenance', async () => {
    const response = await request(server).get(`/recipes/${prefix}public`).expect(200);
    const serialized = JSON.stringify(response.body);
    for (const id of hiddenIds) expect(serialized).not.toContain(id);
    expect(serialized).not.toContain('ownerId');
    expect(serialized).not.toContain('seedKey');
    expect(serialized).not.toContain('provenance');
    expect(response.body.slug).toBe(`${prefix}public`);
    expect(response.body.ingredients).toEqual([]);
    expect(response.body.steps).toEqual([{ position: 1, instruction: 'Cook.' }]);
  });

  it('serializes ordered lines, steps, and three-decimal quantities', async () => {
    const response = await request(server)
      .get(`/recipes/${prefix}measured`)
      .query({ lang: 'en' })
      .expect(200);
    expect(response.body).toMatchObject({
      slug: `${prefix}measured`,
      title: 'Measured cake',
      description: '',
      requestedLanguage: 'en',
      contentLanguage: 'en',
      fallbackUsed: false,
      originalLanguage: 'en',
      difficulty: 'MEDIUM',
      prepTimeMinutes: 10,
      cookTimeMinutes: 20,
      totalTimeMinutes: 30,
      servings: 4,
    });
    expect(response.body.steps).toEqual([
      { position: 1, instruction: 'First step' },
      { position: 2, instruction: 'Second step' },
    ]);
    expect(response.body.ingredients).toEqual([
      {
        position: 1,
        ingredientSlug: `${prefix}flour`,
        name: 'Flour',
        language: 'en',
        quantity: '12.500',
        unit: 'GRAM',
        qualitativeAmount: null,
        optional: false,
        note: 'sift',
      },
      {
        position: 2,
        ingredientSlug: `${prefix}salt`,
        name: 'Salt',
        language: 'en',
        quantity: null,
        unit: null,
        qualitativeAmount: 'TO_TASTE',
        optional: false,
        note: null,
      },
      {
        position: 3,
        ingredientSlug: `${prefix}parsley`,
        name: 'Parsley',
        language: 'en',
        quantity: '2.000',
        unit: 'PIECE',
        qualitativeAmount: null,
        optional: true,
        note: null,
      },
    ]);
    expect(typeof response.body.ingredients[0].quantity).toBe('string');

    const arabic = await request(server)
      .get(`/recipes/${prefix}measured`)
      .query({ lang: 'ar' })
      .expect(200);
    expect(arabic.body).toMatchObject({
      title: 'كيكة مقاسة',
      description: 'وصف',
      requestedLanguage: 'ar',
      contentLanguage: 'ar',
      fallbackUsed: false,
    });
    expect(arabic.body.steps).toEqual([
      { position: 1, instruction: 'الخطوة الأولى' },
      { position: 2, instruction: 'الخطوة الثانية' },
    ]);
    expect(arabic.body.ingredients[0]).toMatchObject({ name: 'طحين', language: 'ar', note: 'ينخل' });
    expect(arabic.body.ingredients[2]).toMatchObject({ note: 'طازج', optional: true });
  });

  it('falls back to Arabic-only content and discards an incomplete requested translation', async () => {
    const arabicOnly = await request(server)
      .get(`/recipes/${prefix}arabic-only`)
      .query({ lang: 'en' })
      .expect(200);
    expect(arabicOnly.body).toMatchObject({
      title: 'حلوى السميد الخاصة',
      requestedLanguage: 'en',
      contentLanguage: 'ar',
      fallbackUsed: true,
      originalLanguage: 'ar',
      steps: [{ position: 1, instruction: 'اطبخ السميد' }],
    });

    const partial = await request(server)
      .get(`/recipes/${prefix}partial-ar`)
      .query({ lang: 'ar' })
      .expect(200);
    expect(partial.body).toMatchObject({
      title: 'Complete english search',
      requestedLanguage: 'ar',
      contentLanguage: 'en',
      fallbackUsed: true,
      steps: [
        { position: 1, instruction: 'English one' },
        { position: 2, instruction: 'English two' },
      ],
    });
    expect(JSON.stringify(partial.body)).not.toContain('عنوان ناقص');
    expect(JSON.stringify(partial.body)).not.toContain('تعليمات عربية');
  });

  it('searches only the title of the selected translation', async () => {
    const cuisine = `${prefix}search`;
    await expectSlugs({ cuisine, q: 'LEMON' }, [`${prefix}bilingual`]);
    await expectSlugs({ cuisine, lang: 'ar', q: 'وعاء' }, [`${prefix}bilingual`]);
    await expectSlugs({ cuisine, q: 'وعاء' }, []);
    await expectSlugs({ cuisine, q: 'حلوى' }, [`${prefix}arabic-only`]);
    await expectSlugs({ cuisine, lang: 'ar', q: 'complete' }, [`${prefix}partial-ar`]);
    await expectSlugs({ cuisine, lang: 'ar', q: 'عنوان' }, []);
    await expectSlugs({ cuisine, q: 'hidden-description-token' }, []);
    await expectSlugs({ cuisine, q: 'Should stay hidden' }, []);
    await expectSlugs({ cuisine, q: '%' }, [`${prefix}percent`]);
  });

  it('paginates in title order and breaks ties by slug', async () => {
    const first = await request(server)
      .get('/recipes')
      .query({ cuisine: `${prefix}pages`, page: '1', pageSize: '1' })
      .expect(200);
    const second = await request(server)
      .get('/recipes')
      .query({ cuisine: `${prefix}pages`, page: '2', pageSize: '1' })
      .expect(200);
    const third = await request(server)
      .get('/recipes')
      .query({ cuisine: `${prefix}pages`, page: '3', pageSize: '1' })
      .expect(200);
    const past = await request(server)
      .get('/recipes')
      .query({ cuisine: `${prefix}pages`, page: '4', pageSize: '1' })
      .expect(200);
    expect(first.body.items[0].title).toBe('Alpha');
    expect(second.body.items[0].title).toBe('Bravo');
    expect(third.body.items[0].title).toBe('Charlie');
    expect(first.body.items[0].slug).toBe(`${prefix}page-c`);
    expect([first, second, third, past].map((response) => response.body.total)).toEqual([3, 3, 3, 3]);
    expect(past.body).toMatchObject({ items: [], page: 4, pageSize: 1, pageCount: 3 });

    const ties = await request(server)
      .get('/recipes')
      .query({ cuisine: `${prefix}ties`, pageSize: '10' })
      .expect(200);
    expect(ties.body.items.map((item: { slug: string }) => item.slug)).toEqual([
      `${prefix}tie-a`,
      `${prefix}tie-b`,
    ]);
  });

  it('applies every filter together and keeps the time boundary', async () => {
    const common = {
      cuisine: `${prefix}filters`,
      country: `${prefix}lebanon`,
      dietaryTag: `${prefix}vegan`,
      difficulty: 'MEDIUM',
      q: 'match',
      maxTotalMinutes: '30',
    };
    await expectSlugs(common, [`${prefix}filter-match`]);
    await expectSlugs({ ...common, maxTotalMinutes: '29' }, []);
    await expectSlugs(
      { cuisine: `${prefix}filters`, maxTotalMinutes: '30' },
      [`${prefix}filter-easy`, `${prefix}filter-match`, `${prefix}filter-other`],
    );
    await expectSlugs({ cuisine: `${prefix}filters`, difficulty: 'HARD' }, []);
    await expectSlugs({ cuisine: `${prefix}filters`, country: `${prefix}label-country` }, [
      `${prefix}filter-other`,
    ]);
    await expectSlugs({ cuisine: `${prefix}filters`, dietaryTag: `${prefix}vegan` }, [
      `${prefix}filter-easy`,
      `${prefix}filter-long`,
      `${prefix}filter-match`,
    ]);

    const zero = await request(server)
      .get('/recipes')
      .query({ cuisine: `${prefix}filters`, maxTotalMinutes: '0' })
      .expect(200);
    expect(zero.body).toMatchObject({ items: [], total: 0, pageCount: 0, page: 1, pageSize: 20 });
  });

  it('falls catalog labels back independently of the recipe language', async () => {
    const response = await request(server)
      .get(`/recipes/${prefix}labels`)
      .query({ lang: 'ar' })
      .expect(200);
    expect(response.body).toMatchObject({
      requestedLanguage: 'ar',
      contentLanguage: 'ar',
      fallbackUsed: false,
      title: 'وصفة التسميات',
    });
    expect(response.body.countries).toEqual([
      {
        slug: `${prefix}label-country`,
        name: 'Label country',
        language: 'en',
        code: 'QY',
      },
    ]);
    expect(response.body.cuisines).toEqual([
      {
        slug: `${prefix}label-fallback`,
        name: 'Fallback kitchen',
        language: 'en',
      },
      {
        slug: `${prefix}labels`,
        name: 'مطبخ',
        language: 'ar',
      },
    ]);
  });

  it('rejects malformed queries', async () => {
    const cases: Array<{ path: string; query?: Record<string, string | string[]>; field: string }> = [
      { path: '/recipes', query: { lang: 'fr' }, field: 'lang' },
      { path: '/recipes', query: { lang: 'EN' }, field: 'lang' },
      { path: '/recipes', query: { page: '0' }, field: 'page' },
      { path: '/recipes', query: { page: '1001' }, field: 'page' },
      { path: '/recipes', query: { pageSize: '51' }, field: 'pageSize' },
      { path: '/recipes', query: { page: '1.5' }, field: 'page' },
      { path: '/recipes', query: { difficulty: 'easy' }, field: 'difficulty' },
      { path: '/recipes', query: { difficulty: ['MEDIUM', 'EASY'] }, field: 'difficulty' },
      { path: '/recipes', query: { maxTotalMinutes: '-1' }, field: 'maxTotalMinutes' },
      { path: '/recipes', query: { maxTotalMinutes: '1.5' }, field: 'maxTotalMinutes' },
      { path: '/recipes', query: { maxTotalMinutes: '10081' }, field: 'maxTotalMinutes' },
      { path: '/recipes', query: { q: '   ' }, field: 'q' },
      { path: '/recipes', query: { country: 'Lebanon' }, field: 'country' },
      { path: '/recipes', query: { dietaryTag: 'a_b' }, field: 'dietaryTag' },
      { path: '/recipes', query: { sort: 'title' }, field: 'sort' },
      { path: '/recipes', query: { page: ['1', '2'] }, field: 'page' },
      { path: `/recipes/${prefix}public`, query: { ownerId: '1' }, field: 'ownerId' },
      { path: '/recipes/Not-A-Slug', field: 'slug' },
    ];
    for (const entry of cases) {
      const response = await request(server).get(entry.path).query(entry.query ?? {}).expect(400);
      expect(response.body.statusCode).toBe(400);
      expect(response.body.message).toContain(entry.field);
    }
  });

  it('keeps the health route independent of recipe queries', async () => {
    await request(server).get('/health').expect(200).expect({ status: 'ok' });
  });
});

async function expectSlugs(
  query: Record<string, string>,
  slugs: string[],
): Promise<void> {
  const response = await request(server).get('/recipes').query(query).expect(200);
  expect(response.body.items.map((item: { slug: string }) => item.slug)).toEqual(slugs);
}

async function expectDatabase(client: { $queryRaw: PrismaClient['$queryRaw'] }, label: string) {
  const rows = await client.$queryRaw<Array<{ name: string }>>`
    SELECT current_database() AS name
  `;
  if (rows[0]?.name !== 'smart_kitchen_migration_test') {
    throw new Error(`${label} is not connected to the migration test database.`);
  }
}

async function removeFixtures(): Promise<void> {
  const recipes = await prisma.recipe.findMany({
    where: { slug: { startsWith: prefix } },
    select: { id: true, ownerId: true },
  });
  const recipeIds = recipes.map((recipe) => recipe.id);
  const ownerIds = recipes.flatMap((recipe) => (recipe.ownerId ? [recipe.ownerId] : []));
  if (recipeIds.length > 0) {
    await prisma.seedProvenance.deleteMany({ where: { entityId: { in: recipeIds } } });
    await prisma.recipe.deleteMany({ where: { id: { in: recipeIds } } });
  }
  await prisma.country.deleteMany({ where: { slug: { startsWith: prefix } } });
  await prisma.cuisine.deleteMany({ where: { slug: { startsWith: prefix } } });
  await prisma.dietaryTag.deleteMany({ where: { slug: { startsWith: prefix } } });
  await prisma.ingredient.deleteMany({ where: { slug: { startsWith: prefix } } });
  if (ownerIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: ownerIds }, recipes: { none: {} } } });
  }
}

async function createFixtures(): Promise<void> {
  const lebanon = await catalog('country', `${prefix}lebanon`, 'Lebanon', 'لبنان', 'QZ');
  const labelCountry = await catalog('country', `${prefix}label-country`, 'Label country', undefined, 'QY');
  const access = await catalog('cuisine', `${prefix}access`, 'Access kitchen', 'مطبخ الوصول');
  const pages = await catalog('cuisine', `${prefix}pages`, 'Pages kitchen', 'مطبخ الصفحات');
  const ties = await catalog('cuisine', `${prefix}ties`, 'Ties kitchen', 'مطبخ الترتيب');
  const search = await catalog('cuisine', `${prefix}search`, 'Search kitchen', 'مطبخ البحث');
  const filters = await catalog('cuisine', `${prefix}filters`, 'Filter kitchen', 'مطبخ التصفية');
  const labels = await catalog('cuisine', `${prefix}labels`, 'Label kitchen', 'مطبخ');
  const labelFallback = await catalog('cuisine', `${prefix}label-fallback`, 'Fallback kitchen');
  const vegan = await catalog('dietaryTag', `${prefix}vegan`, 'Check vegan', 'نباتي فحص');
  await catalog('ingredient', `${prefix}flour`, 'Flour', 'طحين');
  await catalog('ingredient', `${prefix}salt`, 'Salt', 'ملح');
  await catalog('ingredient', `${prefix}parsley`, 'Parsley', 'بقدونس');
  const flour = await prisma.ingredient.findUniqueOrThrow({ where: { slug: `${prefix}flour` } });
  const salt = await prisma.ingredient.findUniqueOrThrow({ where: { slug: `${prefix}salt` } });
  const parsley = await prisma.ingredient.findUniqueOrThrow({ where: { slug: `${prefix}parsley` } });

  const owner = await prisma.user.create({ data: {} });
  hiddenIds.add(owner.id);
  const publicRecipe = await recipe({
    slug: `${prefix}public`,
    cuisineIds: [access],
    ownerId: owner.id,
    title: 'Public bowl',
  });
  hiddenIds.add(publicRecipe);
  await prisma.seedProvenance.create({
    data: { seedKey: `${prefix}not-a-seed`, entityType: 'recipe', entityId: publicRecipe },
  });
  await recipe({ slug: `${prefix}private`, cuisineIds: [access], visibility: 'PRIVATE', title: 'Private bowl' });
  await recipe({
    slug: `${prefix}draft-public`,
    cuisineIds: [access],
    publicationStatus: 'DRAFT',
    title: 'Draft public bowl',
  });
  await recipe({
    slug: `${prefix}draft-private`,
    cuisineIds: [access],
    publicationStatus: 'DRAFT',
    visibility: 'PRIVATE',
    title: 'Draft private bowl',
  });

  await recipe({ slug: `${prefix}page-c`, cuisineIds: [pages], title: 'Alpha' });
  await recipe({ slug: `${prefix}page-a`, cuisineIds: [pages], title: 'Bravo' });
  await recipe({ slug: `${prefix}page-b`, cuisineIds: [pages], title: 'Charlie' });
  await recipe({ slug: `${prefix}tie-b`, cuisineIds: [ties], title: 'Same title' });
  await recipe({ slug: `${prefix}tie-a`, cuisineIds: [ties], title: 'Same title' });

  await recipe({
    slug: `${prefix}bilingual`,
    cuisineIds: [search],
    title: 'Lemon search bowl',
    description: 'hidden-description-token',
    arabic: { title: 'وعاء بحث', description: 'وصف', instructions: ['حرّك'] },
  });
  await recipe({
    slug: `${prefix}arabic-only`,
    cuisineIds: [search],
    originalLanguage: 'AR',
    title: 'حلوى السميد الخاصة',
    instructions: ['اطبخ السميد'],
    arabic: null,
  });
  await recipe({
    slug: `${prefix}partial-ar`,
    cuisineIds: [search],
    title: 'Complete english search',
    instructions: ['English one', 'English two'],
    arabic: { title: 'عنوان ناقص', instructions: ['تعليمات عربية'] },
  });
  await recipe({
    slug: `${prefix}invalid-original`,
    cuisineIds: [search],
    originalLanguage: 'AR',
    title: 'أصل ناقص',
    instructions: ['   '],
    arabic: null,
    english: { title: 'Should stay hidden', instructions: ['Do not show'] },
  });
  await recipe({ slug: `${prefix}percent`, cuisineIds: [search], title: 'Percent % bowl' });

  await recipe({
    slug: `${prefix}filter-match`,
    cuisineIds: [filters],
    countryIds: [lebanon],
    dietaryTagIds: [vegan],
    difficulty: 'MEDIUM',
    prepTimeMinutes: 10,
    cookTimeMinutes: 20,
    title: 'Filter match stew',
  });
  await recipe({
    slug: `${prefix}filter-easy`,
    cuisineIds: [filters],
    countryIds: [lebanon],
    dietaryTagIds: [vegan],
    difficulty: 'EASY',
    prepTimeMinutes: 5,
    cookTimeMinutes: 5,
    title: 'Filter easy stew',
  });
  await recipe({
    slug: `${prefix}filter-long`,
    cuisineIds: [filters],
    countryIds: [lebanon],
    dietaryTagIds: [vegan],
    difficulty: 'MEDIUM',
    prepTimeMinutes: 40,
    cookTimeMinutes: 40,
    title: 'Filter long stew',
  });
  await recipe({
    slug: `${prefix}filter-other`,
    cuisineIds: [filters],
    countryIds: [labelCountry],
    difficulty: 'MEDIUM',
    prepTimeMinutes: 5,
    cookTimeMinutes: 5,
    title: 'Filter other match',
  });

  const measured = await recipe({
    slug: `${prefix}measured`,
    cuisineIds: [labels],
    difficulty: 'MEDIUM',
    prepTimeMinutes: 10,
    cookTimeMinutes: 20,
    servings: 4,
    title: 'Measured cake',
    description: '',
    instructions: ['First step', 'Second step'],
    arabic: {
      title: 'كيكة مقاسة',
      description: 'وصف',
      instructions: ['الخطوة الأولى', 'الخطوة الثانية'],
      notes: { 1: 'ينخل', 3: 'طازج' },
    },
    lines: [
      { position: 1, ingredientId: flour.id, quantity: '12.5', unit: 'GRAM', notes: { EN: 'sift' } },
      { position: 2, ingredientId: salt.id, qualitativeAmount: 'TO_TASTE' },
      {
        position: 3,
        ingredientId: parsley.id,
        quantity: '2',
        unit: 'PIECE',
        optional: true,
        notes: { EN: '   ' },
      },
    ],
  });
  hiddenIds.add(measured);
  hiddenIds.add(flour.id);
  hiddenIds.add(salt.id);
  hiddenIds.add(parsley.id);

  await recipe({
    slug: `${prefix}labels`,
    cuisineIds: [labelFallback, labels],
    countryIds: [labelCountry],
    originalLanguage: 'AR',
    title: 'وصفة التسميات',
    instructions: ['حضّر'],
    arabic: null,
  });
}

async function catalog(
  kind: 'country' | 'cuisine' | 'dietaryTag' | 'ingredient',
  slug: string,
  english: string,
  arabic?: string,
  code?: string,
): Promise<string> {
  const translations = [
    { language: 'EN' as const, name: english },
    ...(arabic ? [{ language: 'AR' as const, name: arabic }] : []),
  ];
  if (kind === 'country') {
    const row = await prisma.country.create({
      data: { slug, code, originalLanguage: 'EN', translations: { create: translations } },
    });
    hiddenIds.add(row.id);
    return row.id;
  }
  if (kind === 'cuisine') {
    const row = await prisma.cuisine.create({
      data: { slug, originalLanguage: 'EN', translations: { create: translations } },
    });
    hiddenIds.add(row.id);
    return row.id;
  }
  if (kind === 'dietaryTag') {
    const row = await prisma.dietaryTag.create({
      data: { slug, originalLanguage: 'EN', translations: { create: translations } },
    });
    hiddenIds.add(row.id);
    return row.id;
  }
  const row = await prisma.ingredient.create({
    data: { slug, originalLanguage: 'EN', translations: { create: translations } },
  });
  hiddenIds.add(row.id);
  return row.id;
}

interface FixtureTranslation {
  title: string;
  description?: string;
  instructions?: string[];
  notes?: Record<number, string>;
}

async function recipe(input: {
  slug: string;
  cuisineIds: string[];
  countryIds?: string[];
  dietaryTagIds?: string[];
  ownerId?: string;
  originalLanguage?: 'EN' | 'AR';
  publicationStatus?: 'DRAFT' | 'PUBLISHED';
  visibility?: 'PRIVATE' | 'PUBLIC';
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  servings?: number;
  title: string;
  description?: string;
  instructions?: string[];
  arabic?: FixtureTranslation | null;
  english?: FixtureTranslation;
  lines?: Array<{
    position: number;
    ingredientId: string;
    quantity?: string;
    unit?: 'GRAM' | 'PIECE';
    qualitativeAmount?: 'TO_TASTE';
    optional?: boolean;
    notes?: Partial<Record<'EN' | 'AR', string>>;
  }>;
}): Promise<string> {
  const original = input.originalLanguage ?? 'EN';
  const english = input.english ?? {
    title: input.title,
    description: input.description,
    instructions: input.instructions,
  };
  const translations: Array<FixtureTranslation & { language: 'EN' | 'AR' }> = [];
  if (original === 'EN' || input.english) {
    translations.push({ language: 'EN', ...english });
  }
  if (input.arabic) translations.push({ language: 'AR', ...input.arabic });
  if (original === 'AR' && !translations.some((item) => item.language === 'AR')) {
    translations.push({
      language: 'AR',
      title: input.title,
      description: input.description,
      instructions: input.instructions,
    });
  }
  const stepCount = Math.max(
    0,
    ...translations.map((item) => item.instructions?.length ?? 0),
    input.lines ? 0 : 0,
  );
  const resolvedSteps = translations.some((item) => item.instructions)
    ? stepCount
    : 1;

  return prisma.$transaction(async (tx) => {
    const created = await tx.recipe.create({
      data: {
        slug: input.slug,
        ownerId: input.ownerId ?? null,
        originalLanguage: original,
        publicationStatus: input.publicationStatus ?? 'PUBLISHED',
        visibility: input.visibility ?? 'PUBLIC',
        difficulty: input.difficulty ?? 'EASY',
        prepTimeMinutes: input.prepTimeMinutes ?? 5,
        cookTimeMinutes: input.cookTimeMinutes ?? 5,
        servings: input.servings ?? 1,
        translations: {
          create: translations.map((item) => ({
            language: item.language,
            title: item.title,
            description: item.description ?? '',
          })),
        },
        countries: {
          create: (input.countryIds ?? []).map((countryId) => ({ countryId })),
        },
        cuisines: { create: input.cuisineIds.map((cuisineId) => ({ cuisineId })) },
        dietaryTags: {
          create: (input.dietaryTagIds ?? []).map((dietaryTagId) => ({ dietaryTagId })),
        },
      },
      include: { translations: true },
    });
    const translationId = new Map(created.translations.map((item) => [item.language, item.id]));
    for (let position = 1; position <= resolvedSteps; position += 1) {
      const step = await tx.recipeStep.create({ data: { recipeId: created.id, position } });
      for (const item of translations) {
        const instruction = item.instructions?.[position - 1] ?? (item.instructions ? undefined : 'Cook.');
        if (instruction === undefined) continue;
        const recipeTranslationId = translationId.get(item.language);
        if (!recipeTranslationId) continue;
        await tx.recipeStepTranslation.create({
          data: { recipeId: created.id, stepId: step.id, recipeTranslationId, instruction },
        });
      }
    }
    for (const line of input.lines ?? []) {
      const saved = await tx.recipeIngredient.create({
        data: {
          recipeId: created.id,
          ingredientId: line.ingredientId,
          position: line.position,
          quantity: line.quantity ? new Prisma.Decimal(line.quantity) : null,
          unit: line.unit ?? null,
          qualitativeAmount: line.qualitativeAmount ?? null,
          isOptional: line.optional ?? false,
        },
      });
      for (const [language, note] of Object.entries(line.notes ?? {})) {
        const recipeTranslationId = translationId.get(language as 'EN' | 'AR');
        if (!recipeTranslationId || note === undefined) continue;
        await tx.recipeIngredientTranslation.create({
          data: {
            recipeId: created.id,
            recipeIngredientId: saved.id,
            recipeTranslationId,
            note,
          },
        });
      }
    }
    for (const item of translations) {
      for (const [position, note] of Object.entries(item.notes ?? {})) {
        const recipeTranslationId = translationId.get(item.language);
        const ingredientLine = await tx.recipeIngredient.findUnique({
          where: { recipeId_position: { recipeId: created.id, position: Number(position) } },
        });
        if (!recipeTranslationId || !ingredientLine) continue;
        await tx.recipeIngredientTranslation.create({
          data: {
            recipeId: created.id,
            recipeIngredientId: ingredientLine.id,
            recipeTranslationId,
            note,
          },
        });
      }
    }
    return created.id;
  });
}
