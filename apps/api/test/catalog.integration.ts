import { config as loadEnv } from 'dotenv';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { Prisma, PrismaClient } from '../src/generated/prisma/client';
import {
  expectSqlState,
  openMigrationClient,
} from './migration-database';

loadEnv({ path: path.resolve(__dirname, '../.env'), quiet: true });

const prefix = `migration-check-${randomUUID()}`;
const userIds: string[] = [];
let prisma: PrismaClient;

beforeAll(async () => {
  prisma = openMigrationClient();
  const rows = await prisma.$queryRaw<Array<{ name: string }>>`
    SELECT current_database() AS name
  `;
  if (rows[0]?.name !== 'smart_kitchen_migration_test') {
    throw new Error('Connected to a database other than the migration test database.');
  }
});

afterAll(async () => {
  await prisma.recipe.deleteMany({ where: { slug: { startsWith: prefix } } });
  await prisma.country.deleteMany({ where: { slug: { startsWith: prefix } } });
  await prisma.cuisine.deleteMany({ where: { slug: { startsWith: prefix } } });
  await prisma.dietaryTag.deleteMany({ where: { slug: { startsWith: prefix } } });
  await prisma.ingredient.deleteMany({ where: { slug: { startsWith: prefix } } });
  if (userIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
  await prisma.$disconnect();
});

describe('recipe catalog migration', () => {
  it('defaults a new recipe to draft, private, and no owner', async () => {
    const recipe = await prisma.recipe.create({ data: recipeData('defaults') });

    expect(recipe.publicationStatus).toBe('DRAFT');
    expect(recipe.visibility).toBe('PRIVATE');
    expect(recipe.ownerId).toBeNull();
    expect(recipe.prepTimeMinutes).toBe(0);
    expect(recipe.cookTimeMinutes).toBe(0);
    expect(recipe.servings).toBe(1);
  });

  it('keeps a system recipe without an owner and blocks deletion of a recipe owner', async () => {
    const systemRecipe = await prisma.recipe.create({
      data: recipeData('system'),
    });
    expect(systemRecipe.ownerId).toBeNull();

    const owner = await prisma.user.create({ data: {} });
    userIds.push(owner.id);
    const owned = await prisma.recipe.create({
      data: recipeData('owned', { ownerId: owner.id }),
    });

    await expectSqlState(
      () => prisma.user.delete({ where: { id: owner.id } }),
      '23503',
    );
    await expect(prisma.user.findUnique({ where: { id: owner.id } })).resolves.toEqual(
      expect.objectContaining({ id: owner.id }),
    );
    await expect(prisma.recipe.findUnique({ where: { id: owned.id } })).resolves.toEqual(
      expect.objectContaining({ ownerId: owner.id }),
    );
  });

  it('stores a decimal measurement and a to-taste amount', async () => {
    const recipe = await prisma.recipe.create({ data: recipeData('measured') });
    const ingredient = await prisma.ingredient.create({
      data: catalogData('flour'),
    });
    const measured = await prisma.recipeIngredient.create({
      data: {
        recipeId: recipe.id,
        ingredientId: ingredient.id,
        position: 1,
        quantity: new Prisma.Decimal('12.500'),
        unit: 'GRAM',
      },
    });
    const taste = await prisma.recipeIngredient.create({
      data: {
        recipeId: recipe.id,
        ingredientId: ingredient.id,
        position: 2,
        quantity: null,
        unit: null,
        qualitativeAmount: 'TO_TASTE',
      },
    });

    expect(measured.quantity?.toFixed(3)).toBe('12.500');
    expect(measured.unit).toBe('GRAM');
    expect(measured.qualitativeAmount).toBeNull();
    expect(taste.quantity).toBeNull();
    expect(taste.unit).toBeNull();
    expect(taste.qualitativeAmount).toBe('TO_TASTE');
  });

  it('rejects quantities and amount combinations the check does not allow', async () => {
    const recipe = await prisma.recipe.create({ data: recipeData('amounts') });
    const ingredient = await prisma.ingredient.create({
      data: catalogData('salt'),
    });
    const base = {
      recipeId: recipe.id,
      ingredientId: ingredient.id,
    };
    const cases = [
      { position: 1, quantity: new Prisma.Decimal('0'), unit: 'GRAM' as const, qualitativeAmount: null },
      { position: 2, quantity: new Prisma.Decimal('-1'), unit: 'MILLILITER' as const, qualitativeAmount: null },
      { position: 3, quantity: new Prisma.Decimal('1'), unit: null, qualitativeAmount: null },
      { position: 4, quantity: null, unit: 'PIECE' as const, qualitativeAmount: null },
      { position: 5, quantity: new Prisma.Decimal('1'), unit: 'CUP' as const, qualitativeAmount: 'TO_TASTE' as const },
      { position: 6, quantity: null, unit: null, qualitativeAmount: null },
    ];
    for (const entry of cases) {
      await expectSqlState(
        () => prisma.recipeIngredient.create({ data: { ...base, ...entry } }),
        '23514',
      );
    }
  });

  it('rejects negative times, zero servings, and nonpositive or duplicate positions', async () => {
    await expectSqlState(
      () => prisma.recipe.create({ data: recipeData('prep', { prepTimeMinutes: -1 }) }),
      '23514',
    );
    await expectSqlState(
      () => prisma.recipe.create({ data: recipeData('cook', { cookTimeMinutes: -1 }) }),
      '23514',
    );
    await expectSqlState(
      () => prisma.recipe.create({ data: recipeData('servings', { servings: 0 }) }),
      '23514',
    );

    const recipe = await prisma.recipe.create({ data: recipeData('positions') });
    const ingredient = await prisma.ingredient.create({
      data: catalogData('water'),
    });
    await expectSqlState(
      () => prisma.recipeStep.create({ data: { recipeId: recipe.id, position: 0 } }),
      '23514',
    );
    await expectSqlState(
      () =>
        prisma.recipeIngredient.create({
          data: {
            recipeId: recipe.id,
            ingredientId: ingredient.id,
            position: 0,
            quantity: new Prisma.Decimal('1'),
            unit: 'MILLILITER',
          },
        }),
      '23514',
    );
    await prisma.recipeStep.create({ data: { recipeId: recipe.id, position: 1 } });
    await expectSqlState(
      () => prisma.recipeStep.create({ data: { recipeId: recipe.id, position: 1 } }),
      '23505',
    );
  });

  it('rejects a second translation for the same recipe and language', async () => {
    const recipe = await prisma.recipe.create({ data: recipeData('duplicate-language') });
    await prisma.recipeTranslation.create({
      data: { recipeId: recipe.id, language: 'EN', title: 'First', description: '' },
    });
    await expectSqlState(
      () =>
        prisma.recipeTranslation.create({
          data: { recipeId: recipe.id, language: 'EN', title: 'Second', description: '' },
        }),
      '23505',
    );

    const country = await prisma.country.create({ data: catalogData('lebanon', { code: null }) });
    await prisma.countryTranslation.create({
      data: { countryId: country.id, language: 'AR', name: 'لبنان' },
    });
    await expectSqlState(
      () =>
        prisma.countryTranslation.create({
          data: { countryId: country.id, language: 'AR', name: 'لبنان مرة أخرى' },
        }),
      '23505',
    );
  });

  it('rejects step instructions and ingredient notes that cross recipes', async () => {
    const first = await recipeWithStep('cross-a');
    const second = await recipeWithStep('cross-b');
    const ingredient = await prisma.ingredient.create({ data: catalogData('oil') });
    const line = await prisma.recipeIngredient.create({
      data: {
        recipeId: first.recipe.id,
        ingredientId: ingredient.id,
        position: 1,
        quantity: new Prisma.Decimal('5'),
        unit: 'MILLILITER',
      },
    });

    await expectSqlState(
      () =>
        prisma.recipeStepTranslation.create({
          data: {
            recipeId: first.recipe.id,
            stepId: second.step.id,
            recipeTranslationId: first.translation.id,
            instruction: 'Wrong step',
          },
        }),
      '23503',
    );
    await expectSqlState(
      () =>
        prisma.recipeStepTranslation.create({
          data: {
            recipeId: first.recipe.id,
            stepId: first.step.id,
            recipeTranslationId: second.translation.id,
            instruction: 'Wrong translation',
          },
        }),
      '23503',
    );
    await expectSqlState(
      () =>
        prisma.recipeIngredientTranslation.create({
          data: {
            recipeId: first.recipe.id,
            recipeIngredientId: line.id,
            recipeTranslationId: second.translation.id,
            note: 'Wrong note',
          },
        }),
      '23503',
    );
  });

  it('cascades recipe deletion and restricts deletion of referenced catalog rows', async () => {
    const recipe = await prisma.recipe.create({ data: recipeData('cascade') });
    const country = await prisma.country.create({ data: catalogData('country') });
    const cuisine = await prisma.cuisine.create({ data: catalogData('cuisine') });
    const tag = await prisma.dietaryTag.create({ data: catalogData('tag') });
    const ingredient = await prisma.ingredient.create({ data: catalogData('ingredient') });
    const translation = await prisma.recipeTranslation.create({
      data: { recipeId: recipe.id, language: 'EN', title: 'Cascade', description: '' },
    });
    const step = await prisma.recipeStep.create({
      data: { recipeId: recipe.id, position: 1 },
    });
    await prisma.recipeStepTranslation.create({
      data: {
        recipeId: recipe.id,
        stepId: step.id,
        recipeTranslationId: translation.id,
        instruction: 'Bake',
      },
    });
    const line = await prisma.recipeIngredient.create({
      data: {
        recipeId: recipe.id,
        ingredientId: ingredient.id,
        position: 1,
        qualitativeAmount: 'TO_TASTE',
      },
    });
    await prisma.recipeIngredientTranslation.create({
      data: {
        recipeId: recipe.id,
        recipeIngredientId: line.id,
        recipeTranslationId: translation.id,
        note: 'Optional',
      },
    });
    await prisma.recipeCountry.create({
      data: { recipeId: recipe.id, countryId: country.id },
    });
    await prisma.recipeCuisine.create({
      data: { recipeId: recipe.id, cuisineId: cuisine.id },
    });
    await prisma.recipeDietaryTag.create({
      data: { recipeId: recipe.id, dietaryTagId: tag.id },
    });

    await expectSqlState(
      () => prisma.country.delete({ where: { id: country.id } }),
      '23503',
    );
    await expectSqlState(
      () => prisma.cuisine.delete({ where: { id: cuisine.id } }),
      '23503',
    );
    await expectSqlState(
      () => prisma.dietaryTag.delete({ where: { id: tag.id } }),
      '23503',
    );
    await expectSqlState(
      () => prisma.ingredient.delete({ where: { id: ingredient.id } }),
      '23503',
    );

    await prisma.recipe.delete({ where: { id: recipe.id } });

    await expect(prisma.recipeTranslation.count({ where: { recipeId: recipe.id } })).resolves.toBe(0);
    await expect(prisma.recipeStep.count({ where: { recipeId: recipe.id } })).resolves.toBe(0);
    await expect(prisma.recipeStepTranslation.count({ where: { recipeId: recipe.id } })).resolves.toBe(0);
    await expect(prisma.recipeIngredient.count({ where: { recipeId: recipe.id } })).resolves.toBe(0);
    await expect(prisma.recipeIngredientTranslation.count({ where: { recipeId: recipe.id } })).resolves.toBe(0);
    await expect(prisma.recipeCountry.count({ where: { recipeId: recipe.id } })).resolves.toBe(0);
    await expect(prisma.country.findUnique({ where: { id: country.id } })).resolves.not.toBeNull();
    await expect(prisma.ingredient.findUnique({ where: { id: ingredient.id } })).resolves.not.toBeNull();
  });

  it('stores an Arabic-only recipe without an English translation', async () => {
    const recipe = await prisma.recipe.create({
      data: recipeData('arabic', { originalLanguage: 'AR' }),
    });
    const translation = await prisma.recipeTranslation.create({
      data: {
        recipeId: recipe.id,
        language: 'AR',
        title: 'كعك',
        description: 'وصفة عربية',
      },
    });
    const step = await prisma.recipeStep.create({
      data: { recipeId: recipe.id, position: 1 },
    });
    await prisma.recipeStepTranslation.create({
      data: {
        recipeId: recipe.id,
        stepId: step.id,
        recipeTranslationId: translation.id,
        instruction: 'اخلط المكونات',
      },
    });

    const stored = await prisma.recipe.findUniqueOrThrow({
      where: { id: recipe.id },
      include: {
        translations: true,
        steps: { include: { translations: true } },
      },
    });
    expect(stored.originalLanguage).toBe('AR');
    expect(stored.translations.map((item) => item.language)).toEqual(['AR']);
    expect(stored.steps[0]?.translations.map((item) => item.instruction)).toEqual([
      'اخلط المكونات',
    ]);
  });
});

function recipeData(
  name: string,
  extra: Partial<Prisma.RecipeUncheckedCreateInput> = {},
): Prisma.RecipeUncheckedCreateInput {
  return {
    slug: `${prefix}-${name}`,
    originalLanguage: 'EN',
    difficulty: 'EASY',
    ...extra,
  };
}

function catalogData(
  name: string,
  extra: { code?: string | null } = {},
): { slug: string; originalLanguage: 'EN'; code?: string | null } {
  return {
    slug: `${prefix}-${name}`,
    originalLanguage: 'EN',
    ...extra,
  };
}

async function recipeWithStep(name: string) {
  const recipe = await prisma.recipe.create({ data: recipeData(name) });
  const translation = await prisma.recipeTranslation.create({
    data: { recipeId: recipe.id, language: 'EN', title: name, description: '' },
  });
  const step = await prisma.recipeStep.create({
    data: { recipeId: recipe.id, position: 1 },
  });
  return { recipe, translation, step };
}
