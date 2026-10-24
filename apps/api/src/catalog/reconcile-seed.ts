import { Prisma, PrismaClient } from '../generated/prisma/client';
import { lockSeedTransaction, SEED_KEY, seedEntityType } from './apply-seed';
import {
  dietaryTagsForRecipe,
  SeedCatalog,
  SeedIngredient,
  SeedLabel,
  SeedRecipe,
  seedCatalog,
  seedLanguages,
  validateSeedCatalog,
} from './seed-catalog';

type Db = Prisma.TransactionClient;
type Json = null | string | number | boolean | Json[] | { [key: string]: Json };

export type ReconciliationEntityType = (typeof seedEntityType)[keyof typeof seedEntityType];
export type ProvenanceState = 'missing' | 'present' | 'conflict' | 'absent';

export interface ReconciliationFinding {
  entityType: ReconciliationEntityType;
  slug: string;
  id: string | null;
  fields: string[];
  provenance: ProvenanceState;
}

export interface ReconciliationReport {
  mode: 'dry-run' | 'apply';
  findings: ReconciliationFinding[];
}

export class SeedReconciliationError extends Error {
  readonly findings: readonly ReconciliationFinding[];

  constructor(findings: readonly ReconciliationFinding[]) {
    super('Seed reconciliation found records that cannot be adopted.');
    this.name = 'SeedReconciliationError';
    this.findings = findings;
  }
}

export async function reconcileSeed(
  prisma: PrismaClient,
  options: { apply?: boolean; catalog?: SeedCatalog } = {},
): Promise<ReconciliationReport> {
  const apply = options.apply ?? false;
  const catalog = options.catalog ?? seedCatalog;
  validateSeedCatalog(catalog);
  const mode = apply ? 'apply' : 'dry-run';
  const findings = await prisma.$transaction(
    async (tx) => {
      if (apply) {
        await lockSeedTransaction(tx);
      } else {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      }
      const compared = await compareCatalog(tx, catalog, apply);
      if (apply && compared.some((finding) => finding.fields.length > 0)) {
        throw new SeedReconciliationError(compared);
      }
      if (apply) {
        for (const finding of compared) {
          if (finding.provenance !== 'missing' || !finding.id) continue;
          await tx.seedProvenance.create({
            data: {
              seedKey: SEED_KEY,
              entityType: finding.entityType,
              entityId: finding.id,
            },
          });
          finding.provenance = 'present';
        }
      }
      return compared;
    },
    { timeout: 60_000 },
  );
  return { mode, findings };
}

export function formatReconciliationReport(report: ReconciliationReport): string {
  const lines = [`mode: ${report.mode}`];
  for (const finding of report.findings) {
    const id = finding.id ?? 'missing';
    if (finding.fields.length === 0) {
      lines.push(
        `${finding.entityType} ${finding.slug} ${id} match provenance=${finding.provenance}`,
      );
      continue;
    }
    lines.push(
      `${finding.entityType} ${finding.slug} ${id} mismatch fields=${finding.fields.join(', ')}`,
    );
  }
  return lines.join('\n');
}

async function compareCatalog(
  tx: Db,
  catalog: SeedCatalog,
  lock: boolean,
): Promise<ReconciliationFinding[]> {
  const ingredients = new Map(catalog.ingredients.map((ingredient) => [ingredient.slug, ingredient]));
  const findings: ReconciliationFinding[] = [];
  for (const label of sorted(catalog.countries)) {
    findings.push(await compareLabel(tx, 'country', label, lock));
  }
  for (const label of sorted(catalog.cuisines)) {
    findings.push(await compareLabel(tx, 'cuisine', label, lock));
  }
  for (const label of sorted(catalog.dietaryTags)) {
    findings.push(await compareLabel(tx, 'dietaryTag', label, lock));
  }
  for (const label of sorted(catalog.ingredients)) {
    findings.push(await compareLabel(tx, 'ingredient', label, lock));
  }
  for (const recipe of sorted(catalog.recipes)) {
    findings.push(await compareRecipe(tx, recipe, ingredients, lock));
  }
  return findings;
}

async function compareLabel(
  tx: Db,
  kind: 'country' | 'cuisine' | 'dietaryTag' | 'ingredient',
  label: SeedLabel,
  lock: boolean,
): Promise<ReconciliationFinding> {
  const entityType = seedEntityType[kind];
  const id = await lockLabel(tx, kind, label.slug, lock);
  if (!id) return missing(entityType, label.slug);
  if (lock) await lockLabelChildren(tx, kind, id);
  const actual = await readLabel(tx, kind, id);
  const fields = differenceFields(expectedLabel(label, kind === 'country'), actual);
  const provenance = await readProvenance(tx, entityType, id, lock);
  if (provenance === 'conflict') fields.push('provenance');
  return { entityType, slug: label.slug, id, fields, provenance };
}

