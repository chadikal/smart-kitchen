import { readFactSources, type FactSources } from './recipe-facts.ts';
import { readRecipePhoto, type RecipePhoto } from './recipe-photo.ts';
export const metricUnitMilliliters = {
  TEASPOON: 5,
  TABLESPOON: 15,
  CUP: 250,
} as const;

const measuredUnits = [
  'MILLIGRAM',
  'GRAM',
  'KILOGRAM',
  'MILLILITER',
  'LITER',
  'TEASPOON',
  'TABLESPOON',
  'CUP',
  'PIECE',
] as const;

export type MeasuredUnit = (typeof measuredUnits)[number];
export type RecipeLanguage = 'en' | 'ar';
export type RecipeDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const quantityPattern = /^(0|[1-9]\d*)\.(\d{3})$/;
const unitSet = new Set<string>(measuredUnits);

export type CatalogName = {
  slug: string;
  name: string;
  language: RecipeLanguage;
};

export type IngredientLine = {
  sourceMeasure?: string | null;
  position: number;
  ingredientSlug: string;
  name: string;
  language: RecipeLanguage;
  quantity: string | null;
  unit: MeasuredUnit | null;
  qualitativeAmount: 'TO_TASTE' | null;
  optional: boolean;
  note: string | null;
};

export type RecipeStep = {
  position: number;
  instruction: string;
};

export type RecipeDetail = {
  slug: string;
  title: string;
  description: string;
  requestedLanguage: RecipeLanguage;
  contentLanguage: RecipeLanguage;
  fallbackUsed: boolean;
  originalLanguage: RecipeLanguage;
  photo: RecipePhoto | null;
  source: { name: string; url: string; originalUrl?: string | null; developmentOnly: boolean } | null;
  difficulty: RecipeDifficulty | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  totalTimeMinutes: number | null;
  servings: number | null;
  additionalTimeMinutes?: number | null;
  factSources?: FactSources;
  timingNote?: string | null;
  countries: CatalogName[];
  cuisines: CatalogName[];
  dietaryTags: CatalogName[];
  ingredients: IngredientLine[];
  steps: RecipeStep[];
};

export type DetailLoad =
  | { status: 'ok'; recipe: RecipeDetail }
  | { status: 'missing' }
  | { status: 'error' };

export type DetailView =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'error' }
  | { status: 'ready'; recipe: RecipeDetail };

export type SettledDetailView = Exclude<DetailView, { status: 'loading' }>;

export function recipeSlugFromParam(value: unknown): string | null {
  const slug = Array.isArray(value) ? value[0] : value;
  if (typeof slug !== 'string' || !isPublicSlug(slug)) return null;
  return slug;
}

/**
 * Trim trailing zeros on the API's three-decimal string.
 * The digits stay in the original character sequence.
 */
export function formatMeasuredQuantity(quantity: string): string | null {
  const match = quantityPattern.exec(quantity);
  if (!match) return null;
  const whole = match[1];
  const fraction = match[2];
  if (whole === undefined || fraction === undefined) return null;
  if (whole === '0' && fraction === '000') return null;
  const trimmed = fraction.replace(/0+$/, '');
  return trimmed.length === 0 ? whole : `${whole}.${trimmed}`;
}

export function ingredientAmountText(
  line: Pick<IngredientLine, 'qualitativeAmount' | 'quantity' | 'unit' | 'sourceMeasure'>,
  labels: { toTaste: string; unit: (unit: MeasuredUnit) => string },
): string | null {
  if (line.sourceMeasure) return line.sourceMeasure;
  if (line.qualitativeAmount === 'TO_TASTE') return labels.toTaste;
  if (line.quantity === null || line.unit === null) return null;
  const quantity = formatMeasuredQuantity(line.quantity);
  if (quantity === null) return null;
  return `${quantity} ${labels.unit(line.unit)}`;
}

