import assert from 'node:assert/strict';
import test from 'node:test';
import type { KeyValueStore } from '../auth/session-storage.ts';
import type { DetailLoad } from '../catalog/recipe-detail.ts';
import { loadSavedSlugs, saveSavedSlugs, savedRecipesKey } from './storage.ts';
import { readSavedSlugs, savedListOwner, savedRecipeFromDetail, toggleSavedSlug } from './saved.ts';

const account = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';

function memory(): KeyValueStore & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    async getItem(key) { return values.get(key) ?? null; },
    async setItem(key, value) { values.set(key, value); },
    async removeItem(key) { values.delete(key); },
  };
}

test('saved slugs stay unique and accept demo routes', () => {
  const once = toggleSavedSlug([], 'demo-olive-oil-yogurt-cake');
  const twice = toggleSavedSlug(once, 'demo-olive-oil-yogurt-cake');
  const added = toggleSavedSlug(once, 'red-lentil-lemon-soup');
  assert.deepEqual(twice, []);
  assert.deepEqual(added, ['red-lentil-lemon-soup', 'demo-olive-oil-yogurt-cake']);
  assert.deepEqual(toggleSavedSlug(added, 'not a slug'), added);
});

test('stored saves drop duplicates and unknown values', () => {
  const raw = JSON.stringify(['olive-oil-yogurt-cake', 'olive-oil-yogurt-cake', 'Chicken', 4, 'demo-semolina']);
  assert.deepEqual(readSavedSlugs(raw), ['olive-oil-yogurt-cake', 'demo-semolina']);
  assert.deepEqual(readSavedSlugs('not-json'), []);
});

test('guest and account lists stay on separate device keys', async () => {
  const store = memory();
  await saveSavedSlugs(store, 'guest', ['olive-oil-yogurt-cake']);
  await saveSavedSlugs(store, account, ['demo-red-lentil-lemon-soup']);
  await saveSavedSlugs(store, other, []);
  assert.notEqual(savedRecipesKey('guest'), savedRecipesKey(account));
  assert.deepEqual(await loadSavedSlugs(store, 'guest'), ['olive-oil-yogurt-cake']);
  assert.deepEqual(await loadSavedSlugs(store, account), ['demo-red-lentil-lemon-soup']);
  assert.deepEqual(await loadSavedSlugs(store, other), []);
  assert.equal(savedListOwner('guest', account), 'guest');
  assert.equal(savedListOwner('signed-in', account), account);
  assert.equal(savedListOwner('signed-in', null), null);
  assert.equal(savedListOwner('loading', null), null);
});

test('each saved slug is resolved from its own detail result', () => {
  const missing = savedRecipeFromDetail({ status: 'missing' });
  const failed = savedRecipeFromDetail({ status: 'error' });
  const ready = savedRecipeFromDetail({
    status: 'ok',
    recipe: {
      slug: 'demo-olive-oil-yogurt-cake',
      title: 'Olive oil yogurt cake',
      description: '',
      requestedLanguage: 'en',
      contentLanguage: 'en',
      fallbackUsed: false,
      originalLanguage: 'en',
      photo: null,
      source: null,
      difficulty: 'EASY',
      prepTimeMinutes: null,
      cookTimeMinutes: null,
      totalTimeMinutes: 60,
      servings: null,
      countries: [],
      cuisines: [],
      dietaryTags: [],
      ingredients: [],
      steps: [],
    },
  } satisfies DetailLoad);
  assert.equal(missing.status, 'missing');
  assert.equal(failed.status, 'error');
  assert.equal(ready.status, 'ready');
  if (ready.status === 'ready') {
    assert.equal(ready.card.slug, 'demo-olive-oil-yogurt-cake');
    assert.equal(ready.card.totalTimeMinutes, 60);
  }
});
