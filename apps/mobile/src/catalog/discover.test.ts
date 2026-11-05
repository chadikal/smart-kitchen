import assert from 'node:assert/strict';
import test from 'node:test';
import {
  acceptOptionResponse,
  activeFilterKeys,
  removeDiscoverFilter,
  acceptPreviewResponse,
  beginBrowse,
  discoverSelectionFromParams,
  beginOptionRequest,
  canLoadMore,
  completeBrowse,
  emptyDiscoverFilters,
  filtersAreActive,
  initialBrowseState,
  isAbortError,
  nextPreviewRequest,
  pendingPreviewCount,
  planBrowse,
  previewCountFromBody,
  readCatalogOptions,
  recipeSearchParams,
  responseStillCurrent,
  retainNewerBrowse,
  type DiscoverFilters,
} from './discover.ts';
import type { LiveRecipeCard } from './live-recipes.ts';

function card(slug: string, contentLanguage: 'en' | 'ar', fallback: boolean): LiveRecipeCard {
  return {
    slug,
    title: slug,
    totalTimeMinutes: 20,
    difficulty: 'EASY',
    kicker: 'Lebanon',
    dietaryNames: ['Vegetarian'],
    fallback,
    contentLanguage,
  };
}

const filters: DiscoverFilters = {
  ...emptyDiscoverFilters(),
  country: 'lebanon',
  cuisine: 'levantine',
  dietaryTag: 'vegetarian',
  difficulty: 'EASY',
  maxTotalMinutes: 30,
};

test('removing one active filter preserves search-independent filter choices', () => {
  assert.equal(activeFilterKeys(filters).length, 5);
  const next = removeDiscoverFilter(filters, 'country');
  assert.equal(next.country, null);
  assert.equal(next.cuisine, 'levantine');
  assert.equal(activeFilterKeys(next).length, 4);
  assert.equal(filters.country, 'lebanon');
  assert.deepEqual(activeFilterKeys(emptyDiscoverFilters()), []);
});

test('sort queries are applied by the server on every requested page', () => {
  for (const sort of ['fastest', 'easiest'] as const) {
    const params = recipeSearchParams({ language: 'ar', query: 'soup', filters, page: 2, sort });
    assert.equal(params.get('sort'), sort);
    assert.equal(params.get('page'), '2');
    assert.equal(params.get('q'), 'soup');
  }
  assert.equal(recipeSearchParams({ language: 'en', query: '', filters, page: 1, sort: 'title' }).has('sort'), false);
});

test('recipe queries use only supported list parameters and reset to page 1', () => {
  const params = recipeSearchParams({
    language: 'ar',
    query: '  عدس  ',
    filters,
    page: 1,
  });
  assert.deepEqual([...params.keys()].sort(), [
    'country',
    'cuisine',
    'dietaryTag',
    'difficulty',
    'lang',
    'maxTotalMinutes',
    'page',
    'pageSize',
    'q',
  ]);
  assert.equal(params.get('q'), 'عدس');
  assert.equal(params.get('lang'), 'ar');
  assert.equal(params.get('page'), '1');
  assert.equal(params.get('country'), 'lebanon');
  assert.equal(params.get('maxTotalMinutes'), '30');
  assert.equal(params.has('sort'), false);

  const cleared = recipeSearchParams({
    language: 'en',
    query: '   ',
    filters: emptyDiscoverFilters(),
    page: 1,
  });
  assert.deepEqual([...cleared.keys()].sort(), ['lang', 'page', 'pageSize']);
  assert.equal(filtersAreActive(filters), true);
  assert.equal(filtersAreActive(emptyDiscoverFilters()), false);
});

test('a new search replaces the page and ignores an older response', () => {
  const started = beginBrowse(initialBrowseState(), 'replace');
  const firstPage = completeBrowse(started, {
    requestId: started.requestId,
    kind: 'replace',
    page: 1,
    result: { ok: true, items: [card('one', 'en', false)], total: 2 },
  });
  const replaced = beginBrowse(firstPage, 'replace');
  assert.equal(replaced.page, 1);
  assert.deepEqual(replaced.items, []);
  const stale = completeBrowse(replaced, {
    requestId: started.requestId,
    kind: 'replace',
    page: 1,
    result: { ok: true, items: [card('stale', 'ar', true)], total: 9 },
  });
  assert.equal(stale, replaced);
  const current = completeBrowse(replaced, {
    requestId: replaced.requestId,
    kind: 'replace',
    page: 1,
    result: { ok: true, items: [card('two', 'ar', true)], total: 1 },
  });
  assert.equal(current.items[0]?.slug, 'two');
  assert.equal(current.items[0]?.contentLanguage, 'ar');
  assert.equal(current.items[0]?.fallback, true);
});

test('load-more failure keeps the current page and retry appends the next page', () => {
  let state = completeBrowse(beginBrowse(initialBrowseState(), 'replace'), {
    requestId: 1,
    kind: 'replace',
    page: 1,
    result: { ok: true, items: [card('one', 'en', false)], total: 3 },
  });
  const loading = beginBrowse(state, 'more');
  assert.equal(loading.status, 'loadingMore');
  state = completeBrowse(loading, {
    requestId: loading.requestId,
    kind: 'more',
    page: 2,
    result: { ok: false },
  });
  assert.equal(state.status, 'loadMoreError');
  assert.deepEqual(state.items.map((item) => item.slug), ['one']);
  assert.equal(canLoadMore(state), true);
  const retry = beginBrowse(state, 'more');
  state = completeBrowse(retry, {
    requestId: retry.requestId,
    kind: 'more',
    page: 2,
    result: { ok: true, items: [card('one', 'en', false), card('two', 'en', true)], total: 3 },
  });
  assert.deepEqual(state.items.map((item) => item.slug), ['one', 'two']);
  assert.equal(state.page, 2);
  assert.equal(state.items[1]?.fallback, true);
  assert.equal(state.items[1]?.contentLanguage, 'en');
});

