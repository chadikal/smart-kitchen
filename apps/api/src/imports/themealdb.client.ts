export class MealDbError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MealDbError';
  }
}

export type SourceIngredient = {
  position: number;
  ingredient: string | null;
  measure: string | null;
};

export type MealDbRecipe = {
  externalId: string;
  title: string;
  originalLanguage: 'EN';
  area: string | null;
  country: string | null;
  category: string | null;
  imageUrl: string | null;
  sourceUrl: string | null;
  imageSourceUrl: string | null;
  licenseMetadata: Record<string, string | boolean | null>;
  ingredients: SourceIngredient[];
  instructionsText: string;
  rawPayload: Record<string, unknown>;
  reviewWarnings: string[];
};

export type MealDbFetch = (url: URL, init: RequestInit) => Promise<Response>;
const origin = 'https://www.themealdb.com';
const maxResponseBytes = 2 * 1024 * 1024;

/** Fixed official endpoints only. Provider URLs are metadata, never fetch targets. */
export class MealDbClient {
  constructor(
    private readonly key = '1',
    private readonly fetcher: MealDbFetch = fetch,
  ) {
    if (!/^[a-zA-Z0-9]{1,128}$/.test(key)) throw new MealDbError('Invalid TheMealDB key configuration.');
  }

  async listByArea(area: string): Promise<{ externalId: string; title: string }[]> {
    validateArea(area);
    const rows = await this.request('filter.php', 'a', area);
    const seen = new Set<string>();
    return rows.flatMap((row) => {
      if (!isRecord(row) || !isId(row.idMeal) || !nonblank(row.strMeal)) {
        throw new MealDbError('TheMealDB returned an invalid recipe listing.');
      }
      if (seen.has(row.idMeal)) return [];
      seen.add(row.idMeal);
      return [{ externalId: row.idMeal, title: row.strMeal }];
    });
  }

  async lookup(externalId: string): Promise<MealDbRecipe | null> {
    if (!isId(externalId)) throw new MealDbError('Invalid TheMealDB recipe ID.');
    const rows = await this.request('lookup.php', 'i', externalId);
    if (rows.length === 0) return null;
    if (rows.length !== 1) throw new MealDbError('TheMealDB returned multiple recipes for one ID.');
    const recipe = parseMealDbRecipe(rows[0]);
    if (recipe.externalId !== externalId) throw new MealDbError('TheMealDB returned a different recipe ID.');
    return recipe;
  }

  private async request(endpoint: 'filter.php' | 'lookup.php', parameter: string, value: string): Promise<unknown[]> {
    const url = new URL(`/api/json/v1/${this.key}/${endpoint}`, origin);
    url.searchParams.set(parameter, value);
    try {
      const response = await this.fetcher(url, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(12_000),
        redirect: 'error',
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new MealDbError(`TheMealDB request failed (HTTP ${response.status}).`);
      }
      if (!response.body) throw new MealDbError('TheMealDB returned an empty response.');
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          size += part.value.byteLength;
          if (size > maxResponseBytes) {
            await reader.cancel();
            throw new MealDbError('TheMealDB response exceeded the size limit.');
          }
          chunks.push(part.value);
        }
      } finally {
        reader.releaseLock();
      }
      const body: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!isRecord(body)) throw new MealDbError('TheMealDB returned an invalid response.');
      if (body.meals === null) return [];
      if (!Array.isArray(body.meals)) throw new MealDbError('TheMealDB returned an invalid meal list.');
      return body.meals;
    } catch (error) {
      if (error instanceof MealDbError) throw error;
      // Do not leak a production key, URL, or low-level network details in errors.
      throw new MealDbError('TheMealDB is unavailable or returned unreadable data.');
    }
  }
}

export function validateArea(area: string): void {
  if (!/^[A-Za-z][A-Za-z ,'-]{0,79}$/.test(area)) throw new MealDbError('Invalid TheMealDB area.');
}

export function parseMealDbRecipe(value: unknown): MealDbRecipe {
  if (!isRecord(value) || !isId(value.idMeal) || !nonblank(value.strMeal) || !nonblank(value.strInstructions)) {
    throw new MealDbError('TheMealDB recipe is missing its ID, title, or instructions.');
  }
  const warnings = [
    'MEASUREMENTS_REQUIRE_REVIEW', 'TIMES_NOT_PROVIDED', 'SERVINGS_NOT_PROVIDED',
    'DIFFICULTY_NOT_PROVIDED', 'DIETARY_TAGS_NOT_VERIFIED', 'NO_ARABIC_TRANSLATION',
    'COUNTRY_AND_CUISINE_REQUIRE_REVIEW', 'IMAGE_RIGHTS_NOT_REVIEWED',
  ];
  const ingredients: SourceIngredient[] = [];
  for (let position = 1; position <= 20; position++) {
    const ingredient = sourceText(value[`strIngredient${position}`]);
    const measure = sourceText(value[`strMeasure${position}`]);
    if (!ingredient?.trim() && !measure?.trim()) continue;
    if (!ingredient?.trim()) warnings.push(`INGREDIENT_NAME_MISSING_AT_${position}`);
    // Preserve the source's exact fractions, units, notes, and order.
    ingredients.push({ position, ingredient, measure });
  }
  if (ingredients.length === 0) throw new MealDbError('TheMealDB recipe has no ingredient lines.');
  const imageUrl = safeMealImage(value.strMealThumb);
  if (!imageUrl) warnings.push('NO_USABLE_PROVIDER_PHOTO');
  return {
    externalId: value.idMeal,
    title: value.strMeal,
    originalLanguage: 'EN',
    area: sourceText(value.strArea),
    country: sourceText(value.strCountry),
    category: sourceText(value.strCategory),
    imageUrl,
    sourceUrl: safeSourceUrl(value.strSource),
    imageSourceUrl: safeSourceUrl(value.strImageSource),
    licenseMetadata: {
      strCreativeCommons: licenseValue(value.strCreativeCommons),
      strCreativeCommonsConfirmed: licenseValue(value.strCreativeCommonsConfirmed),
    },
    ingredients,
    instructionsText: value.strInstructions,
    rawPayload: value,
    reviewWarnings: warnings,
  };
}

function sourceText(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw new MealDbError('TheMealDB returned a non-text recipe field.');
  return value;
}

function safeSourceUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

function safeMealImage(value: unknown): string | null {
  const safe = safeSourceUrl(value);
  if (!safe) return null;
  const url = new URL(safe);
  return url.protocol === 'https:' && ['www.themealdb.com', 'themealdb.com'].includes(url.hostname)
    && url.port === '' && url.pathname.startsWith('/images/media/meals/') && !url.search && !url.hash
    ? url.href : null;
}

function licenseValue(value: unknown): string | boolean | null {
  return typeof value === 'string' || typeof value === 'boolean' ? value : null;
}

function nonblank(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && /^[1-9]\d{0,11}$/.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
