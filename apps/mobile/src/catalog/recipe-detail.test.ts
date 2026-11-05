import assert from 'node:assert/strict';
import test from 'node:test';
import {
  detailViewAfterResponse,
  fetchRecipeDetail,
  formatMeasuredQuantity,
  ingredientAmountText,
  instructionParagraphs,
  metricUnitMilliliters,
  readRecipeDetail,
  recipeSlugFromParam,
  type RecipeDetail,
} from './recipe-detail.ts';

const labels = {
  toTaste: 'To taste',
  unit: (unit: string) => (unit === 'TABLESPOON' ? 'tbsp' : unit === 'TEASPOON' ? 'tsp' : unit.toLowerCase()),
};

function payload(): Record<string, unknown> {
  return {
    slug: 'measured-cake',
    title: 'Measured cake',
    description: '',
    requestedLanguage: 'en',
    contentLanguage: 'en',
    fallbackUsed: false,
    originalLanguage: 'en',
    difficulty: 'MEDIUM',
    prepTimeMinutes: 10,
    cookTimeMinutes: 20,
    totalTimeMinutes: 30,
    servings: 4,
    countries: [{ slug: 'france', name: 'France', language: 'en' }],
    cuisines: [{ slug: 'home-baking', name: 'Home baking', language: 'en' }],
    dietaryTags: [{ slug: 'vegetarian', name: 'Vegetarian', language: 'en' }],
    ingredients: [
      line(1, 'flour', 'Flour', { quantity: '12.500', unit: 'GRAM', note: 'sift' }),
      line(2, 'flour', 'Flour again', { quantity: '1.250', unit: 'CUP' }),
      line(3, 'salt', 'Salt', { qualitativeAmount: 'TO_TASTE', quantity: '9.000', unit: 'CUP' }),
      line(4, 'parsley', 'Parsley', { quantity: '2.000', unit: 'PIECE', optional: true, note: '   ' }),
    ],
    steps: [
      { position: 2, instruction: 'Second step' },
      { position: 1, instruction: 'First step' },
    ],
  };
}

function line(
  position: number,
  ingredientSlug: string,
  name: string,
  extra: Record<string, unknown>,
): Record<string, unknown> {
  return {
    position,
    ingredientSlug,
    name,
    language: 'en',
    quantity: null,
    unit: null,
    qualitativeAmount: null,
    optional: false,
    note: null,
    ...extra,
  };
}

test('quantity strings keep their exact digits and drop only trailing zeros', () => {
  assert.equal(formatMeasuredQuantity('12.500'), '12.5');
  assert.equal(formatMeasuredQuantity('200.000'), '200');
  assert.equal(formatMeasuredQuantity('0.125'), '0.125');
  assert.equal(formatMeasuredQuantity('10.010'), '10.01');
  assert.equal(formatMeasuredQuantity('10.001'), '10.001');
  assert.equal(formatMeasuredQuantity('1.005'), '1.005');
  assert.notEqual(formatMeasuredQuantity('1.005'), Number('1.005').toFixed(2));
  assert.equal(formatMeasuredQuantity('0.000'), null);
  assert.equal(formatMeasuredQuantity('12.50'), null);
  assert.equal(formatMeasuredQuantity(String(12.5)), null);
});

test('measured labels stay on the stored unit and the metric spoon sizes are not applied', () => {
  assert.deepEqual(metricUnitMilliliters, { TEASPOON: 5, TABLESPOON: 15, CUP: 250 });
  const amount = ingredientAmountText(
    { qualitativeAmount: null, quantity: '2.000', unit: 'TABLESPOON' },
    labels,
  );
  assert.equal(amount, '2 tbsp');
  assert.equal(amount?.includes(String(metricUnitMilliliters.TABLESPOON)), false);
  assert.equal(amount?.includes(String(metricUnitMilliliters.TABLESPOON * 2)), false);
});

test('TO_TASTE is text, including when a quantity and unit were sent beside it', () => {
  const amount = ingredientAmountText(
    { qualitativeAmount: 'TO_TASTE', quantity: '1.000', unit: 'TEASPOON' },
    labels,
  );
  assert.equal(amount, 'To taste');
  assert.equal(amount?.includes('1'), false);
  assert.equal(amount?.includes('tsp'), false);

  const recipe = readRecipeDetail(payload());
  assert.ok(recipe);
  assert.equal(recipe.ingredients[2]?.qualitativeAmount, 'TO_TASTE');
  assert.equal(recipe.ingredients[2]?.quantity, null);
  assert.equal(recipe.ingredients[2]?.unit, null);
});

