import assert from 'node:assert/strict';
import test from 'node:test';
import { readLiveRecipeList } from './live-recipes.ts';

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
