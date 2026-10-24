import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import {
  applySeed,
  lockSeedTransaction,
  SEED_ADVISORY_CLASS_ID,
  SEED_ADVISORY_OBJECT_ID,
  SEED_KEY,
} from '../src/catalog/apply-seed';
import { SeedCatalog, SeedCatalogError, SeedRecipe } from '../src/catalog/seed-catalog';
import { openMigrationClient } from './migration-database';
import type { PrismaClient } from '../src/generated/prisma/client';

loadEnv({ path: path.resolve(__dirname, '../.env'), quiet: true });

let prisma: PrismaClient;

beforeAll(async () => {
  prisma = openMigrationClient();
  const rows = await prisma.$queryRaw<Array<{ name: string }>>`
    SELECT current_database() AS name
  `;
  if (rows[0]?.name !== 'smart_kitchen_migration_test') {
    throw new Error('Connected to a database other than the migration test database.');
  }
  await deleteFixtures();
});

afterAll(async () => {
  await deleteFixtures();
  await prisma.user.deleteMany({
    where: { recipes: { none: {} }, id: { in: fixtureUserIds } },
  });
  await prisma.$disconnect();
});

const fixtureUserIds: string[] = [];

describe('development seed ownership', () => {
  it('leaves unmarked fixture samples unchanged', async () => {
    const slug = 'migration-check-seed-legacy';
    const ingredient = await prisma.ingredient.create({
      data: {
        slug: `${slug}-salt`,
        originalLanguage: 'EN',
        translations: {
          create: [
            { language: 'EN', name: 'Legacy salt' },
            { language: 'AR', name: 'ملح قديم' },
          ],
        },
      },
    });
    const recipe = await prisma.recipe.create({
      data: {
        slug,
        ownerId: null,
        originalLanguage: 'EN',
        publicationStatus: 'PUBLISHED',
        visibility: 'PUBLIC',
        difficulty: 'EASY',
        prepTimeMinutes: 4,
        translations: {
          create: { language: 'EN', title: 'Legacy sample', description: 'Keep this' },
        },
      },
    });

    await expect(applySeed(prisma, oneRecipeCatalog(slug, 'Replacement'))).rejects.toBeInstanceOf(
      SeedCatalogError,
    );

    await expect(prisma.recipe.findUnique({ where: { id: recipe.id } })).resolves.toMatchObject({
      id: recipe.id,
      ownerId: null,
      publicationStatus: 'PUBLISHED',
      visibility: 'PUBLIC',
      prepTimeMinutes: 4,
    });
    await expect(
      prisma.recipeTranslation.findMany({ where: { recipeId: recipe.id } }),
    ).resolves.toEqual([
      expect.objectContaining({ language: 'EN', title: 'Legacy sample', description: 'Keep this' }),
    ]);
    await expect(
      prisma.ingredient.findUnique({
        where: { id: ingredient.id },
        include: { translations: { orderBy: { language: 'asc' } } },
      }),
    ).resolves.toMatchObject({
      originalLanguage: 'EN',
      translations: [
        expect.objectContaining({ language: 'EN', name: 'Legacy salt' }),
        expect.objectContaining({ language: 'AR', name: 'ملح قديم' }),
      ],
    });
    await expect(
      prisma.seedProvenance.count({ where: { entityId: { in: [recipe.id, ingredient.id] } } }),
    ).resolves.toBe(0);
  });

  it('leaves an unmarked ownerless recipe private', async () => {
    const privateRecipe = await prisma.recipe.create({
      data: {
        slug: 'migration-check-seed-private',
        ownerId: null,
        originalLanguage: 'EN',
        publicationStatus: 'DRAFT',
        visibility: 'PRIVATE',
        difficulty: 'HARD',
        prepTimeMinutes: 9,
        cookTimeMinutes: 8,
        servings: 3,
        translations: {
          create: { language: 'EN', title: 'Private draft', description: 'Leave private' },
        },
      },
    });

    await expect(
      applySeed(prisma, oneRecipeCatalog('migration-check-seed-private', 'Replacement')),
    ).rejects.toBeInstanceOf(SeedCatalogError);

    await expect(prisma.recipe.findUnique({ where: { id: privateRecipe.id } })).resolves.toMatchObject({
      ownerId: null,
      publicationStatus: 'DRAFT',
      visibility: 'PRIVATE',
      difficulty: 'HARD',
      prepTimeMinutes: 9,
    });
    await expect(
      prisma.recipeTranslation.findMany({ where: { recipeId: privateRecipe.id } }),
    ).resolves.toEqual([
      expect.objectContaining({ title: 'Private draft', description: 'Leave private' }),
    ]);
    await expect(
      prisma.seedProvenance.count({ where: { entityId: privateRecipe.id } }),
    ).resolves.toBe(0);
    await expect(
      prisma.ingredient.findUnique({ where: { slug: 'migration-check-seed-private-salt' } }),
    ).resolves.toBeNull();
  });

  it('leaves unmarked same-language catalog rows and translations unchanged', async () => {
    const ingredient = await prisma.ingredient.create({
      data: {
        slug: 'migration-check-seed-spice',
        originalLanguage: 'EN',
        translations: { create: { language: 'EN', name: 'Keep spice' } },
      },
    });
    const country = await prisma.country.create({
      data: {
        slug: 'migration-check-seed-land',
        originalLanguage: 'EN',
        translations: { create: { language: 'EN', name: 'Keep land' } },
      },
    });
    const catalog = oneRecipeCatalog('migration-check-seed-same-language', 'New recipe');
    const [firstRecipe] = catalog.recipes;
    if (!firstRecipe) throw new Error('fixture catalog is incomplete');
    const colliding: SeedCatalog = {
      ...catalog,
      countries: [
        {
          slug: 'migration-check-seed-land',
          originalLanguage: 'EN',
          names: { EN: 'Replaced land' },
        },
      ],
      ingredients: [
        {
          slug: 'migration-check-seed-spice',
          originalLanguage: 'EN',
          names: { EN: 'Replaced spice' },
          compatibleTags: [],
          bakingMass: false,
        },
      ],
      recipes: [
        {
          ...firstRecipe,
          countries: ['migration-check-seed-land'],
          lines: [
            {
              ingredientSlug: 'migration-check-seed-spice',
              position: 1,
              amount: 'TO_TASTE',
            },
          ],
        },
      ],
    };

    await expect(applySeed(prisma, colliding)).rejects.toBeInstanceOf(SeedCatalogError);

    await expect(
      prisma.ingredient.findUnique({
        where: { id: ingredient.id },
        include: { translations: true },
      }),
    ).resolves.toMatchObject({
      originalLanguage: 'EN',
      translations: [expect.objectContaining({ language: 'EN', name: 'Keep spice' })],
    });
    await expect(
      prisma.country.findUnique({
        where: { id: country.id },
        include: { translations: true },
      }),
    ).resolves.toMatchObject({
      originalLanguage: 'EN',
      translations: [expect.objectContaining({ language: 'EN', name: 'Keep land' })],
    });
    await expect(
      prisma.seedProvenance.count({ where: { entityId: { in: [ingredient.id, country.id] } } }),
    ).resolves.toBe(0);
  });

  it('updates seed-owned rows again without changing their ids', async () => {
    const slug = 'migration-check-seed-stable';
    await applySeed(prisma, oneRecipeCatalog(slug, 'First title'));
    const firstRecipe = await prisma.recipe.findUniqueOrThrow({ where: { slug } });
    const firstIngredient = await prisma.ingredient.findUniqueOrThrow({
      where: { slug: `${slug}-salt` },
    });

    await applySeed(prisma, oneRecipeCatalog(slug, 'Second title'));

    const secondRecipe = await prisma.recipe.findUniqueOrThrow({
      where: { slug },
      include: { translations: true },
    });
    const secondIngredient = await prisma.ingredient.findUniqueOrThrow({
      where: { slug: `${slug}-salt` },
    });
    expect(secondRecipe.id).toBe(firstRecipe.id);
    expect(secondIngredient.id).toBe(firstIngredient.id);
    expect(secondRecipe.ownerId).toBeNull();
    expect(secondRecipe.translations).toEqual([
      expect.objectContaining({ language: 'EN', title: 'Second title' }),
    ]);
    await expect(
      prisma.seedProvenance.findMany({
        where: { entityId: { in: [firstRecipe.id, firstIngredient.id] } },
        orderBy: { entityType: 'asc' },
      }),
    ).resolves.toEqual([
      expect.objectContaining({ seedKey: SEED_KEY, entityType: 'ingredient', entityId: firstIngredient.id }),
      expect.objectContaining({ seedKey: SEED_KEY, entityType: 'recipe', entityId: firstRecipe.id }),
    ]);
    await expect(prisma.recipeTranslation.count({ where: { recipeId: firstRecipe.id } })).resolves.toBe(1);
  });

  it('does not change a user-owned recipe even when seed provenance exists', async () => {
    const user = await prisma.user.create({ data: {} });
    fixtureUserIds.push(user.id);
    const owned = await prisma.recipe.create({
      data: {
        slug: 'migration-check-seed-owned',
        ownerId: user.id,
        originalLanguage: 'EN',
        publicationStatus: 'DRAFT',
        visibility: 'PRIVATE',
        difficulty: 'EASY',
        translations: { create: { language: 'EN', title: 'Mine', description: 'Keep' } },
      },
    });
    await prisma.seedProvenance.create({
      data: { seedKey: SEED_KEY, entityType: 'recipe', entityId: owned.id },
    });

    await expect(
      applySeed(prisma, oneRecipeCatalog('migration-check-seed-owned', 'Replacement')),
    ).rejects.toBeInstanceOf(SeedCatalogError);

    await expect(prisma.recipe.findUnique({ where: { id: owned.id } })).resolves.toMatchObject({
      ownerId: user.id,
      publicationStatus: 'DRAFT',
      visibility: 'PRIVATE',
    });
    await expect(
      prisma.recipeTranslation.findMany({ where: { recipeId: owned.id } }),
    ).resolves.toEqual([
      expect.objectContaining({ language: 'EN', title: 'Mine', description: 'Keep' }),
    ]);
  });

  it('rolls back the whole seed when a later row collides', async () => {
    const blocker = await prisma.recipe.create({
      data: {
        slug: 'migration-check-seed-rollback-block',
        ownerId: null,
        originalLanguage: 'EN',
        publicationStatus: 'DRAFT',
        visibility: 'PRIVATE',
        difficulty: 'EASY',
        translations: { create: { language: 'EN', title: 'Blocker', description: 'Stay' } },
      },
    });
    const catalog = oneRecipeCatalog('migration-check-seed-rollback-new', 'Created first');
    const [createdFirst] = catalog.recipes;
    const [createdIngredient] = catalog.ingredients;
    if (!createdFirst || !createdIngredient) throw new Error('fixture catalog is incomplete');
    const colliding: SeedCatalog = {
      ...catalog,
      recipes: [
        createdFirst,
        recipe('migration-check-seed-rollback-block', 'Should not land', createdIngredient.slug),
      ],
    };

    await expect(applySeed(prisma, colliding)).rejects.toBeInstanceOf(SeedCatalogError);

    await expect(
      prisma.recipe.findUnique({ where: { slug: 'migration-check-seed-rollback-new' } }),
    ).resolves.toBeNull();
    await expect(
      prisma.ingredient.findUnique({ where: { slug: 'migration-check-seed-rollback-new-salt' } }),
    ).resolves.toBeNull();
    await expect(prisma.recipe.findUnique({ where: { id: blocker.id } })).resolves.toMatchObject({
      publicationStatus: 'DRAFT',
      visibility: 'PRIVATE',
    });
    await expect(
      prisma.recipeTranslation.findFirst({ where: { recipeId: blocker.id } }),
    ).resolves.toMatchObject({ title: 'Blocker' });
  });

  it('does not pass an ownership check while another seed holds the lock', async () => {
    const slug = 'migration-check-seed-race';
    const catalog = oneRecipeCatalog(slug, 'Racer replacement');
    const blocker = openMigrationClient();
    let releaseHold = () => {};
    let markAcquired = () => {};
    const acquired = new Promise<void>((resolve) => {
      markAcquired = resolve;
    });
    const hold = blocker.$transaction(
      async (tx) => {
        await lockSeedTransaction(tx);
        markAcquired();
        await new Promise<void>((resolve) => {
          releaseHold = resolve;
        });
      },
      { timeout: 20_000 },
    );

    let seedPromise: Promise<void> | undefined;
    try {
      await acquired;
      seedPromise = applySeed(prisma, catalog);
      await waitForWaitingSeedLock();
      await prisma.recipe.create({
        data: {
          slug,
          ownerId: null,
          originalLanguage: 'EN',
          publicationStatus: 'DRAFT',
          visibility: 'PRIVATE',
          difficulty: 'EASY',
          translations: { create: { language: 'EN', title: 'Racer', description: 'Stay' } },
        },
      });
      releaseHold();
      await expect(seedPromise).rejects.toBeInstanceOf(SeedCatalogError);
      await expect(prisma.ingredient.findUnique({ where: { slug: `${slug}-salt` } })).resolves.toBeNull();
      await expect(prisma.recipe.findUnique({ where: { slug }, include: { translations: true } })).resolves.toMatchObject({
        publicationStatus: 'DRAFT',
        visibility: 'PRIVATE',
        translations: [expect.objectContaining({ title: 'Racer' })],
      });
      const raced = await prisma.recipe.findUniqueOrThrow({ where: { slug } });
      await expect(prisma.seedProvenance.count({ where: { entityId: raced.id } })).resolves.toBe(0);
    } finally {
      releaseHold();
      await hold.catch(() => undefined);
      await seedPromise?.catch(() => undefined);
      await blocker.$disconnect();
    }
  });
});

