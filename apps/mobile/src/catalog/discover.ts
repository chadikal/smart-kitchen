import type { LiveRecipeCard, LiveRecipeResult } from './live-recipes.ts';

export const discoverPageSize = 20;
export const maxMinuteChoices = [15, 30, 45, 60, 120] as const;

export type DiscoverDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type DiscoverSort = 'title' | 'fastest' | 'easiest';

export const discoverSorts: DiscoverSort[] = ['title', 'fastest', 'easiest'];

export type DiscoverFilters = {
  country: string | null;
  cuisine: string | null;
  dietaryTag: string | null;
  difficulty: DiscoverDifficulty | null;
  maxTotalMinutes: number | null;
};

export type CatalogOption = {
  slug: string;
  name: string;
  language: 'en' | 'ar';
  fallbackUsed: boolean;
};

export type BrowseKind = 'replace' | 'refresh' | 'more';

export type BrowseStatus =
  | 'loading'
  | 'refreshing'
  | 'ready'
  | 'error'
  | 'loadingMore'
  | 'loadMoreError';

export type BrowseState = {
  items: LiveRecipeCard[];
  total: number;
  page: number;
  status: BrowseStatus;
  requestId: number;
};

export function emptyDiscoverFilters(): DiscoverFilters {
  return {
    country: null,
    cuisine: null,
    dietaryTag: null,
    difficulty: null,
    maxTotalMinutes: null,
  };
}

export function filtersAreActive(filters: DiscoverFilters): boolean {
  return Object.values(filters).some((value) => value !== null);
}

export function activeFilterKeys(filters: DiscoverFilters): (keyof DiscoverFilters)[] {
  return (Object.keys(filters) as (keyof DiscoverFilters)[]).filter((key) => filters[key] !== null);
}

export function removeDiscoverFilter(filters: DiscoverFilters, key: keyof DiscoverFilters): DiscoverFilters {
  return { ...filters, [key]: null };
}

export function recipeSearchParams(input: {
  language: 'en' | 'ar';
  query: string;
  filters: DiscoverFilters;
  page: number;
  sort?: DiscoverSort;
}): URLSearchParams {
  const params = new URLSearchParams({
    lang: input.language,
    page: String(input.page),
    pageSize: String(discoverPageSize),
  });
  const query = input.query.trim();
  if (input.sort && input.sort !== 'title') params.set('sort', input.sort);
  if (query.length > 0) params.set('q', query);
  if (input.filters.country) params.set('country', input.filters.country);
  if (input.filters.cuisine) params.set('cuisine', input.filters.cuisine);
  if (input.filters.dietaryTag) params.set('dietaryTag', input.filters.dietaryTag);
  if (input.filters.difficulty) params.set('difficulty', input.filters.difficulty);
  if (input.filters.maxTotalMinutes !== null) {
    params.set('maxTotalMinutes', String(input.filters.maxTotalMinutes));
  }
  return params;
}

export function initialBrowseState(): BrowseState {
  return { items: [], total: 0, page: 1, status: 'loading', requestId: 0 };
}

export function canLoadMore(state: BrowseState): boolean {
  return (
    (state.status === 'ready' || state.status === 'loadMoreError') &&
    state.items.length < state.total
  );
}

export function planBrowse(state: BrowseState, kind: BrowseKind): BrowseState | null {
  const next = beginBrowse(state, kind);
  return next === state ? null : next;
}

export function retainNewerBrowse(current: BrowseState, incoming: BrowseState): BrowseState {
  if (incoming.requestId < current.requestId) return current;
  if (incoming.requestId > current.requestId) return incoming;
  if (browseSettled(current.status) && !browseSettled(incoming.status)) return current;
  return incoming;
}

export function responseStillCurrent(
  activeRequestId: number,
  responseRequestId: number,
  aborted: boolean,
): boolean {
  return aborted === false && activeRequestId === responseRequestId;
}

export type OptionRequest = {
  generation: number;
  language: 'en' | 'ar';
};