test('optional lines, notes, and repeated ingredient lines keep their response order', () => {
  const recipe = readRecipeDetail(payload());
  assert.ok(recipe);
  assert.deepEqual(
    recipe.ingredients.map((item) => ({
      position: item.position,
      ingredientSlug: item.ingredientSlug,
      name: item.name,
      optional: item.optional,
      note: item.note,
    })),
    [
      { position: 1, ingredientSlug: 'flour', name: 'Flour', optional: false, note: 'sift' },
      { position: 2, ingredientSlug: 'flour', name: 'Flour again', optional: false, note: null },
      { position: 3, ingredientSlug: 'salt', name: 'Salt', optional: false, note: null },
      { position: 4, ingredientSlug: 'parsley', name: 'Parsley', optional: true, note: null },
    ],
  );
  assert.deepEqual(
    recipe.steps.map((step) => step.position),
    [2, 1],
  );
  assert.equal(recipe.description, '');
});

test('fallback follows the returned content language in both directions', () => {
  const arabic = readRecipeDetail({
    ...payload(),
    title: 'مهلبية السميد',
    requestedLanguage: 'en',
    contentLanguage: 'ar',
    fallbackUsed: true,
    originalLanguage: 'ar',
  });
  assert.ok(arabic);
  assert.equal(arabic.fallbackUsed, true);
  assert.equal(arabic.contentLanguage, 'ar');
  assert.equal(arabic.requestedLanguage, 'en');

  const english = readRecipeDetail({
    ...payload(),
    requestedLanguage: 'ar',
    contentLanguage: 'en',
    fallbackUsed: true,
  });
  assert.ok(english);
  assert.equal(english.contentLanguage, 'en');
  assert.equal(english.fallbackUsed, true);

  assert.equal(
    readRecipeDetail({ ...payload(), requestedLanguage: 'en', contentLanguage: 'en', fallbackUsed: true }),
    null,
  );
  assert.equal(
    readRecipeDetail({ ...payload(), requestedLanguage: 'en', contentLanguage: 'ar', fallbackUsed: false }),
    null,
  );
});

test('a numeric quantity is rejected instead of being parsed as a float', () => {
  const body = payload();
  const ingredients = body.ingredients as Record<string, unknown>[];
  ingredients[0] = { ...ingredients[0], quantity: 12.5 };
  assert.equal(readRecipeDetail(body), null);
});

test('404 is distinct from a network or server failure', async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  const signal = new AbortController().signal;

  globalThis.fetch = async () => new Response(JSON.stringify({ message: 'Recipe not found' }), { status: 404 });
  assert.deepEqual(await fetchRecipeDetail('http://example.test', 'missing-cake', 'ar', signal), {
    status: 'missing',
  });

  globalThis.fetch = async () => new Response('down', { status: 500 });
  assert.deepEqual(await fetchRecipeDetail('http://example.test', 'measured-cake', 'en', signal), {
    status: 'error',
  });

  globalThis.fetch = async () => {
    throw new TypeError('network');
  };
  assert.deepEqual(await fetchRecipeDetail('http://example.test', 'measured-cake', 'en', signal), {
    status: 'error',
  });

  globalThis.fetch = async () => new Response(JSON.stringify({ title: 'Incomplete' }), { status: 200 });
  assert.deepEqual(await fetchRecipeDetail('http://example.test', 'measured-cake', 'en', signal), {
    status: 'error',
  });
});

test('an aborted detail request is not reported as a failed load', async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  const controller = new AbortController();
  globalThis.fetch = ((_url: string, init?: RequestInit) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        const error = new Error('The operation was aborted.');
        error.name = 'AbortError';
        reject(error);
      });
    })) as typeof fetch;
  const pending = fetchRecipeDetail('http://example.test', 'measured-cake', 'en', controller.signal);
  controller.abort();
  await assert.rejects(pending, (error: unknown) => error instanceof Error && error.name === 'AbortError');
});

