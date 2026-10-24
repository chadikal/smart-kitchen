import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { Prisma, PrismaClient } from '../src/generated/prisma/client';
import { SEED_KEY } from '../src/catalog/apply-seed';
import {
  formatReconciliationReport,
  reconcileSeed,
  SeedReconciliationError,
} from '../src/catalog/reconcile-seed';
import {
  SeedCatalog,
  SeedIngredient,
  SeedLabel,
  SeedLanguage,
  SeedLine,
  SeedRecipe,
  seedLanguages,
} from '../src/catalog/seed-catalog';
import { openMigrationClient } from './migration-database';

loadEnv({ path: path.resolve(__dirname, '../.env'), quiet: true });

let prisma: PrismaClient;
const fixtureUserIds: string[] = [];

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

describe('seed reconciliation', () => {
  it('does not write during a dry run', async () => {
    const catalog = fixtureCatalog('dry', 'QA');
    await insertExact(catalog);
    const before = await storedSnapshot(catalog.recipes[0]?.slug ?? '');
    const provenanceBefore = await prisma.seedProvenance.count();

    const report = await reconcileSeed(prisma, { catalog, apply: false });

    expect(report.mode).toBe('dry-run');
    expect(report.findings.every((finding) => finding.fields.length === 0)).toBe(true);
    expect(report.findings.every((finding) => finding.provenance === 'missing')).toBe(true);
    expect(report.findings.map((finding) => finding.id).every((id) => id)).toBe(true);
    const text = formatReconciliationReport(report);
    expect(text).toContain(`recipe ${catalog.recipes[0]?.slug} `);
    expect(text).toContain('match provenance=missing');
    expect(text).not.toMatch(/postgres(ql)?:\/\//);
    expect(await storedSnapshot(catalog.recipes[0]?.slug ?? '')).toEqual(before);
    expect(await prisma.seedProvenance.count()).toBe(provenanceBefore);
  });

  it('adopts an exact match without changing ids, content, or timestamps', async () => {
    const catalog = fixtureCatalog('adopt', 'QB');
    await insertExact(catalog);
    const before = await storedSnapshot(catalog.recipes[0]?.slug ?? '');

    const report = await reconcileSeed(prisma, { catalog, apply: true });

    expect(report.mode).toBe('apply');
    expect(report.findings.every((finding) => finding.fields.length === 0)).toBe(true);
    expect(report.findings.every((finding) => finding.provenance === 'present')).toBe(true);
    expect(await storedSnapshot(catalog.recipes[0]?.slug ?? '')).toEqual(before);
    const rows = await prisma.seedProvenance.findMany({
      where: { entityId: { in: await catalogIds(catalog) } },
    });
    expect(rows).toHaveLength(report.findings.length);
    expect(new Set(rows.map((row) => `${row.entityType}:${row.entityId}:${row.seedKey}`))).toEqual(
      new Set(report.findings.map((finding) => `${finding.entityType}:${finding.id}:${SEED_KEY}`)),
    );
  });

  it('applies twice without adding provenance or changing stored rows', async () => {
    const catalog = fixtureCatalog('repeat', 'QC');
    await insertExact(catalog);
    const before = await storedSnapshot(catalog.recipes[0]?.slug ?? '');
    await reconcileSeed(prisma, { catalog, apply: true });
    const ids = await catalogIds(catalog);
    const afterFirst = await prisma.seedProvenance.findMany({
      where: { entityId: { in: ids } },
      orderBy: [{ entityType: 'asc' }, { entityId: 'asc' }],
    });

    const second = await reconcileSeed(prisma, { catalog, apply: true });
    const afterSecond = await prisma.seedProvenance.findMany({
      where: { entityId: { in: ids } },
      orderBy: [{ entityType: 'asc' }, { entityId: 'asc' }],
    });

    expect(second.findings.every((finding) => finding.provenance === 'present')).toBe(true);
    expect(afterSecond.map((row) => row.id)).toEqual(afterFirst.map((row) => row.id));
    expect(await storedSnapshot(catalog.recipes[0]?.slug ?? '')).toEqual(before);
  });

  it('rolls back every provenance insert when any compared row mismatches', async () => {
    const catalog = fixtureCatalog('mismatch', 'QD');
    const second = recipe(`${catalog.recipes[0]?.slug}-extra`, 'Extra dish', catalog);
    const full: SeedCatalog = { ...catalog, recipes: [...catalog.recipes, second] };
    await insertExact(full);
    const blocker = await prisma.recipe.findUniqueOrThrow({ where: { slug: second.slug } });
    await prisma.recipeTranslation.update({
      where: { recipeId_language: { recipeId: blocker.id, language: 'EN' } },
      data: { title: 'Changed title' },
    });
    await prisma.recipeStep.create({ data: { recipeId: blocker.id, position: 2 } });
    const ingredient = await prisma.ingredient.findUniqueOrThrow({
      where: { slug: full.ingredients[0]?.slug ?? '' },
    });
    await prisma.seedProvenance.create({
      data: { seedKey: 'other-seed', entityType: 'ingredient', entityId: ingredient.id },
    });
    const exactRecipe = await prisma.recipe.findUniqueOrThrow({
      where: { slug: catalog.recipes[0]?.slug ?? '' },
    });

    const error = await reconcileSeed(prisma, { catalog: full, apply: true }).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(SeedReconciliationError);
    const findings = error instanceof SeedReconciliationError ? error.findings : [];
    expect(findings.find((finding) => finding.id === ingredient.id)?.fields).toEqual(['provenance']);
    expect(findings.find((finding) => finding.id === blocker.id)?.fields.sort()).toEqual([
      'steps.2',
      'translations.EN.title',
    ]);
    await expect(
      prisma.seedProvenance.findMany({ where: { entityId: exactRecipe.id } }),
    ).resolves.toEqual([]);
    await expect(
      prisma.seedProvenance.findMany({ where: { entityId: blocker.id } }),
    ).resolves.toEqual([]);
    await expect(prisma.seedProvenance.findUnique({
      where: { entityType_entityId: { entityType: 'ingredient', entityId: ingredient.id } },
    })).resolves.toMatchObject({ seedKey: 'other-seed' });
    await expect(
      prisma.recipeTranslation.findUnique({
        where: { recipeId_language: { recipeId: blocker.id, language: 'EN' } },
      }),
    ).resolves.toMatchObject({ title: 'Changed title' });
    await expect(prisma.recipeStep.count({ where: { recipeId: blocker.id } })).resolves.toBe(2);
  });

  it('rejects a user-owned recipe and does not mark the rest of the catalog', async () => {
    const user = await prisma.user.create({ data: {} });
    fixtureUserIds.push(user.id);
    const catalog = fixtureCatalog('owned', 'QE');
    await insertExact(catalog, user.id);
    const recipe = await prisma.recipe.findUniqueOrThrow({
      where: { slug: catalog.recipes[0]?.slug ?? '' },
    });
    const before = await storedSnapshot(recipe.slug);

    const error = await reconcileSeed(prisma, { catalog, apply: true }).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(SeedReconciliationError);
    const findings = error instanceof SeedReconciliationError ? error.findings : [];
    expect(findings.find((finding) => finding.id === recipe.id)?.fields).toEqual(['ownerId']);
    expect(await storedSnapshot(recipe.slug)).toEqual(before);
    await expect(prisma.recipe.findUnique({ where: { id: recipe.id } })).resolves.toMatchObject({
      ownerId: user.id,
    });
    await expect(
      prisma.seedProvenance.count({ where: { entityId: { in: await catalogIds(catalog) } } }),
    ).resolves.toBe(0);
  });
});

async function storedSnapshot(slug: string): Promise<unknown> {
  const recipe = await prisma.recipe.findUniqueOrThrow({
    where: { slug },
    include: {
      translations: { orderBy: { language: 'asc' } },
      steps: {
        orderBy: { position: 'asc' },
        include: { translations: { orderBy: { instruction: 'asc' } } },
      },
      ingredients: {
        orderBy: { position: 'asc' },
        include: { notes: { orderBy: { note: 'asc' } }, ingredient: true },
      },
      countries: { include: { country: { include: { translations: { orderBy: { language: 'asc' } } } } } },
      cuisines: { include: { cuisine: { include: { translations: { orderBy: { language: 'asc' } } } } } },
      dietaryTags: true,
    },
  });
  return JSON.parse(JSON.stringify(recipe)) as unknown;
}

async function catalogIds(catalog: SeedCatalog): Promise<string[]> {
  const [recipes, ingredients, countries, cuisines] = await Promise.all([
    prisma.recipe.findMany({
      where: { slug: { in: catalog.recipes.map((recipe) => recipe.slug) } },
      select: { id: true },
    }),
    prisma.ingredient.findMany({
      where: { slug: { in: catalog.ingredients.map((ingredient) => ingredient.slug) } },
      select: { id: true },
    }),
    prisma.country.findMany({
      where: { slug: { in: catalog.countries.map((country) => country.slug) } },
      select: { id: true },
    }),
    prisma.cuisine.findMany({
      where: { slug: { in: catalog.cuisines.map((cuisine) => cuisine.slug) } },
      select: { id: true },
    }),
  ]);
  return [...recipes, ...ingredients, ...countries, ...cuisines].map((row) => row.id);
}

async function fixtureIds(): Promise<string[]> {
  const [recipes, ingredients, countries, cuisines] = await Promise.all([
    prisma.recipe.findMany({
      where: { slug: { startsWith: 'migration-check-seed-reconcile-' } },
      select: { id: true },
    }),
    prisma.ingredient.findMany({
      where: { slug: { startsWith: 'migration-check-seed-reconcile-' } },
      select: { id: true },
    }),
    prisma.country.findMany({
      where: { slug: { startsWith: 'migration-check-seed-reconcile-' } },
      select: { id: true },
    }),
    prisma.cuisine.findMany({
      where: { slug: { startsWith: 'migration-check-seed-reconcile-' } },
      select: { id: true },
    }),
  ]);
  return [...recipes, ...ingredients, ...countries, ...cuisines].map((row) => row.id);
}

async function deleteFixtures(): Promise<void> {
  const ids = await fixtureIds();
  if (ids.length > 0) {
    await prisma.seedProvenance.deleteMany({ where: { entityId: { in: ids } } });
  }
  await prisma.recipe.deleteMany({
    where: { slug: { startsWith: 'migration-check-seed-reconcile-' } },
  });
  await prisma.ingredient.deleteMany({
    where: { slug: { startsWith: 'migration-check-seed-reconcile-' } },
  });
  await prisma.country.deleteMany({
    where: { slug: { startsWith: 'migration-check-seed-reconcile-' } },
  });
  await prisma.cuisine.deleteMany({
    where: { slug: { startsWith: 'migration-check-seed-reconcile-' } },
  });
}

async function insertExact(catalog: SeedCatalog, ownerId?: string): Promise<void> {
  const countryIds = new Map<string, string>();
  for (const label of catalog.countries) {
    const row = await prisma.country.create({
      data: {
        slug: label.slug,
        code: label.code ?? null,
        originalLanguage: label.originalLanguage,
        translations: { create: nameRows(label.names) },
      },
    });
    countryIds.set(label.slug, row.id);
  }
  const cuisineIds = new Map<string, string>();
  for (const label of catalog.cuisines) {
    const row = await prisma.cuisine.create({
      data: {
        slug: label.slug,
        originalLanguage: label.originalLanguage,
        translations: { create: nameRows(label.names) },
      },
    });
    cuisineIds.set(label.slug, row.id);
  }
  const ingredientIds = new Map<string, string>();
  for (const label of catalog.ingredients) {
    const row = await prisma.ingredient.create({
      data: {
        slug: label.slug,
        originalLanguage: label.originalLanguage,
        translations: { create: nameRows(label.names) },
      },
    });
    ingredientIds.set(label.slug, row.id);
  }
  for (const recipe of catalog.recipes) {
    const saved = await prisma.recipe.create({
      data: {
        slug: recipe.slug,
        ownerId: ownerId ?? null,
        originalLanguage: recipe.originalLanguage,
        publicationStatus: recipe.publicationStatus,
        visibility: recipe.visibility,
        prepTimeMinutes: recipe.prepTimeMinutes,
        cookTimeMinutes: recipe.cookTimeMinutes,
        servings: recipe.servings,
        difficulty: recipe.difficulty,
        translations: { create: recipeTranslations(recipe) },
        steps: { create: recipe.steps.map((step) => ({ position: step.position })) },
        ingredients: { create: recipe.lines.map((line) => lineCreate(line, ingredientIds)) },
      },
      include: { translations: true, steps: true, ingredients: true },
    });
    const translationIds = new Map(saved.translations.map((item) => [item.language, item.id]));
    const stepIds = new Map(saved.steps.map((item) => [item.position, item.id]));
    const lineIds = new Map(saved.ingredients.map((item) => [item.position, item.id]));
    for (const step of recipe.steps) {
      const stepId = stepIds.get(step.position);
      if (!stepId) continue;
      for (const language of seedLanguages) {
        const instruction = step.instructions[language];
        const recipeTranslationId = translationIds.get(language);
        if (!instruction || !recipeTranslationId) continue;
        await prisma.recipeStepTranslation.create({
          data: { recipeId: saved.id, stepId, recipeTranslationId, instruction },
        });
      }
    }
    for (const line of recipe.lines) {
      const recipeIngredientId = lineIds.get(line.position);
      if (!recipeIngredientId) continue;
      for (const language of seedLanguages) {
        const note = line.notes?.[language];
        const recipeTranslationId = translationIds.get(language);
        if (!note || !recipeTranslationId) continue;
        await prisma.recipeIngredientTranslation.create({
          data: { recipeId: saved.id, recipeIngredientId, recipeTranslationId, note },
        });
      }
    }
    if (recipe.countries.length > 0) {
      await prisma.recipeCountry.createMany({
        data: recipe.countries.map((slug) => ({
          recipeId: saved.id,
          countryId: required(countryIds, slug),
        })),
      });
    }
    if (recipe.cuisines.length > 0) {
      await prisma.recipeCuisine.createMany({
        data: recipe.cuisines.map((slug) => ({
          recipeId: saved.id,
          cuisineId: required(cuisineIds, slug),
        })),
      });
    }
  }
}

function fixtureCatalog(name: string, code: string): SeedCatalog {
  const slug = `migration-check-seed-reconcile-${name}`;
  const country: SeedLabel = {
    slug: `${slug}-land`,
    originalLanguage: 'EN',
    code,
    names: { EN: 'Reconcile Land', AR: 'أرض المطابقة' },
  };
  const cuisine: SeedLabel = {
    slug: `${slug}-kitchen`,
    originalLanguage: 'EN',
    names: { EN: 'Reconcile Kitchen', AR: 'مطبخ المطابقة' },
  };
  const ingredient: SeedIngredient = {
    slug: `${slug}-salt`,
    originalLanguage: 'EN',
    names: { EN: 'Reconcile Salt', AR: 'ملح المطابقة' },
    compatibleTags: [],
    bakingMass: false,
  };
  return {
    countries: [country],
    cuisines: [cuisine],
    dietaryTags: [],
    ingredients: [ingredient],
    recipes: [recipe(slug, 'Reconcile dish', { countries: [country], cuisines: [cuisine], ingredients: [ingredient] })],
  };
}

function recipe(
  slug: string,
  title: string,
  catalog: {
    countries: readonly SeedLabel[];
    cuisines: readonly SeedLabel[];
    ingredients: readonly SeedIngredient[];
  },
): SeedRecipe {
  const ingredientSlug = catalog.ingredients[0]?.slug;
  const countrySlug = catalog.countries[0]?.slug;
  const cuisineSlug = catalog.cuisines[0]?.slug;
  if (!ingredientSlug || !countrySlug || !cuisineSlug) {
    throw new Error('fixture catalog is incomplete');
  }
  return {
    slug,
    originalLanguage: 'EN',
    publicationStatus: 'PUBLISHED',
    visibility: 'PUBLIC',
    prepTimeMinutes: 5,
    cookTimeMinutes: 10,
    servings: 2,
    difficulty: 'EASY',
    baking: false,
    countries: [countrySlug],
    cuisines: [cuisineSlug],
    translations: {
      EN: { title, description: 'Exact description' },
      AR: { title: 'طبق مطابق', description: 'وصف مطابق' },
    },
    lines: [
      {
        ingredientSlug,
        position: 1,
        amount: { quantity: '1.500', unit: 'GRAM' },
        notes: { EN: 'Level', AR: 'ممسوح' },
      },
      { ingredientSlug, position: 2, amount: 'TO_TASTE', optional: true },
    ],
    steps: [{ position: 1, instructions: { EN: 'Stir.', AR: 'حرّك.' } }],
  };
}

function nameRows(names: SeedLabel['names']): Array<{ language: SeedLanguage; name: string }> {
  return seedLanguages.flatMap((language) => {
    const name = names[language];
    return name === undefined ? [] : [{ language, name }];
  });
}

function recipeTranslations(recipe: SeedRecipe): Array<{
  language: SeedLanguage;
  title: string;
  description: string;
}> {
  return seedLanguages.flatMap((language) => {
    const translation = recipe.translations[language];
    return translation ? [{ language, ...translation }] : [];
  });
}

function lineCreate(line: SeedLine, ingredientIds: ReadonlyMap<string, string>) {
  const ingredientId = required(ingredientIds, line.ingredientSlug);
  if (line.amount === 'TO_TASTE') {
    return {
      ingredientId,
      position: line.position,
      qualitativeAmount: 'TO_TASTE' as const,
      isOptional: line.optional ?? false,
    };
  }
  return {
    ingredientId,
    position: line.position,
    quantity: new Prisma.Decimal(line.amount.quantity),
    unit: line.amount.unit,
    isOptional: line.optional ?? false,
  };
}

function required(ids: ReadonlyMap<string, string>, slug: string): string {
  const id = ids.get(slug);
  if (!id) throw new Error(`Missing fixture id for ${slug}.`);
  return id;
}