async function compareRecipe(
  tx: Db,
  recipe: SeedRecipe,
  ingredients: ReadonlyMap<string, SeedIngredient>,
  lock: boolean,
): Promise<ReconciliationFinding> {
  const entityType = seedEntityType.recipe;
  const id = await lockRecipe(tx, recipe.slug, lock);
  if (!id) return missing(entityType, recipe.slug);
  if (lock) await lockRecipeChildren(tx, id);
  const row = await tx.recipe.findUniqueOrThrow({
    where: { id },
    include: {
      translations: true,
      steps: { include: { translations: { include: { recipeTranslation: true } } } },
      ingredients: {
        include: {
          ingredient: true,
          notes: { include: { recipeTranslation: true } },
        },
      },
      countries: { include: { country: true } },
      cuisines: { include: { cuisine: true } },
      dietaryTags: { include: { dietaryTag: true } },
    },
  });
  const fields = differenceFields(expectedRecipe(recipe, ingredients), storedRecipe(row));
  const provenance = await readProvenance(tx, entityType, id, lock);
  if (provenance === 'conflict') fields.push('provenance');
  return { entityType, slug: recipe.slug, id, fields, provenance };
}

function missing(entityType: ReconciliationEntityType, slug: string): ReconciliationFinding {
  return { entityType, slug, id: null, fields: ['missing'], provenance: 'absent' };
}

async function readProvenance(
  tx: Db,
  entityType: string,
  entityId: string,
  lock: boolean,
): Promise<ProvenanceState> {
  if (lock) {
    await tx.$queryRaw`
      SELECT id FROM seed_provenance
      WHERE entity_type = ${entityType} AND entity_id = ${entityId}
      FOR UPDATE
    `;
  }
  const row = await tx.seedProvenance.findUnique({
    where: { entityType_entityId: { entityType, entityId } },
  });
  if (!row) return 'missing';
  return row.seedKey === SEED_KEY ? 'present' : 'conflict';
}

async function lockLabel(
  tx: Db,
  kind: 'country' | 'cuisine' | 'dietaryTag' | 'ingredient',
  slug: string,
  lock: boolean,
): Promise<string | null> {
  if (!lock) {
    const row = await findLabelId(tx, kind, slug);
    return row;
  }
  const rows = await queryLabelId(tx, kind, slug);
  return rows[0]?.id ?? null;
}

async function findLabelId(
  tx: Db,
  kind: 'country' | 'cuisine' | 'dietaryTag' | 'ingredient',
  slug: string,
): Promise<string | null> {
  if (kind === 'country') {
    return (await tx.country.findUnique({ where: { slug }, select: { id: true } }))?.id ?? null;
  }
  if (kind === 'cuisine') {
    return (await tx.cuisine.findUnique({ where: { slug }, select: { id: true } }))?.id ?? null;
  }
  if (kind === 'dietaryTag') {
    return (await tx.dietaryTag.findUnique({ where: { slug }, select: { id: true } }))?.id ?? null;
  }
  return (await tx.ingredient.findUnique({ where: { slug }, select: { id: true } }))?.id ?? null;
}