test('an older or aborted detail response cannot replace the current one', () => {
  const recipe = readRecipeDetail(payload());
  assert.ok(recipe);
  const ready: { status: 'ok'; recipe: RecipeDetail } = { status: 'ok', recipe };
  assert.equal(
    detailViewAfterResponse({ requestId: 2 }, { requestId: 1, aborted: false, result: ready }),
    undefined,
  );
  assert.equal(
    detailViewAfterResponse({ requestId: 2 }, { requestId: 2, aborted: true, result: { status: 'missing' } }),
    undefined,
  );
  assert.deepEqual(
    detailViewAfterResponse({ requestId: 2 }, { requestId: 2, aborted: false, result: ready }),
    { status: 'ready', recipe },
  );
  assert.deepEqual(
    detailViewAfterResponse({ requestId: 4 }, { requestId: 4, aborted: false, result: { status: 'error' } }),
    { status: 'error' },
  );
});

test('only a public recipe slug is accepted from the route', () => {
  assert.equal(recipeSlugFromParam('semolina-milk-pudding'), 'semolina-milk-pudding');
  assert.equal(recipeSlugFromParam(['olive-oil-yogurt-cake']), 'olive-oil-yogurt-cake');
  assert.equal(recipeSlugFromParam('../private'), null);
  assert.equal(recipeSlugFromParam(''), null);
  assert.equal(recipeSlugFromParam('Has Spaces'), null);
});


test('imported recipes retain unknown facts, exact source measures and verified photo metadata', () => {
  const body = payload();
  Object.assign(body, { difficulty: null, prepTimeMinutes: null, cookTimeMinutes: null, totalTimeMinutes: null, servings: null,
    photo: { url: 'https://www.themealdb.com/images/media/meals/qtuwxu1468233098.jpg', attribution: 'TheMealDB', sourceUrl: 'https://www.themealdb.com/meal/52765' },
    source: { name: 'TheMealDB', url: 'https://www.themealdb.com/meal/52765', developmentOnly: true },
    ingredients: [line(1, 'source-sauce', 'Sauce', { sourceMeasure: '14 oz jar' })] });
  const recipe = readRecipeDetail(body);
  assert.ok(recipe);
  assert.equal(recipe.servings, null);
  assert.equal(recipe.totalTimeMinutes, null);
  assert.equal(ingredientAmountText(recipe.ingredients[0]!, labels), '14 oz jar');
  assert.equal(recipe.photo?.attribution, 'TheMealDB');
  assert.equal(recipe.source?.developmentOnly, true);
  body.ingredients = [line(1, 'source-sauce', 'Sauce', { sourceMeasure: '14 oz jar', quantity: '1.000', unit: 'CUP' })];
  assert.equal(readRecipeDetail(body), null);
});

test('untrusted photo and source URLs are not exposed as images or links', () => {
  const body = payload();
  body.photo = { url: 'https://evil.example/photo.jpg', attribution: 'TheMealDB', sourceUrl: 'javascript:alert(1)' };
  body.source = { name: 'TheMealDB', url: 'javascript:alert(1)', developmentOnly: true };
  const recipe = readRecipeDetail(body);
  assert.ok(recipe);
  assert.equal(recipe.photo, null);
  assert.equal(recipe.source, null);
});


test('long instructions get display paragraphs without losing text or changing step numbers', () => {
  const source = 'Start layering the casserole. ' + 'Place tortillas, chicken, sauce and cheese in the dish. '.repeat(12) + 'Serve warm.';
  const paragraphs = instructionParagraphs(source);
  assert.ok(paragraphs.length > 1);
  assert.equal(paragraphs.join(' '), source);
  assert.deepEqual(instructionParagraphs('Heat to 200.5 degrees. Serve warm.'), ['Heat to 200.5 degrees. Serve warm.']);
  assert.deepEqual(instructionParagraphs('First paragraph.\n\nSecond paragraph.'), ['First paragraph.', 'Second paragraph.']);
});


test('reviewed facts preserve evidence, waiting time and timing notes', () => {
  const body = payload();
  Object.assign(body, { additionalTimeMinutes: null, totalTimeMinutes: null, timingNote: 'Soak overnight.', factSources: { prepTimeMinutes: 'SOURCE', totalTimeMinutes: 'UNKNOWN', difficulty: 'EDITORIAL' } });
  const recipe = readRecipeDetail(body);
  assert.ok(recipe);
  assert.equal(recipe.totalTimeMinutes, null);
  assert.equal(recipe.additionalTimeMinutes, null);
  assert.equal(recipe.factSources?.difficulty, 'EDITORIAL');
  assert.equal(recipe.timingNote, 'Soak overnight.');
  body.additionalTimeMinutes = -1;
  assert.equal(readRecipeDetail(body), null);
});
