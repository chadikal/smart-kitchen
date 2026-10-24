import { Prisma, PrismaClient } from '../generated/prisma/client';
import {
  dietaryTagsForRecipe,
  seedCatalog,
  SeedCatalog,
  SeedCatalogError,
  SeedIngredient,
  SeedLabel,
  SeedLanguage,
  SeedLine,
  SeedRecipe,
  validateSeedCatalog,
} from './seed-catalog';

type Db = Prisma.TransactionClient;

export const SEED_KEY = 'smart-kitchen-dev-seed';
export const SEED_ADVISORY_CLASS_ID = 872431;
export const SEED_ADVISORY_OBJECT_ID = 1;

export const seedEntityType = {
  country: 'country',
  cuisine: 'cuisine',
  dietaryTag: 'dietary_tag',
  ingredient: 'ingredient',
  recipe: 'recipe',
} as const;

export async function lockSeedTransaction(tx: Db): Promise<void> {
  await tx.$executeRaw`
    SELECT pg_advisory_xact_lock(
      ${SEED_ADVISORY_CLASS_ID}::integer,
      ${SEED_ADVISORY_OBJECT_ID}::integer
    )
  `;
}

export async function applySeed(
  prisma: PrismaClient,
  catalog: SeedCatalog = seedCatalog,
): Promise<void> {
  validateSeedCatalog(catalog);
  await prisma.$transaction(
    async (tx) => {
      await lockSeedTransaction(tx);
      const ingredients = await upsertIngredients(tx, catalog.ingredients);
      const countries = await upsertLabels(tx, 'country', catalog.countries);
      const cuisines = await upsertLabels(tx, 'cuisine', catalog.cuisines);
      const dietaryTags = await upsertLabels(tx, 'dietaryTag', catalog.dietaryTags);
      const ingredientRecords = new Map(
        catalog.ingredients.map((ingredient) => [ingredient.slug, ingredient]),
      );
      for (const recipe of catalog.recipes) {
        await upsertRecipe(tx, recipe, {
          ingredients,
          ingredientRecords,
          countries,
          cuisines,
          dietaryTags,
        });
      }
    },
    { timeout: 30_000 },
  );
}

async function upsertLabels(
  tx: Db,
  model: 'country' | 'cuisine' | 'dietaryTag',
  labels: readonly SeedLabel[],
): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const label of labels) {
    const id = await upsertLabel(tx, model, label);
    ids.set(label.slug, id);
  }
  return ids;
}

async function upsertLabel(
  tx: Db,
  model: 'country' | 'cuisine' | 'dietaryTag',
  label: SeedLabel,
): Promise<string> {
  const id = await claimLabel(tx, model, label);
  await syncNames(tx, model, id, label);
  return id;
}

