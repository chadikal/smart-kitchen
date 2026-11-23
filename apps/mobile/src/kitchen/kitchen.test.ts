import assert from 'node:assert/strict';
import test from 'node:test';
import type { KeyValueStore } from '../auth/session-storage.ts';
import {
  filterKitchenIngredients,
  kitchenIngredientName,
  kitchenIngredients,
  kitchenRecipeCopy,
  kitchenRecipes,
  matchKitchen,
  previewMissing,
  readKitchenSelection,
  serializeKitchenSelection,
  toggleKitchenIngredient,
} from './catalog.ts';
import { kitchenStorageKey, loadKitchenSelection, saveKitchenSelection } from './storage.ts';

const offered = new Set(kitchenIngredients.map((item) => item.slug));

test('the picker offers exactly the ingredients used by the portfolio recipes', () => {
  const used = new Set(kitchenRecipes.flatMap((recipe) => recipe.lines.map((line) => line.ingredientSlug)));
  assert.deepEqual([...offered].sort(), [...used].sort());
  assert.equal(offered.has('chicken'), true);
  assert.equal(kitchenRecipes.some((recipe) => recipe.slug === 'red-lentil-lemon-soup'), true);
  assert.equal(kitchenRecipes.some((recipe) => recipe.slug === 'chana-masala'), true);
});

test('optional parsley does not count as a required lentil ingredient', () => {
  const parsley = matchKitchen(['flat-leaf-parsley']);
  const soup = parsley.find((match) => match.slug === 'red-lentil-lemon-soup');
  assert.ok(soup);
  assert.equal(soup.matchedRequired, 0);
  assert.equal(soup.requiredCount, 8);
  assert.deepEqual(soup.matchedOptional, ['flat-leaf-parsley']);
  assert.equal(soup.missingRequired.includes('flat-leaf-parsley'), false);
  assert.equal(soup.missingRequired.includes('red-lentils'), true);

  const withLentils = matchKitchen(['flat-leaf-parsley', 'red-lentils']);
  const lentilSoup = withLentils.find((match) => match.slug === 'red-lentil-lemon-soup');
  assert.equal(lentilSoup?.matchedRequired, 1);
  assert.equal(lentilSoup?.missingRequired.includes('red-lentils'), false);
});

test('matches are ordered by the share of required ingredients, then by how many are available', () => {
  assert.deepEqual(matchKitchen([]), []);
  const originals = kitchenRecipes.filter((recipe) =>
    ['olive-oil-yogurt-cake', 'semolina-milk-pudding', 'red-lentil-lemon-soup'].includes(recipe.slug));
  const ranked = matchKitchen(['olive-oil', 'sugar', 'wheat-flour', 'plain-yogurt', 'egg', 'baking-powder'], originals);
  assert.deepEqual(ranked.map((match) => match.slug), ['olive-oil-yogurt-cake', 'semolina-milk-pudding', 'red-lentil-lemon-soup']);
  assert.equal(ranked[0]?.matchedRequired, 6);
  assert.equal(ranked[0]?.requiredCount, 6);
  assert.deepEqual(ranked[0]?.missingRequired, []);

  const tied = matchKitchen(['olive-oil', 'sugar', 'wheat-flour', 'garlic', 'yellow-onion', 'red-lentils'], originals);
  assert.equal(tied[0]?.matchedRequired, 4);
  assert.equal(tied[0]?.requiredCount, 8);
  assert.equal(tied[1]?.matchedRequired, 3);
  assert.equal(tied[1]?.requiredCount, 6);
  assert.equal(tied[0]?.slug, 'red-lentil-lemon-soup');
  assert.equal(tied[1]?.slug, 'olive-oil-yogurt-cake');
});

test('a selection outside the current recipe set can still find no match', () => {
  const soupOnly = kitchenRecipes.filter((recipe) => recipe.slug === 'red-lentil-lemon-soup');
  assert.deepEqual(matchKitchen(['semolina'], soupOnly), []);
  assert.deepEqual(matchKitchen(['not-a-real-ingredient']), []);
});

test('names follow the selected language while the stored ids stay the same', () => {
  assert.equal(kitchenIngredientName('semolina', 'en'), 'Semolina');
  assert.equal(kitchenIngredientName('semolina', 'ar'), 'سميد');
  assert.deepEqual(filterKitchenIngredients('سميد', 'ar').map((item) => item.slug), ['semolina']);
  assert.deepEqual(filterKitchenIngredients('semolina', 'ar').map((item) => item.slug), []);
  assert.deepEqual(filterKitchenIngredients('semolina', 'en').map((item) => item.slug), ['semolina']);
  const pudding = kitchenRecipes.find((recipe) => recipe.slug === 'semolina-milk-pudding');
  assert.ok(pudding);
  assert.deepEqual(kitchenRecipeCopy(pudding, 'en'), {
    title: 'سميد بالحليب',
    contentLanguage: 'ar',
    fallback: true,
  });
  assert.equal(kitchenRecipeCopy(pudding, 'ar').fallback, false);
  assert.deepEqual(previewMissing(['a', 'b', 'c', 'd', 'e'], 2), { shown: ['a', 'b'], extra: 3 });
  assert.deepEqual(previewMissing(['a', 'b'], 2), { shown: ['a', 'b'], extra: 0 });
  assert.deepEqual(toggleKitchenIngredient(['semolina'], 'semolina'), []);
  assert.deepEqual(toggleKitchenIngredient(['semolina'], 'not-a-real-ingredient'), ['semolina']);
  assert.deepEqual(toggleKitchenIngredient(['semolina'], 'chicken'), ['semolina', 'chicken']);
});

test('kitchen selections persist as ingredient ids and drop unknown ids', async () => {
  const memory = new Map<string, string>();
  const store: KeyValueStore = {
    async getItem(key) { return memory.get(key) ?? null; },
    async setItem(key, value) { memory.set(key, value); },
    async removeItem(key) { memory.delete(key); },
  };
  await saveKitchenSelection(store, ['olive-oil', 'not-an-ingredient', 'olive-oil', 'sugar']);
  assert.equal(memory.get(kitchenStorageKey), serializeKitchenSelection(['olive-oil', 'sugar']));
  assert.deepEqual(await loadKitchenSelection(store), ['olive-oil', 'sugar']);
  memory.set(kitchenStorageKey, JSON.stringify(['butter', 'not-an-ingredient']));
  assert.deepEqual(readKitchenSelection(memory.get(kitchenStorageKey) ?? null), ['butter']);
  assert.deepEqual(readKitchenSelection('not-json'), []);
  assert.deepEqual(await loadKitchenSelection(store), ['butter']);
});