async function queryLabelId(
  tx: Db,
  kind: 'country' | 'cuisine' | 'dietaryTag' | 'ingredient',
  slug: string,
): Promise<Array<{ id: string }>> {
  if (kind === 'country') {
    return tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM countries WHERE slug = ${slug} FOR UPDATE`;
  }
  if (kind === 'cuisine') {
    return tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM cuisines WHERE slug = ${slug} FOR UPDATE`;
  }
  if (kind === 'dietaryTag') {
    return tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM dietary_tags WHERE slug = ${slug} FOR UPDATE`;
  }
  return tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM ingredients WHERE slug = ${slug} FOR UPDATE`;
}

async function lockLabelChildren(
  tx: Db,
  kind: 'country' | 'cuisine' | 'dietaryTag' | 'ingredient',
  id: string,
): Promise<void> {
  if (kind === 'country') {
    await tx.$queryRaw`SELECT id FROM country_translations WHERE country_id = ${id} FOR UPDATE`;
    return;
  }
  if (kind === 'cuisine') {
    await tx.$queryRaw`SELECT id FROM cuisine_translations WHERE cuisine_id = ${id} FOR UPDATE`;
    return;
  }
  if (kind === 'dietaryTag') {
    await tx.$queryRaw`SELECT id FROM dietary_tag_translations WHERE dietary_tag_id = ${id} FOR UPDATE`;
    return;
  }
  await tx.$queryRaw`SELECT id FROM ingredient_translations WHERE ingredient_id = ${id} FOR UPDATE`;
}

async function readLabel(
  tx: Db,
  kind: 'country' | 'cuisine' | 'dietaryTag' | 'ingredient',
  id: string,
): Promise<Json> {
  if (kind === 'country') {
    const row = await tx.country.findUniqueOrThrow({
      where: { id },
      include: { translations: true },
    });
    return {
      originalLanguage: row.originalLanguage,
      code: normalizeCode(row.code),
      names: Object.fromEntries(row.translations.map((item) => [item.language, item.name])),
    };
  }
  if (kind === 'cuisine') {
    const row = await tx.cuisine.findUniqueOrThrow({
      where: { id },
      include: { translations: true },
    });
    return {
      originalLanguage: row.originalLanguage,
      names: Object.fromEntries(row.translations.map((item) => [item.language, item.name])),
    };
  }
  if (kind === 'dietaryTag') {
    const row = await tx.dietaryTag.findUniqueOrThrow({
      where: { id },
      include: { translations: true },
    });
    return {
      originalLanguage: row.originalLanguage,
      names: Object.fromEntries(row.translations.map((item) => [item.language, item.name])),
    };
  }
  const row = await tx.ingredient.findUniqueOrThrow({
    where: { id },
    include: { translations: true },
  });
  return {
    originalLanguage: row.originalLanguage,
    names: Object.fromEntries(row.translations.map((item) => [item.language, item.name])),
  };
}

async function lockRecipe(tx: Db, slug: string, lock: boolean): Promise<string | null> {
  if (!lock) {
    return (await tx.recipe.findUnique({ where: { slug }, select: { id: true } }))?.id ?? null;
  }
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM recipes WHERE slug = ${slug} FOR UPDATE
  `;
  return rows[0]?.id ?? null;
}

async function lockRecipeChildren(tx: Db, id: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM recipe_translations WHERE recipe_id = ${id} FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM recipe_steps WHERE recipe_id = ${id} FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM recipe_step_translations WHERE recipe_id = ${id} FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM recipe_ingredients WHERE recipe_id = ${id} FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM recipe_ingredient_translations WHERE recipe_id = ${id} FOR UPDATE`;
  await tx.$queryRaw`SELECT recipe_id FROM recipe_countries WHERE recipe_id = ${id} FOR UPDATE`;
  await tx.$queryRaw`SELECT recipe_id FROM recipe_cuisines WHERE recipe_id = ${id} FOR UPDATE`;
  await tx.$queryRaw`SELECT recipe_id FROM recipe_dietary_tags WHERE recipe_id = ${id} FOR UPDATE`;
}

function expectedLabel(label: SeedLabel, includeCode: boolean): Json {
  const names: Record<string, Json> = {};
  for (const language of seedLanguages) {
    const name = label.names[language];
    if (name !== undefined) names[language] = name;
  }
  if (!includeCode) return { originalLanguage: label.originalLanguage, names };
  return { originalLanguage: label.originalLanguage, code: normalizeCode(label.code), names };
}

function expectedRecipe(
  recipe: SeedRecipe,
  ingredients: ReadonlyMap<string, SeedIngredient>,
): Json {
  return {
    originalLanguage: recipe.originalLanguage,
    publicationStatus: recipe.publicationStatus,
    visibility: recipe.visibility,
    prepTimeMinutes: recipe.prepTimeMinutes,
    cookTimeMinutes: recipe.cookTimeMinutes,
    servings: recipe.servings,
    difficulty: recipe.difficulty,
    ownerId: null,
    translations: translationContent(recipe),
    steps: stepContent(recipe),
    lines: lineContent(recipe),
    countries: [...recipe.countries].sort(),
    cuisines: [...recipe.cuisines].sort(),
    dietaryTags: [...dietaryTagsForRecipe(recipe, ingredients)].sort(),
  };
}

function translationContent(recipe: SeedRecipe): Json {
  const translations: Record<string, Json> = {};
  for (const language of seedLanguages) {
    const translation = recipe.translations[language];
    if (!translation) continue;
    translations[language] = { title: translation.title, description: translation.description };
  }
  return translations;
}

function stepContent(recipe: SeedRecipe): Json {
  const steps: Record<string, Json> = {};
  for (const step of recipe.steps) {
    const instructions: Record<string, Json> = {};
    for (const language of seedLanguages) {
      const instruction = step.instructions[language];
      if (instruction !== undefined) instructions[language] = instruction;
    }
    steps[String(step.position)] = { instructions };
  }
  return steps;
}

function lineContent(recipe: SeedRecipe): Json {
  const lines: Record<string, Json> = {};
  for (const line of recipe.lines) {
    const notes: Record<string, Json> = {};
    for (const language of seedLanguages) {
      const note = line.notes?.[language];
      if (note !== undefined) notes[language] = note;
    }
    const measured = line.amount === 'TO_TASTE' ? null : line.amount;
    lines[String(line.position)] = {
      ingredientSlug: line.ingredientSlug,
      quantity: measured ? normalizeDecimal(measured.quantity) : null,
      unit: measured?.unit ?? null,
      qualitativeAmount: measured ? null : 'TO_TASTE',
      optional: line.optional ?? false,
      notes,
    };
  }
  return lines;
}

function storedRecipe(row: {
  ownerId: string | null;
  originalLanguage: string;
  publicationStatus: string;
  visibility: string;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  difficulty: string;
  translations: Array<{ language: string; title: string; description: string }>;
  steps: Array<{
    position: number;
    translations: Array<{ instruction: string; recipeTranslation: { language: string } }>;
  }>;
  ingredients: Array<{
    position: number;
    quantity: { toFixed(digits: number): string } | null;
    unit: string | null;
    qualitativeAmount: string | null;
    isOptional: boolean;
    ingredient: { slug: string };
    notes: Array<{ note: string; recipeTranslation: { language: string } }>;
  }>;
  countries: Array<{ country: { slug: string } }>;
  cuisines: Array<{ cuisine: { slug: string } }>;
  dietaryTags: Array<{ dietaryTag: { slug: string } }>;
}): Json {
  const translations: Record<string, Json> = {};
  for (const translation of row.translations) {
    translations[translation.language] = {
      title: translation.title,
      description: translation.description,
    };
  }
  const steps: Record<string, Json> = {};
  for (const step of row.steps) {
    const instructions: Record<string, Json> = {};
    for (const translation of step.translations) {
      instructions[translation.recipeTranslation.language] = translation.instruction;
    }
    steps[String(step.position)] = { instructions };
  }
  const lines: Record<string, Json> = {};
  for (const line of row.ingredients) {
    const notes: Record<string, Json> = {};
    for (const note of line.notes) {
      notes[note.recipeTranslation.language] = note.note;
    }
    lines[String(line.position)] = {
      ingredientSlug: line.ingredient.slug,
      quantity: line.quantity ? line.quantity.toFixed(3) : null,
      unit: line.unit,
      qualitativeAmount: line.qualitativeAmount,
      optional: line.isOptional,
      notes,
    };
  }
  return {
    originalLanguage: row.originalLanguage,
    publicationStatus: row.publicationStatus,
    visibility: row.visibility,
    prepTimeMinutes: row.prepTimeMinutes,
    cookTimeMinutes: row.cookTimeMinutes,
    servings: row.servings,
    difficulty: row.difficulty,
    ownerId: row.ownerId,
    translations,
    steps,
    lines,
    countries: row.countries.map((link) => link.country.slug).sort(),
    cuisines: row.cuisines.map((link) => link.cuisine.slug).sort(),
    dietaryTags: row.dietaryTags.map((link) => link.dietaryTag.slug).sort(),
  };
}

function differenceFields(expected: Json, actual: Json): string[] {
  const fields: string[] = [];
  walk(expected, actual, '', fields);
  return fields;
}

function walk(expected: Json, actual: Json, path: string, fields: string[]): void {
  if (isRecord(expected) && isRecord(actual)) {
    const keys = [...new Set([...Object.keys(expected), ...Object.keys(actual)])].sort();
    for (const key of keys) {
      const next = path ? `${path}.${key}` : key;
      const expectedValue = expected[key];
      const actualValue = actual[key];
      if (expectedValue === undefined || actualValue === undefined) {
        fields.push(next);
        continue;
      }
      walk(expectedValue, actualValue, next, fields);
    }
    return;
  }
  if (Array.isArray(expected) || Array.isArray(actual)) {
    const left = Array.isArray(expected) ? expected : [];
    const right = Array.isArray(actual) ? actual : [];
    if (left.length !== right.length) fields.push(path ? `${path}.length` : 'length');
    const count = Math.min(left.length, right.length);
    for (let index = 0; index < count; index += 1) {
      walk(left[index] ?? null, right[index] ?? null, `${path}[${index}]`, fields);
    }
    return;
  }
  if (expected !== actual) fields.push(path || 'value');
}

function isRecord(value: Json): value is { [key: string]: Json } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeCode(code: string | null | undefined): string | null {
  const trimmed = code?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}

function normalizeDecimal(value: string): string {
  return new Prisma.Decimal(value).toFixed(3);
}

function sorted<T extends { slug: string }>(items: readonly T[]): T[] {
  return [...items].sort((left, right) => left.slug.localeCompare(right.slug));
}