export function beginOptionRequest(
  previous: OptionRequest | null,
  language: 'en' | 'ar',
): OptionRequest {
  return { generation: (previous?.generation ?? 0) + 1, language };
}

export function acceptOptionResponse(active: OptionRequest, response: OptionRequest): boolean {
  return active.generation === response.generation && active.language === response.language;
}

export function nextPreviewRequest(current: number): number {
  return current + 1;
}

export function acceptPreviewResponse(active: number, response: number, aborted: boolean): boolean {
  return aborted === false && active === response;
}

export function pendingPreviewCount(): 'pending' {
  return 'pending';
}

export function previewCountFromBody(body: unknown): number | null {
  if (!body || typeof body !== 'object') return null;
  const total = (body as { total?: unknown }).total;
  return typeof total === 'number' && Number.isFinite(total) ? total : null;
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function browseSettled(status: BrowseStatus): boolean {
  return status === 'ready' || status === 'error' || status === 'loadMoreError';
}

export function beginBrowse(state: BrowseState, kind: BrowseKind): BrowseState {
  const requestId = state.requestId + 1;
  if (kind === 'more') {
    if (!canLoadMore(state)) return state;
    return { ...state, requestId, status: 'loadingMore' };
  }
  if (kind === 'refresh') {
    return {
      ...state,
      requestId,
      status: state.items.length > 0 ? 'refreshing' : 'loading',
    };
  }
  return { ...state, requestId, items: [], total: 0, page: 1, status: 'loading' };
}

export function completeBrowse(
  state: BrowseState,
  input: {
    requestId: number;
    kind: BrowseKind;
    page: number;
    result: LiveRecipeResult;
  },
): BrowseState {
  if (input.requestId !== state.requestId) return state;
  if (!input.result.ok) {
    if (input.kind === 'more') return { ...state, status: 'loadMoreError' };
    if (input.kind === 'refresh' && state.items.length > 0) return { ...state, status: 'error' };
    return { ...state, status: 'error', items: [], total: 0, page: 1 };
  }
  const items =
    input.kind === 'more' ? mergeCards(state.items, input.result.items) : input.result.items;
  return {
    ...state,
    items,
    total: input.result.total,
    page: input.page,
    status: 'ready',
  };
}

export function readCatalogOptions(body: unknown): CatalogOption[] | null {
  if (!body || typeof body !== 'object' || !Array.isArray((body as { items?: unknown }).items)) {
    return null;
  }
  const items: CatalogOption[] = [];
  for (const value of (body as { items: unknown[] }).items) {
    if (!value || typeof value !== 'object') return null;
    const item = value as {
      slug?: unknown;
      name?: unknown;
      language?: unknown;
      fallbackUsed?: unknown;
    };
    if (typeof item.slug !== 'string' || typeof item.name !== 'string') return null;
    if (item.language !== 'en' && item.language !== 'ar') return null;
    if (typeof item.fallbackUsed !== 'boolean') return null;
    items.push({
      slug: item.slug,
      name: item.name,
      language: item.language,
      fallbackUsed: item.fallbackUsed,
    });
  }
  return items;
}

function mergeCards(current: LiveRecipeCard[], next: LiveRecipeCard[]): LiveRecipeCard[] {
  const seen = new Set(current.map((item) => item.slug));
  return [...current, ...next.filter((item) => !seen.has(item.slug))];
}

/** Home links replace filters once; ordinary tab/back navigation keeps local state. */
export function discoverSelectionFromParams(params: { country?: unknown; q?: unknown }): {
  query: string;
  filters: DiscoverFilters;
} | null {
  if (params.country === undefined && params.q === undefined) return null;
  const country = typeof params.country === 'string' && params.country.length <= 80 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(params.country)
    ? params.country : null;
  const query = typeof params.q === 'string' ? params.q.trim().slice(0, 100) : '';
  return { query, filters: { ...emptyDiscoverFilters(), country } };
}