test('refresh failure keeps visible recipes and a replace failure can be retried', () => {
  const ready = completeBrowse(beginBrowse(initialBrowseState(), 'replace'), {
    requestId: 1,
    kind: 'replace',
    page: 1,
    result: { ok: true, items: [card('kept', 'en', false)], total: 1 },
  });
  const refreshing = beginBrowse(ready, 'refresh');
  assert.equal(refreshing.status, 'refreshing');
  const failedRefresh = completeBrowse(refreshing, {
    requestId: refreshing.requestId,
    kind: 'refresh',
    page: 1,
    result: { ok: false },
  });
  assert.equal(failedRefresh.status, 'error');
  assert.equal(failedRefresh.items[0]?.slug, 'kept');

  const empty = completeBrowse(beginBrowse(initialBrowseState(), 'replace'), {
    requestId: 1,
    kind: 'replace',
    page: 1,
    result: { ok: false },
  });
  assert.equal(empty.status, 'error');
  assert.deepEqual(empty.items, []);
  const retry = beginBrowse(empty, 'replace');
  assert.equal(retry.status, 'loading');
  assert.notEqual(retry.requestId, empty.requestId);
});

test('a deferred browse update keeps the request that already started', () => {
  const visible = initialBrowseState();
  const planned = planBrowse(visible, 'replace');
  assert.ok(planned);
  assert.equal(planned.requestId, 1);
  const settled = completeBrowse(planned, {
    requestId: planned.requestId,
    kind: 'replace',
    page: 1,
    result: { ok: true, items: [card('one', 'en', false)], total: 1 },
  });
  const flushedStart = retainNewerBrowse(settled, planned);
  assert.equal(flushedStart.status, 'ready');
  assert.equal(flushedStart.items[0]?.slug, 'one');

  const replaced = planBrowse(settled, 'replace');
  assert.ok(replaced);
  const lateStart = retainNewerBrowse(replaced, planned);
  assert.equal(lateStart.requestId, replaced.requestId);
  assert.equal(responseStillCurrent(replaced.requestId, planned.requestId, false), false);
  assert.equal(responseStillCurrent(replaced.requestId, replaced.requestId, true), false);
  assert.equal(responseStillCurrent(replaced.requestId, replaced.requestId, false), true);
  assert.equal(planBrowse(visible, 'more'), null);
});

test('option and preview responses from a replaced request are ignored', () => {
  const english = beginOptionRequest(null, 'en');
  const retry = beginOptionRequest(english, 'en');
  const arabic = beginOptionRequest(retry, 'ar');
  assert.equal(acceptOptionResponse(arabic, english), false);
  assert.equal(acceptOptionResponse(arabic, retry), false);
  assert.equal(acceptOptionResponse(arabic, arabic), true);
  assert.equal(isAbortError(Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' })), true);
  assert.equal(isAbortError(new Error('unavailable')), false);

  const firstPreview = nextPreviewRequest(0);
  const draftChanged = nextPreviewRequest(firstPreview);
  assert.equal(pendingPreviewCount(), 'pending');
  assert.equal(acceptPreviewResponse(draftChanged, firstPreview, false), false);
  assert.equal(acceptPreviewResponse(draftChanged, draftChanged, true), false);
  assert.equal(acceptPreviewResponse(draftChanged, draftChanged, false), true);
  assert.equal(previewCountFromBody({ total: 4 }), 4);
  assert.equal(previewCountFromBody({ total: Number.NaN }), null);
  assert.equal(previewCountFromBody(null), null);
});

test('catalog options require a translated label and reject a partial list', () => {
  const options = readCatalogOptions({
    items: [
      { slug: 'lebanon', name: 'لبنان', language: 'ar', fallbackUsed: false },
      { slug: 'japan', name: 'Japan', language: 'en', fallbackUsed: true },
    ],
  });
  assert.equal(options?.[0]?.language, 'ar');
  assert.equal(options?.[1]?.fallbackUsed, true);
  assert.equal(readCatalogOptions({ items: [{ slug: 'lebanon', name: 'Lebanon' }] }), null);
  assert.equal(readCatalogOptions({ total: 1 }), null);
});

test('Home country and browse links replace filters without resetting ordinary back navigation', () => {
  assert.equal(discoverSelectionFromParams({}), null);
  const country = discoverSelectionFromParams({ country: 'lebanon', q: '' });
  assert.deepEqual(country, { query: '', filters: { ...emptyDiscoverFilters(), country: 'lebanon' } });
  assert.deepEqual(discoverSelectionFromParams({ country: '', q: '  lemon  ' }), { query: 'lemon', filters: emptyDiscoverFilters() });
  assert.deepEqual(discoverSelectionFromParams({ country: '', q: '' }), { query: '', filters: emptyDiscoverFilters() });
  assert.equal(discoverSelectionFromParams({ country: ['lebanon'], q: ['bad'] })?.filters.country, null);
  assert.equal(discoverSelectionFromParams({ country: '../private' })?.filters.country, null);
});