async function waitForWaitingSeedLock(): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < 8_000) {
    const rows = await prisma.$queryRaw<Array<{ waiting: number }>>`
      SELECT count(*)::int AS waiting
      FROM pg_locks
      WHERE locktype = 'advisory'
        AND granted = false
        AND classid = ${SEED_ADVISORY_CLASS_ID}
        AND objid = ${SEED_ADVISORY_OBJECT_ID}
    `;
    if (Number(rows[0]?.waiting ?? 0) > 0) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('Seed did not wait on the advisory lock.');
}

async function deleteFixtures(): Promise<void> {
  const [recipes, ingredients, countries] = await Promise.all([
    prisma.recipe.findMany({
      where: { slug: { startsWith: 'migration-check-seed-' } },
      select: { id: true },
    }),
    prisma.ingredient.findMany({
      where: { slug: { startsWith: 'migration-check-seed-' } },
      select: { id: true },
    }),
    prisma.country.findMany({
      where: { slug: { startsWith: 'migration-check-seed-' } },
      select: { id: true },
    }),
  ]);
  const ids = [...recipes, ...ingredients, ...countries].map((row) => row.id);
  if (ids.length > 0) {
    await prisma.seedProvenance.deleteMany({ where: { entityId: { in: ids } } });
  }
  await prisma.recipe.deleteMany({ where: { slug: { startsWith: 'migration-check-seed-' } } });
  await prisma.ingredient.deleteMany({ where: { slug: { startsWith: 'migration-check-seed-' } } });
  await prisma.country.deleteMany({ where: { slug: { startsWith: 'migration-check-seed-' } } });
}

function oneRecipeCatalog(slug: string, title: string): SeedCatalog {
  const ingredientSlug = `${slug}-salt`;
  return {
    countries: [],
    cuisines: [],
    dietaryTags: [],
    ingredients: [
      {
        slug: ingredientSlug,
        originalLanguage: 'EN',
        names: { EN: 'Fixture salt' },
        compatibleTags: [],
        bakingMass: false,
      },
    ],
    recipes: [recipe(slug, title, ingredientSlug)],
  };
}

function recipe(slug: string, title: string, ingredientSlug: string): SeedRecipe {
  return {
    slug,
    originalLanguage: 'EN',
    publicationStatus: 'PUBLISHED',
    visibility: 'PUBLIC',
    prepTimeMinutes: 1,
    cookTimeMinutes: 1,
    servings: 1,
    difficulty: 'EASY',
    baking: false,
    countries: [],
    cuisines: [],
    translations: { EN: { title, description: 'Fixture' } },
    lines: [{ ingredientSlug, position: 1, amount: 'TO_TASTE' }],
    steps: [{ position: 1, instructions: { EN: 'Leave it.' } }],
  };
}