async function claimLabel(
  tx: Db,
  model: 'country' | 'cuisine' | 'dietaryTag',
  label: SeedLabel,
): Promise<string> {
  if (model === 'country') {
    if (label.code) {
      const codeOwner = await tx.$queryRaw<Array<{ slug: string }>>`
        SELECT slug FROM countries WHERE code = ${label.code} FOR UPDATE
      `;
      if (codeOwner[0] && codeOwner[0].slug !== label.slug) {
        throw new SeedCatalogError(
          `Country code ${label.code} is already used by ${codeOwner[0].slug}.`,
        );
      }
    }
    const existing = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM countries WHERE slug = ${label.slug} FOR UPDATE
    `;
    if (existing[0]) {
      await requireSeedOwner(tx, seedEntityType.country, existing[0].id, `country ${label.slug}`);
      await tx.country.update({
        where: { id: existing[0].id },
        data: { originalLanguage: label.originalLanguage, code: label.code ?? null },
      });
      return existing[0].id;
    }
    const created = await tx.country.create({
      data: {
        slug: label.slug,
        originalLanguage: label.originalLanguage,
        code: label.code ?? null,
      },
    });
    await markSeedOwner(tx, seedEntityType.country, created.id);
    return created.id;
  }
  if (model === 'cuisine') {
    const existing = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM cuisines WHERE slug = ${label.slug} FOR UPDATE
    `;
    if (existing[0]) {
      await requireSeedOwner(tx, seedEntityType.cuisine, existing[0].id, `cuisine ${label.slug}`);
      await tx.cuisine.update({
        where: { id: existing[0].id },
        data: { originalLanguage: label.originalLanguage },
      });
      return existing[0].id;
    }
    const created = await tx.cuisine.create({
      data: { slug: label.slug, originalLanguage: label.originalLanguage },
    });
    await markSeedOwner(tx, seedEntityType.cuisine, created.id);
    return created.id;
  }
  const existing = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM dietary_tags WHERE slug = ${label.slug} FOR UPDATE
  `;
  if (existing[0]) {
    await requireSeedOwner(
      tx,
      seedEntityType.dietaryTag,
      existing[0].id,
      `dietary tag ${label.slug}`,
    );
    await tx.dietaryTag.update({
      where: { id: existing[0].id },
      data: { originalLanguage: label.originalLanguage },
    });
    return existing[0].id;
  }
  const created = await tx.dietaryTag.create({
    data: { slug: label.slug, originalLanguage: label.originalLanguage },
  });
  await markSeedOwner(tx, seedEntityType.dietaryTag, created.id);
  return created.id;
}

async function syncNames(
  tx: Db,
  model: 'country' | 'cuisine' | 'dietaryTag',
  id: string,
  label: SeedLabel,
): Promise<void> {
  const languages = Object.entries(label.names)
    .filter((entry): entry is [SeedLanguage, string] => entry[1] !== undefined)
    .map(([language]) => language);
  if (model === 'country') {
    await tx.countryTranslation.deleteMany({
      where: { countryId: id, language: { notIn: languages } },
    });
    for (const language of languages) {
      const name = label.names[language];
      if (!name) continue;
      await tx.countryTranslation.upsert({
        where: { countryId_language: { countryId: id, language } },
        create: { countryId: id, language, name },
        update: { name },
      });
    }
    return;
  }
  if (model === 'cuisine') {
    await tx.cuisineTranslation.deleteMany({
      where: { cuisineId: id, language: { notIn: languages } },
    });
    for (const language of languages) {
      const name = label.names[language];
      if (!name) continue;
      await tx.cuisineTranslation.upsert({
        where: { cuisineId_language: { cuisineId: id, language } },
        create: { cuisineId: id, language, name },
        update: { name },
      });
    }
    return;
  }
  await tx.dietaryTagTranslation.deleteMany({
    where: { dietaryTagId: id, language: { notIn: languages } },
  });
  for (const language of languages) {
    const name = label.names[language];
    if (!name) continue;
    await tx.dietaryTagTranslation.upsert({
      where: { dietaryTagId_language: { dietaryTagId: id, language } },
      create: { dietaryTagId: id, language, name },
      update: { name },
    });
  }
}

async function upsertIngredients(
  tx: Db,
  ingredients: readonly SeedIngredient[],
): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const ingredient of ingredients) {
    const existing = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM ingredients WHERE slug = ${ingredient.slug} FOR UPDATE
    `;
    let id: string;
    if (existing[0]) {
      await requireSeedOwner(
        tx,
        seedEntityType.ingredient,
        existing[0].id,
        `ingredient ${ingredient.slug}`,
      );
      await tx.ingredient.update({
        where: { id: existing[0].id },
        data: { originalLanguage: ingredient.originalLanguage },
      });
      id = existing[0].id;
    } else {
      const created = await tx.ingredient.create({
        data: { slug: ingredient.slug, originalLanguage: ingredient.originalLanguage },
      });
      await markSeedOwner(tx, seedEntityType.ingredient, created.id);
      id = created.id;
    }
    const languages = presentLanguages(ingredient.names);
    await tx.ingredientTranslation.deleteMany({
      where: { ingredientId: id, language: { notIn: languages } },
    });
    for (const language of languages) {
      const name = ingredient.names[language];
      if (!name) continue;
      await tx.ingredientTranslation.upsert({
        where: { ingredientId_language: { ingredientId: id, language } },
        create: { ingredientId: id, language, name },
        update: { name },
      });
    }
    ids.set(ingredient.slug, id);
  }
  return ids;
}

