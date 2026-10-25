import assert from 'node:assert/strict';
import test from 'node:test';
import {
  featuredSampleSlug,
  sampleCountryCards,
  sampleKicker,
  sampleRecipes,
  sampleSearchLayout,
  sampleTitle,
  sampleTotalMinutes,
  titleMatches,
  type SampleRecipe,
} from './sample-recipes.ts';

test('sample recipes keep catalog titles, times, and countries', () => {
  const cake = sampleRecipes.find((recipe) => recipe.slug === featuredSampleSlug);
  assert.ok(cake);
  assert.equal(sampleTitle(cake, 'en').title, 'Olive oil yogurt cake');
  assert.equal(sampleTitle(cake, 'ar').title, 'كعكة الزبادي بزيت الزيتون');
  assert.equal(sampleTotalMinutes(cake), 60);
  assert.equal(sampleKicker(cake, 'en'), 'France · Home baking');

  const pudding = sampleRecipes.find((recipe) => recipe.slug === 'semolina-milk-pudding');
  assert.ok(pudding);
  assert.equal(pudding.titles.en, undefined);
  assert.equal(sampleTitle(pudding, 'en').fallback, true);
  assert.equal(sampleTitle(pudding, 'en').contentLanguage, 'ar');
  assert.equal(sampleTitle(pudding, 'en').title, 'سميد بالحليب');

  assert.deepEqual(
    sampleCountryCards('en').map((country) => [country.slug, country.recipeCount]),
    [
      ['italy', 1],
      ['japan', 1],
      ['lebanon', 2],
      ['france', 2],
      ['mexico', 1],
    ],
  );
  assert.equal(
    sampleRecipes.some((recipe) => recipe.countries.includes('morocco')),
    false,
  );
});

test('selected-language search uses only the title shown for that language', () => {
  const soup = sampleRecipes[0];
  const pudding = sampleRecipes.find((recipe) => recipe.slug === 'semolina-milk-pudding');
  assert.ok(soup);
  assert.ok(pudding);
  assert.equal(titleMatches(soup, 'en', '   '), true);
  assert.equal(titleMatches(soup, 'en', 'lentil'), true);
  assert.equal(titleMatches(soup, 'ar', 'عدس'), true);
  assert.equal(titleMatches(soup, 'en', 'عدس'), false);
  assert.equal(titleMatches(soup, 'ar', 'lentil'), false);
  assert.equal(titleMatches(pudding, 'en', 'سميد'), true);
  assert.equal(titleMatches(soup, 'en', 'shakshuka'), false);
});

test('fallback names the language of the returned title in both directions', () => {
  const pudding = sampleRecipes.find((recipe) => recipe.slug === 'semolina-milk-pudding');
  assert.ok(pudding);
  const arabicFallback = sampleTitle(pudding, 'en');
  assert.equal(arabicFallback.fallback, true);
  assert.equal(arabicFallback.contentLanguage, 'ar');

  const englishOnly: SampleRecipe = {
    slug: 'english-only',
    prepTimeMinutes: 1,
    cookTimeMinutes: 1,
    difficulty: 'EASY',
    countries: [],
    cuisines: [],
    originalLanguage: 'en',
    titles: { en: 'English only title' },
  };
  const englishFallback = sampleTitle(englishOnly, 'ar');
  assert.equal(englishFallback.fallback, true);
  assert.equal(englishFallback.contentLanguage, 'en');
  assert.equal(englishFallback.title, 'English only title');
  assert.equal(sampleTitle(englishOnly, 'en').fallback, false);
});

test('featured-only results omit the sample list and empty results show the message', () => {
  const cakeOnly = sampleSearchLayout(sampleRecipes, 'en', 'yogurt');
  assert.equal(cakeOnly.featured?.slug, featuredSampleSlug);
  assert.deepEqual(cakeOnly.rest, []);
  assert.equal(cakeOnly.showSampleList, false);
  assert.equal(cakeOnly.showEmpty, false);

  const none = sampleSearchLayout(sampleRecipes, 'en', 'shakshuka');
  assert.equal(none.featured, undefined);
  assert.equal(none.showSampleList, false);
  assert.equal(none.showEmpty, true);

  const soupOnly = sampleSearchLayout(sampleRecipes, 'ar', 'عدس');
  assert.equal(soupOnly.featured, undefined);
  assert.equal(soupOnly.showEmpty, false);
  assert.equal(soupOnly.showSampleList, true);
  assert.deepEqual(
    soupOnly.rest.map((recipe) => recipe.slug),
    ['red-lentil-lemon-soup'],
  );
});
