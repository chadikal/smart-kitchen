import assert from 'node:assert/strict';
import test from 'node:test';
import { readLiveRecipeList, recipeFactsText, readHomeRecipes } from './live-recipes.ts';

function payload(contentLanguage: 'en' | 'ar', fallbackUsed: boolean) {
  return {
    total: 1,
    items: [
      {
        slug: 'olive-oil-yogurt-cake',
        title: contentLanguage === 'ar' ? 'كعكة الزبادي بزيت الزيتون' : 'Olive oil yogurt cake',
        totalTimeMinutes: 60,
        difficulty: 'EASY',
        fallbackUsed,
        contentLanguage,
        countries: [{ name: 'France' }],
        cuisines: [{ name: 'Home baking' }],
      },
    ],
  };
}

test('live cards keep the returned content language for both fallback directions', () => {
  const arabic = readLiveRecipeList(payload('ar', true));
  assert.equal(arabic.ok, true);
  if (!arabic.ok) return;
  assert.equal(arabic.items[0]?.fallback, true);
  assert.equal(arabic.items[0]?.contentLanguage, 'ar');

  const english = readLiveRecipeList(payload('en', true));
  assert.equal(english.ok, true);
  if (!english.ok) return;
  assert.equal(english.items[0]?.fallback, true);
  assert.equal(english.items[0]?.contentLanguage, 'en');
  assert.equal(english.items[0]?.title, 'Olive oil yogurt cake');
});

test('live cards without a content language are dropped', () => {
  const body = payload('en', false);
  const item = body.items[0];
  assert.ok(item);
  delete (item as { contentLanguage?: string }).contentLanguage;
  const result = readLiveRecipeList(body);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.items, []);
});

test('live cards accept unknown metadata without showing fabricated zero-minute recipes', () => {
  const body = payload('en', false);
  Object.assign(body.items[0]!, { totalTimeMinutes: null, difficulty: null });
  const result = readLiveRecipeList(body);
  assert.ok(result.ok);
  assert.equal(result.items.length, 1);
  assert.equal(recipeFactsText(result.items[0]!, (key) => key), '');
});


test('Home keeps editorial sections and rejects duplicates or unknown quick-cooking times', () => {
  const card = payload('en', false).items[0]!;
  const featured = { ...card, slug: 'featured' };
  const pick = { ...card, slug: 'pick' };
  const quick = { ...card, slug: 'quick', totalTimeMinutes: 25 };
  const body = { featured, picks: [pick], quick: [quick], more: [] };
  const result = readHomeRecipes(body);
  assert.ok(result.ok);
  assert.equal(result.home?.featured?.slug, 'featured');
  assert.deepEqual(result.home?.picks.map((item) => item.slug), ['pick']);
  assert.equal(readHomeRecipes({ ...body, more: [pick] }).ok, false);
  assert.equal(readHomeRecipes({ ...body, quick: [{ ...quick, totalTimeMinutes: null }] }).ok, false);
  assert.equal(readHomeRecipes({ ...body, quick: [{ ...quick, totalTimeMinutes: 31 }] }).ok, false);
  assert.equal(readHomeRecipes({ ...body, quick: [{ ...quick, factSources: { totalTimeMinutes: 'ESTIMATE' } }] }).ok, false);
  assert.equal(readHomeRecipes({ featured: null, picks: [], quick: [], more: [] }).ok, true);
});


test('card times visibly qualify estimates and keep source-backed times unqualified', () => {
  const t = (_key: string, values?: Record<string, unknown>) => `${values?.count} min`;
  assert.equal(recipeFactsText({ totalTimeMinutes: 45, difficulty: null, factSources: { totalTimeMinutes: 'ESTIMATE' } }, t), '\u2248 45 min');
  assert.equal(recipeFactsText({ totalTimeMinutes: 45, difficulty: null, factSources: { totalTimeMinutes: 'SOURCE' } }, t), '45 min');
});