async function upsertRecipe(
  tx: Db,
  recipe: SeedRecipe,
  ids: {
    ingredients: Map<string, string>;
    ingredientRecords: Map<string, SeedIngredient>;
    countries: Map<string, string>;
    cuisines: Map<string, string>;
    dietaryTags: Map<string, string>;
  },
): Promise<void> {
  const saved = { id: await claimRecipe(tx, recipe) };
  const languages = presentLanguages(recipe.translations);
  await tx.recipeTranslation.deleteMany({
    where: { recipeId: saved.id, language: { notIn: languages } },
  });
  const translationIds = new Map<SeedLanguage, string>();
  for (const language of languages) {
    const translation = recipe.translations[language];
    if (!translation) continue;
    const row = await tx.recipeTranslation.upsert({
      where: { recipeId_language: { recipeId: saved.id, language } },
      create: {
        recipeId: saved.id,
        language,
        title: translation.title,
        description: translation.description,
      },
      update: { title: translation.title, description: translation.description },
    });
    translationIds.set(language, row.id);
  }

  const stepPositions = recipe.steps.map((step) => step.position);
  await tx.recipeStep.deleteMany({
    where: { recipeId: saved.id, position: { notIn: stepPositions } },
  });
  for (const step of recipe.steps) {
    const row = await tx.recipeStep.upsert({
      where: { recipeId_position: { recipeId: saved.id, position: step.position } },
      create: { recipeId: saved.id, position: step.position },
      update: {},
    });
    for (const language of languages) {
      const instruction = step.instructions[language];
      const recipeTranslationId = translationIds.get(language);
      if (!instruction || !recipeTranslationId) continue;
      await tx.recipeStepTranslation.upsert({
        where: {
          stepId_recipeTranslationId: { stepId: row.id, recipeTranslationId },
        },
        create: {
          recipeId: saved.id,
          stepId: row.id,
          recipeTranslationId,
          instruction,
        },
        update: { instruction },
      });
    }
  }

  const linePositions = recipe.lines.map((line) => line.position);
  await tx.recipeIngredient.deleteMany({
    where: { recipeId: saved.id, position: { notIn: linePositions } },
  });
  for (const line of recipe.lines) {
    const ingredientId = ids.ingredients.get(line.ingredientSlug);
    if (!ingredientId) {
      throw new SeedCatalogError(`Missing ingredient ${line.ingredientSlug}.`);
    }
    const row = await tx.recipeIngredient.upsert({
      where: { recipeId_position: { recipeId: saved.id, position: line.position } },
      create: lineData(saved.id, ingredientId, line),
      update: lineData(saved.id, ingredientId, line),
    });
    const noteLanguages = presentLanguages(line.notes ?? {});
    const noteTranslationIds = noteLanguages.flatMap((language) => {
      const id = translationIds.get(language);
      return id ? [id] : [];
    });
    await tx.recipeIngredientTranslation.deleteMany({
      where: {
        recipeIngredientId: row.id,
        ...(noteTranslationIds.length > 0
          ? { recipeTranslationId: { notIn: noteTranslationIds } }
          : {}),
      },
    });
    for (const language of noteLanguages) {
      const note = line.notes?.[language];
      const recipeTranslationId = translationIds.get(language);
      if (!note || !recipeTranslationId) continue;
      await tx.recipeIngredientTranslation.upsert({
        where: {
          recipeIngredientId_recipeTranslationId: {
            recipeIngredientId: row.id,
            recipeTranslationId,
          },
        },
        create: {
          recipeId: saved.id,
          recipeIngredientId: row.id,
          recipeTranslationId,
          note,
        },
        update: { note },
      });
    }
  }

  await tx.recipeCountry.deleteMany({ where: { recipeId: saved.id } });
  await tx.recipeCuisine.deleteMany({ where: { recipeId: saved.id } });
  await tx.recipeDietaryTag.deleteMany({ where: { recipeId: saved.id } });
  if (recipe.countries.length > 0) {
    await tx.recipeCountry.createMany({
      data: recipe.countries.map((slug) => ({
        recipeId: saved.id,
        countryId: requiredId(ids.countries, slug),
      })),
    });
  }
  if (recipe.cuisines.length > 0) {
    await tx.recipeCuisine.createMany({
      data: recipe.cuisines.map((slug) => ({
        recipeId: saved.id,
        cuisineId: requiredId(ids.cuisines, slug),
      })),
    });
  }
  const tags = dietaryTagsForRecipe(recipe, ids.ingredientRecords);
  if (tags.length > 0) {
    await tx.recipeDietaryTag.createMany({
      data: tags.map((slug) => ({
        recipeId: saved.id,
        dietaryTagId: requiredId(ids.dietaryTags, slug),
      })),
    });
  }
}