export function readRecipeDetail(body: unknown): RecipeDetail | null {
  if (!body || typeof body !== 'object') return null;
  const item = body as Record<string, unknown>;
  if (!isPublicSlug(item.slug) || !isNonBlank(item.title) || typeof item.description !== 'string') return null;
  if (!isLanguage(item.requestedLanguage) || !isLanguage(item.contentLanguage) || !isLanguage(item.originalLanguage)) {
    return null;
  }
  if (typeof item.fallbackUsed !== 'boolean') return null;
  if (item.fallbackUsed !== (item.contentLanguage !== item.requestedLanguage)) return null;
  if (item.difficulty !== null && !isDifficulty(item.difficulty)) return null;
  const prepTimeMinutes = wholeNumber(item.prepTimeMinutes);
  const cookTimeMinutes = wholeNumber(item.cookTimeMinutes);
  const totalTimeMinutes = wholeNumber(item.totalTimeMinutes);
  const servings = wholeNumber(item.servings);
  if (["prepTimeMinutes", "cookTimeMinutes", "totalTimeMinutes", "servings"].some((key) => item[key] !== null && wholeNumber(item[key]) === null)) {
    return null;
  }
  const additionalTimeMinutes = item.additionalTimeMinutes === undefined ? 0 : wholeNumber(item.additionalTimeMinutes);
  if (item.additionalTimeMinutes !== undefined && item.additionalTimeMinutes !== null && additionalTimeMinutes === null) return null;
  const timingNote = readNote(item.timingNote ?? null);
  if (timingNote === undefined) return null;
  const countries = readNames(item.countries);
  const cuisines = readNames(item.cuisines);
  const dietaryTags = readNames(item.dietaryTags);
  const ingredients = readIngredients(item.ingredients);
  const steps = readSteps(item.steps);
  if (!countries || !cuisines || !dietaryTags || !ingredients || !steps) return null;
  return {
    photo: readRecipePhoto(item.photo),
    source: readRecipeSource(item.source),
    slug: item.slug,
    title: item.title.trim(),
    description: item.description,
    requestedLanguage: item.requestedLanguage,
    contentLanguage: item.contentLanguage,
    fallbackUsed: item.fallbackUsed,
    originalLanguage: item.originalLanguage,
    difficulty: item.difficulty,
    prepTimeMinutes,
    cookTimeMinutes,
    totalTimeMinutes,
    servings,
    additionalTimeMinutes,
    timingNote,
    factSources: readFactSources(item.factSources),
    countries,
    cuisines,
    dietaryTags,
    ingredients,
    steps,
  };
}

export function acceptDetailResponse(activeRequestId: number, responseRequestId: number, aborted: boolean): boolean {
  return aborted === false && activeRequestId === responseRequestId;
}

export function detailViewAfterResponse(
  active: { requestId: number },
  response: { requestId: number; aborted: boolean; result: DetailLoad },
): SettledDetailView | undefined {
  if (!acceptDetailResponse(active.requestId, response.requestId, response.aborted)) return undefined;
  if (response.result.status === 'ok') return { status: 'ready', recipe: response.result.recipe };
  return { status: response.result.status };
}

export async function fetchRecipeDetail(
  baseUrl: string,
  slug: string,
  language: RecipeLanguage,
  signal: AbortSignal,
): Promise<DetailLoad> {
  try {
    const response = await fetch(`${baseUrl}/recipes/${encodeURIComponent(slug)}?lang=${language}`, {
      signal,
      headers: { accept: 'application/json' },
    });
    if (response.status === 404) return { status: 'missing' };
    if (!response.ok) return { status: 'error' };
    const recipe = readRecipeDetail(await response.json());
    return recipe ? { status: 'ok', recipe } : { status: 'error' };
  } catch (error) {
    if (isAbortError(error)) throw error;
    return { status: 'error' };
  }
}

export function readPublicSlugPage(body: unknown): { slugs: string[]; pageCount: number } | null {
  if (!body || typeof body !== 'object') return null;
  const record = body as { items?: unknown; pageCount?: unknown };
  if (!Array.isArray(record.items) || !isWhole(record.pageCount)) return null;
  const slugs: string[] = [];
  for (const item of record.items) {
    if (!item || typeof item !== 'object') return null;
    const slug = (item as { slug?: unknown }).slug;
    if (!isPublicSlug(slug)) return null;
    slugs.push(slug);
  }
  return { slugs, pageCount: record.pageCount };
}

