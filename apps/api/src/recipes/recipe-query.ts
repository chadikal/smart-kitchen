import { PublicLanguage } from './recipe-language';

export const defaultPage = 1;
export const maxPage = 1000;
export const defaultPageSize = 20;
export const maxPageSize = 50;
export const maxTotalMinutesLimit = 10080;
export const maxQueryLength = 100;
export const maxSlugLength = 80;

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const difficulties = new Set(['EASY', 'MEDIUM', 'HARD']);
const listParameters = new Set([
  'lang',
  'q',
  'country',
  'cuisine',
  'dietaryTag',
  'difficulty',
  'maxTotalMinutes',
  'page',
  'pageSize',
  'sort',
]);

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type RecipeSort = 'title' | 'fastest' | 'easiest';

export interface RecipeListQuery {
  lang: PublicLanguage;
  q?: string;
  country?: string;
  cuisine?: string;
  dietaryTag?: string;
  difficulty?: Difficulty;
  maxTotalMinutes?: number;
  page: number;
  pageSize: number;
  sort?: RecipeSort;
}

export class RecipeQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RecipeQueryError';
  }
}

export function parseRecipeListQuery(query: Record<string, unknown>): RecipeListQuery {
  rejectUnknown(query, listParameters);
  const lang = parseLanguage(optionalString(query, 'lang'));
  const parsed: RecipeListQuery = {
    lang,
    page: parseInteger(optionalString(query, 'page'), 'page', 1, maxPage, defaultPage),
    pageSize: parseInteger(
      optionalString(query, 'pageSize'),
      'pageSize',
      1,
      maxPageSize,
      defaultPageSize,
    ),
  };
  const q = optionalString(query, 'q');
  const sort = optionalString(query, 'sort');
  if (sort !== undefined) {
    if (sort !== 'title' && sort !== 'fastest' && sort !== 'easiest') {
      throw new RecipeQueryError('Invalid query parameter: sort.');
    }
    parsed.sort = sort;
  }
  if (q !== undefined) {
    const trimmed = q.trim();
    if (trimmed.length < 1 || trimmed.length > maxQueryLength) {
      throw new RecipeQueryError('Invalid query parameter: q.');
    }
    parsed.q = trimmed;
  }
  const country = parseSlugFilter(optionalString(query, 'country'), 'country');
  const cuisine = parseSlugFilter(optionalString(query, 'cuisine'), 'cuisine');
  const dietaryTag = parseSlugFilter(optionalString(query, 'dietaryTag'), 'dietaryTag');
  if (country) parsed.country = country;
  if (cuisine) parsed.cuisine = cuisine;
  if (dietaryTag) parsed.dietaryTag = dietaryTag;
  const difficulty = optionalString(query, 'difficulty');
  if (difficulty !== undefined) {
    if (!difficulties.has(difficulty)) {
      throw new RecipeQueryError('Invalid query parameter: difficulty.');
    }
    parsed.difficulty = difficulty as Difficulty;
  }
  const maxTotalMinutes = optionalString(query, 'maxTotalMinutes');
  if (maxTotalMinutes !== undefined) {
    parsed.maxTotalMinutes = parseInteger(
      maxTotalMinutes,
      'maxTotalMinutes',
      0,
      maxTotalMinutesLimit,
    );
  }
  return parsed;
}

export function parseRecipeDetailQuery(query: Record<string, unknown>): {
  lang: PublicLanguage;
} {
  rejectUnknown(query, new Set(['lang']));
  return { lang: parseLanguage(optionalString(query, 'lang')) };
}

export function parseRecipeSlug(slug: string): string {
  if (!isSlug(slug)) throw new RecipeQueryError('Invalid query parameter: slug.');
  return slug;
}

export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

function rejectUnknown(query: Record<string, unknown>, allowed: Set<string>): void {
  for (const key of Object.keys(query)) {
    if (!allowed.has(key)) throw new RecipeQueryError(`Invalid query parameter: ${key}.`);
  }
}

function optionalString(query: Record<string, unknown>, name: string): string | undefined {
  if (!Object.prototype.hasOwnProperty.call(query, name)) return undefined;
  const value = query[name];
  if (typeof value !== 'string') {
    throw new RecipeQueryError(`Invalid query parameter: ${name}.`);
  }
  return value;
}

function parseLanguage(value: string | undefined): PublicLanguage {
  if (value === undefined || value === 'en') return 'en';
  if (value === 'ar') return 'ar';
  throw new RecipeQueryError('Invalid query parameter: lang.');
}

function parseInteger(
  value: string | undefined,
  name: string,
  min: number,
  max: number,
  fallback?: number,
): number {
  if (value === undefined) {
    if (fallback === undefined) throw new RecipeQueryError(`Invalid query parameter: ${name}.`);
    return fallback;
  }
  if (!/^(0|[1-9]\d*)$/.test(value)) {
    throw new RecipeQueryError(`Invalid query parameter: ${name}.`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw new RecipeQueryError(`Invalid query parameter: ${name}.`);
  }
  return parsed;
}

function parseSlugFilter(value: string | undefined, name: string): string | undefined {
  if (value === undefined) return undefined;
  if (!isSlug(value)) throw new RecipeQueryError(`Invalid query parameter: ${name}.`);
  return value;
}

function isSlug(value: string): boolean {
  return value.length <= maxSlugLength && slugPattern.test(value);
}