async function claimRecipe(tx: Db, recipe: SeedRecipe): Promise<string> {
  const existing = await tx.$queryRaw<Array<{ id: string; owner_id: string | null }>>`
    SELECT id, owner_id FROM recipes WHERE slug = ${recipe.slug} FOR UPDATE
  `;
  if (!existing[0]) {
    const created = await tx.recipe.create({
      data: {
        slug: recipe.slug,
        ownerId: null,
        originalLanguage: recipe.originalLanguage,
        publicationStatus: recipe.publicationStatus,
        visibility: recipe.visibility,
        prepTimeMinutes: recipe.prepTimeMinutes,
        cookTimeMinutes: recipe.cookTimeMinutes,
        servings: recipe.servings,
        difficulty: recipe.difficulty,
      },
    });
    await markSeedOwner(tx, seedEntityType.recipe, created.id);
    return created.id;
  }
  if (existing[0].owner_id !== null) {
    throw new SeedCatalogError(
      `Recipe slug ${recipe.slug} belongs to a user and was left unchanged.`,
    );
  }
  await requireSeedOwner(tx, seedEntityType.recipe, existing[0].id, `Recipe slug ${recipe.slug}`);
  await tx.recipe.update({
    where: { id: existing[0].id },
    data: {
      originalLanguage: recipe.originalLanguage,
      publicationStatus: recipe.publicationStatus,
      visibility: recipe.visibility,
      prepTimeMinutes: recipe.prepTimeMinutes,
      cookTimeMinutes: recipe.cookTimeMinutes,
      servings: recipe.servings,
      difficulty: recipe.difficulty,
    },
  });
  return existing[0].id;
}

async function requireSeedOwner(
  tx: Db,
  entityType: string,
  entityId: string,
  label: string,
): Promise<void> {
  const provenance = await tx.seedProvenance.findUnique({
    where: { entityType_entityId: { entityType, entityId } },
  });
  if (!provenance || provenance.seedKey !== SEED_KEY) {
    throw new SeedCatalogError(`${label} is not owned by this seed and was left unchanged.`);
  }
}

async function markSeedOwner(tx: Db, entityType: string, entityId: string): Promise<void> {
  await tx.seedProvenance.create({
    data: { seedKey: SEED_KEY, entityType, entityId },
  });
}

function lineData(recipeId: string, ingredientId: string, line: SeedLine) {
  if (line.amount === 'TO_TASTE') {
    return {
      recipeId,
      ingredientId,
      position: line.position,
      quantity: null,
      unit: null,
      qualitativeAmount: 'TO_TASTE' as const,
      isOptional: line.optional ?? false,
    };
  }
  return {
    recipeId,
    ingredientId,
    position: line.position,
    quantity: new Prisma.Decimal(line.amount.quantity),
    unit: line.amount.unit,
    qualitativeAmount: null,
    isOptional: line.optional ?? false,
  };
}

function presentLanguages<T>(
  values: Partial<Record<SeedLanguage, T>>,
): SeedLanguage[] {
  return (Object.entries(values) as Array<[SeedLanguage, T | undefined]>)
    .filter((entry): entry is [SeedLanguage, T] => entry[1] !== undefined)
    .map(([language]) => language);
}

function requiredId(ids: Map<string, string>, slug: string): string {
  const id = ids.get(slug);
  if (!id) throw new SeedCatalogError(`Missing catalog id for ${slug}.`);
  return id;
}
