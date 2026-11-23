import assert from 'node:assert/strict';
import test from 'node:test';
import { readHomeRecipes, readLiveRecipeList } from '../catalog/live-recipes.ts';
import { readRecipeDetail } from '../catalog/recipe-detail.ts';
import { matchKitchen } from '../kitchen/catalog.ts';
import { draftError } from '../recipes/drafts.ts';
import { savedListOwner } from '../recipes/saved.ts';
import { demoCatalogBody, demoDetailBody, demoHomeBody, demoListBody, demoRecipes } from './catalog.ts';
import { demoAccountProfile, localizeDemoProfile } from './profile.ts';
import { demoDraftSeed, demoKitchenSeed, demoProfileId, demoSavedSeed } from './seed.ts';

test('portfolio home, list, and detail stay local and coherent', () => {
  const home = readHomeRecipes(demoHomeBody('en'));
  assert.equal(home.ok, true);
  if (!home.ok || !home.home) return;
  assert.equal(home.home.featured?.slug, 'olive-oil-yogurt-cake');
  assert.equal(home.home.featured?.kicker, 'Home baking');
  assert.equal(home.home.quick.every((item) => (item.totalTimeMinutes ?? 99) <= 30), true);

  assert.deepEqual(home.home.picks.map((item) => item.slug), ['vegetable-tagine', 'chana-masala', 'spanish-tortilla']);
  assert.deepEqual(home.home.quick.map((item) => item.slug), ['greek-village-salad', 'semolina-milk-pudding', 'tofu-miso-soup', 'menemen']);
  const placed = [home.home.featured?.slug, ...home.home.picks.map((item) => item.slug), ...home.home.quick.map((item) => item.slug), ...home.home.more.map((item) => item.slug)];
  assert.deepEqual(placed.slice().sort(), demoRecipes.map((recipe) => recipe.slug).slice().sort());

  const mexican = readLiveRecipeList(demoListBody(new URLSearchParams({ lang: 'en', cuisine: 'mexican', page: '1', pageSize: '20' })));
  assert.equal(mexican.ok && mexican.total, 1);
  if (mexican.ok) assert.equal(mexican.items[0]?.kicker, 'Mexican');

  const italian = readLiveRecipeList(demoListBody(new URLSearchParams({ lang: 'ar', cuisine: 'italian', page: '1', pageSize: '20' })));
  assert.equal(italian.ok && italian.total, 2);
  if (italian.ok) assert.equal(italian.items.some((item) => item.title === 'ريزوتو الفطر'), true);

  const baking = readLiveRecipeList(demoListBody(new URLSearchParams({ lang: 'en', cuisine: 'home-baking', page: '1', pageSize: '20' })));
  assert.equal(baking.ok && baking.total, 2);

  const cake = readRecipeDetail(demoDetailBody('olive-oil-yogurt-cake', 'en'));
  assert.equal(cake?.prepTimeMinutes, 15);
  assert.equal(cake?.cookTimeMinutes, 40);
  assert.equal(cake?.servings, 8);
  assert.equal(cake?.difficulty, 'EASY');
  assert.match(cake?.timingNote ?? '', /rest for 10 minutes/);
  assert.equal(cake?.photo, null);

  const pudding = readRecipeDetail(demoDetailBody('semolina-milk-pudding', 'en'));
  assert.equal(pudding?.contentLanguage, 'ar');
  assert.equal(pudding?.title, 'سميد بالحليب');
  assert.equal(pudding?.fallbackUsed, true);
  assert.equal(demoCatalogBody('http://savora.local/recipes/does-not-exist'), null);
});

test('Arabic methods stay gender-neutral verbal nouns', () => {
  const command = /(?:^|[\s،.])(?:أضيفي|قطّعي|اخلطي|سخّني|اتركي|اطبخي|اخبزي|أضف|سخّن|اطبخ|قطّع)(?=$|[\s،.])/;
  for (const recipe of demoRecipes) {
    for (const step of recipe.steps) {
      assert.equal(command.test(step.ar ?? ''), false, `${recipe.slug}: ${step.ar}`);
    }
    assert.equal(command.test(recipe.timingNote?.ar ?? ''), false, `${recipe.slug}: ${recipe.timingNote?.ar}`);
  }
  const salad = demoRecipes.find((recipe) => recipe.slug === 'greek-village-salad');
  assert.match(salad?.steps[0]?.ar ?? '', /^تقطيع الطماطم/);
  assert.match(salad?.steps[1]?.ar ?? '', /^إضافة الزيتون/);
});

test('seeded kitchen, saves, drafts, and profile tell one story without the live catalog', () => {
  const matches = matchKitchen(demoKitchenSeed);
  assert.equal(matches.length >= 4, true);
  assert.equal(matches[0] && matches[0].matchedRequired / matches[0].requiredCount >= 0.75, true);
  assert.equal(matches.some((match) => match.matchedRequired > 0 && match.matchedRequired < match.requiredCount), true);
  assert.equal(matches.every((match) => match.missingRequired.every((slug) => typeof slug === 'string')), true);
  assert.equal(demoSavedSeed.length >= 5 && demoSavedSeed.length <= 6, true);
  const drafts = demoDraftSeed();
  assert.equal(drafts.length >= 3 && drafts.length <= 4, true);
  assert.equal(drafts.every((draft) => typeof draft.photoUri === 'string' && draft.photoUri.startsWith('savora-draft://')), true);
  assert.equal(drafts.every((draft) => draftError(draft) === null), true);
  assert.equal(demoRecipes.length >= 16 && demoRecipes.length <= 20, true);
  const maya = demoAccountProfile('en');
  assert.equal(maya.id, demoProfileId);
  assert.equal(savedListOwner('signed-in', maya.id), maya.id);
  assert.deepEqual(maya.cuisineInterests, ['levantine', 'italian']);
  assert.equal(localizeDemoProfile(maya, 'ar').firstName, 'مايا');
  assert.equal(localizeDemoProfile({ ...maya, firstName: 'Nour' }, 'ar').firstName, 'Nour');
});