export async function loadPublicRecipeSlugs(baseUrl: string, fetchImpl: typeof fetch = fetch): Promise<string[]> {
  const slugs: string[] = [];
  const seen = new Set<string>();
  let page = 1;
  let pageCount = 1;
  do {
    const response = await fetchImpl(`${baseUrl}/recipes?lang=en&page=${page}&pageSize=50`, {
      headers: { accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Public recipe list failed (${response.status}).`);
    const parsed = readPublicSlugPage(await response.json());
    if (!parsed) throw new Error('Public recipe list was unreadable.');
    for (const slug of parsed.slugs) {
      if (seen.has(slug)) continue;
      seen.add(slug);
      slugs.push(slug);
    }
    pageCount = parsed.pageCount;
    page += 1;
  } while (page <= pageCount && page <= 1000);
  return slugs;
}

function readNames(value: unknown): CatalogName[] | null {
  if (!Array.isArray(value)) return null;
  const names: CatalogName[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') return null;
    const item = entry as { slug?: unknown; name?: unknown; language?: unknown };
    if (!isPublicSlug(item.slug) || !isNonBlank(item.name) || !isLanguage(item.language)) return null;
    names.push({ slug: item.slug, name: item.name.trim(), language: item.language });
  }
  return names;
}

function readIngredients(value: unknown): IngredientLine[] | null {
  if (!Array.isArray(value)) return null;
  const lines: IngredientLine[] = [];
  for (const entry of value) {
    const line = readIngredient(entry);
    if (!line) return null;
    lines.push(line);
  }
  return lines;
}

function readIngredient(value: unknown): IngredientLine | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  const position = wholeNumber(item.position);
  if (position === null || !isNonBlank(item.ingredientSlug) || !isNonBlank(item.name) || !isLanguage(item.language)) {
    return null;
  }
  if (typeof item.optional !== 'boolean') return null;
  if (item.qualitativeAmount !== null && item.qualitativeAmount !== 'TO_TASTE') return null;
  const note = readNote(item.note);
  if (note === undefined) return null;
  if (isNonBlank(item.sourceMeasure)) {
    if (item.quantity !== null || item.unit !== null || item.qualitativeAmount !== null) return null;
    return { position, ingredientSlug: String(item.ingredientSlug), name: String(item.name), language: item.language, quantity: null, unit: null, qualitativeAmount: null, optional: item.optional, note, sourceMeasure: item.sourceMeasure };
  }
  if (item.qualitativeAmount === 'TO_TASTE') {
    return {
      position,
      ingredientSlug: item.ingredientSlug.trim(),
      name: item.name.trim(),
      language: item.language,
      quantity: null,
      unit: null,
      qualitativeAmount: 'TO_TASTE',
      optional: item.optional,
      note,
    };
  }
  if (typeof item.quantity !== 'string' || formatMeasuredQuantity(item.quantity) === null || !isUnit(item.unit)) {
    return null;
  }
  return {
    position,
    ingredientSlug: item.ingredientSlug.trim(),
    name: item.name.trim(),
    language: item.language,
    quantity: item.quantity,
    unit: item.unit,
    qualitativeAmount: null,
    optional: item.optional,
    note,
  };
}

function readSteps(value: unknown): RecipeStep[] | null {
  if (!Array.isArray(value)) return null;
  const steps: RecipeStep[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') return null;
    const item = entry as { position?: unknown; instruction?: unknown };
    const position = wholeNumber(item.position);
    if (position === null || !isNonBlank(item.instruction)) return null;
    steps.push({ position, instruction: item.instruction.trim() });
  }
  return steps;
}

function readNote(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function isPublicSlug(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 80 && slugPattern.test(value);
}

function isLanguage(value: unknown): value is RecipeLanguage {
  return value === 'en' || value === 'ar';
}

function isDifficulty(value: unknown): value is RecipeDifficulty {
  return value === 'EASY' || value === 'MEDIUM' || value === 'HARD';
}

function isUnit(value: unknown): value is MeasuredUnit {
  return typeof value === 'string' && unitSet.has(value);
}

function isNonBlank(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function wholeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
}

function isWhole(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function readRecipeSource(value: unknown): RecipeDetail['source'] {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  if (item.name !== 'TheMealDB' || typeof item.url !== 'string' || !/^https:\/\/www\.themealdb\.com\/meal\/\d+$/.test(item.url) || typeof item.developmentOnly !== 'boolean') return null;
  let originalUrl: string | null = null;
  if (typeof item.originalUrl === 'string') {
    try { const url = new URL(item.originalUrl); if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) originalUrl = url.href; } catch { /* Invalid optional source link is omitted. */ }
  }
  return { name: item.name, url: item.url, originalUrl, developmentOnly: item.developmentOnly };
}

/** Display-only paragraphs; preserve source sentences and numbered steps. */
export function instructionParagraphs(instruction: string): string[] {
  return instruction.split(/\n+/).flatMap((block) => {
    const sentences = block.trim().split(/(?<=[.!?])\s+(?=[A-Z\u0600-\u06ff])/);
    const paragraphs: string[] = [];
    let paragraph = '';
    for (const sentence of sentences) {
      if (paragraph && paragraph.length + sentence.length > 260) {
        paragraphs.push(paragraph);
        paragraph = sentence;
      } else paragraph = paragraph ? `${paragraph} ${sentence}` : sentence;
    }
    if (paragraph) paragraphs.push(paragraph);
    return paragraphs;
  });
}
