import { Prisma, PrismaClient } from '../generated/prisma/client';
import { MealDbClient, MealDbError, MealDbRecipe, validateArea } from './themealdb.client';

export type ImportOptions = { areas: string[]; limit: number; apply: boolean; list: boolean };

export function parseImportOptions(args: readonly string[]): ImportOptions {
  const result: ImportOptions = { areas: [], limit: 3, apply: false, list: false };
  let sawLimit = false;
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (flag === '--area') {
      const area = args[++i];
      if (!area) throw new MealDbError('--area requires a value.');
      validateArea(area);
      if (result.areas.includes(area)) throw new MealDbError('Duplicate --area.');
      result.areas.push(area);
    } else if (flag === '--limit') {
      const limit = args[++i];
      if (sawLimit || !limit || !/^[1-5]$/.test(limit)) throw new MealDbError('--limit must be 1 through 5.');
      sawLimit = true;
      result.limit = Number(limit);
    } else if (flag === '--apply' && !result.apply) result.apply = true;
    else if (flag === '--list' && !result.list) result.list = true;
    else throw new MealDbError('Unsupported or repeated import argument.');
  }
  if (result.areas.length > 5) throw new MealDbError('At most five areas may be requested.');
  if (result.list && (result.apply || result.areas.length || sawLimit)) throw new MealDbError('--list cannot be combined with import arguments.');
  if (result.areas.length === 0) result.areas = ['Italian', 'Japanese', 'Mexican', 'Moroccan'];
  return result;
}

export async function collectMealDbBatch(
  client: MealDbClient,
  options: Pick<ImportOptions, 'areas' | 'limit'>,
  pause: () => Promise<void> = () => new Promise((resolve) => setTimeout(resolve, 400)),
): Promise<{ recipes: MealDbRecipe[]; areas: { area: string; available: number; selected: number }[] }> {
  if (options.areas.length > 5 || options.limit < 1 || options.limit > 5 || !Number.isInteger(options.limit)) {
    throw new MealDbError('Import batch is outside the development limits.');
  }
  const recipes = new Map<string, MealDbRecipe>();
  const areas: { area: string; available: number; selected: number }[] = [];
  for (const area of options.areas) {
    const listing = await client.listByArea(area);
    await pause();
    let selected = 0;
    for (const item of listing.slice(0, options.limit)) {
      if (recipes.has(item.externalId)) continue;
      const recipe = await client.lookup(item.externalId);
      await pause();
      if (!recipe) throw new MealDbError('A listed TheMealDB recipe was not found. No batch was staged.');
      recipes.set(recipe.externalId, recipe);
      selected++;
    }
    areas.push({ area, available: listing.length, selected });
  }
  return { recipes: [...recipes.values()], areas };
}

/** One transaction, no writes to recipes or shared catalog tables. */
export async function stageMealDbBatch(prisma: PrismaClient, recipes: readonly MealDbRecipe[]): Promise<void> {
  if (recipes.length > 25) throw new MealDbError('At most 25 recipes may be staged per batch.');
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(872431::integer, 2::integer)`;
    for (const recipe of recipes) {
      const key = { provider: 'THEMEALDB' as const, externalId: recipe.externalId };
      await tx.$queryRaw`SELECT id FROM recipe_imports WHERE provider = 'THEMEALDB' AND external_id = ${recipe.externalId} FOR UPDATE`;
      const existing = await tx.recipeImport.findUnique({ where: { provider_externalId: key } });
      if (existing && (existing.reviewStatus !== 'PENDING_REVIEW' || existing.rightsReviewed)) {
        throw new MealDbError('A reviewed import was left unchanged. The batch was rolled back.');
      }
      const data = {
        title: recipe.title,
        originalLanguage: recipe.originalLanguage,
        area: recipe.area,
        country: recipe.country,
        category: recipe.category,
        imageUrl: recipe.imageUrl,
        sourceUrl: recipe.sourceUrl,
        imageSourceUrl: recipe.imageSourceUrl,
        licenseMetadata: recipe.licenseMetadata,
        ingredients: JSON.parse(JSON.stringify(recipe.ingredients)) as Prisma.InputJsonValue,
        instructionsText: recipe.instructionsText,
        rawPayload: JSON.parse(JSON.stringify(recipe.rawPayload)) as Prisma.InputJsonValue,
        reviewWarnings: recipe.reviewWarnings,
        fetchedAt: new Date(),
      };
      if (existing) await tx.recipeImport.update({ where: { id: existing.id }, data });
      else await tx.recipeImport.create({ data: { ...key, ...data } });
    }
  }, { timeout: 30_000 });
}
