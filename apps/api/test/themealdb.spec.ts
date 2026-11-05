import { MealDbClient, MealDbError, parseMealDbRecipe, type MealDbFetch } from '../src/imports/themealdb.client';
import { collectMealDbBatch, parseImportOptions } from '../src/imports/themealdb.import';

function source(overrides: Record<string, unknown> = {}) {
  return {
    idMeal: '52772', strMeal: 'Source recipe', strArea: 'Japanese', strCountry: 'Japan',
    strCategory: 'Chicken', strInstructions: '  Original instructions.\r\nDo not rewrite.  ',
    strIngredient1: 'Rice', strMeasure1: ' 1 1/2 cups ',
    strIngredient2: 'Salt', strMeasure2: 'to taste',
    strIngredient3: '', strMeasure3: '',
    strMealThumb: 'https://www.themealdb.com/images/media/meals/example.jpg',
    strSource: 'https://example.org/original-recipe', strImageSource: null,
    strCreativeCommonsConfirmed: null,
    ...overrides,
  };
}

describe('TheMealDB data adapter', () => {
  it('preserves original measurements, order, instructions, and source metadata', () => {
    const raw = source();
    const recipe = parseMealDbRecipe(raw);
    expect(recipe.ingredients).toEqual([
      { position: 1, ingredient: 'Rice', measure: ' 1 1/2 cups ' },
      { position: 2, ingredient: 'Salt', measure: 'to taste' },
    ]);
    expect(recipe.instructionsText).toBe(raw.strInstructions);
    expect(recipe.rawPayload).toBe(raw);
    expect(recipe.licenseMetadata.strCreativeCommonsConfirmed).toBeNull();
    expect(recipe.originalLanguage).toBe('EN');
    expect(recipe).not.toHaveProperty('prepTimeMinutes');
    expect(recipe).not.toHaveProperty('servings');
    expect(recipe.reviewWarnings).toEqual(expect.arrayContaining(['IMAGE_RIGHTS_NOT_REVIEWED', 'MEASUREMENTS_REQUIRE_REVIEW', 'NO_ARABIC_TRANSLATION']));
  });

  it('keeps unpaired source measurements for review instead of guessing an ingredient', () => {
    const recipe = parseMealDbRecipe(source({ strIngredient3: null, strMeasure3: '1 tin' }));
    expect(recipe.ingredients[2]).toEqual({ position: 3, ingredient: null, measure: '1 tin' });
    expect(recipe.reviewWarnings).toContain('INGREDIENT_NAME_MISSING_AT_3');
  });

  it('never treats a missing or unsafe photo URL as licensed provider artwork', () => {
    for (const strMealThumb of ['https://example.org/image.jpg', 'http://www.themealdb.com/images/media/meals/a.jpg', 'https://www.themealdb.com:444/images/media/meals/a.jpg', 'javascript:alert(1)', null]) {
      const recipe = parseMealDbRecipe(source({ strMealThumb, strSource: 'javascript:alert(1)' }));
      expect(recipe.imageUrl).toBeNull();
      expect(recipe.sourceUrl).toBeNull();
      expect(recipe.reviewWarnings).toContain('NO_USABLE_PROVIDER_PHOTO');
    }
  });

  it('rejects malformed records without inventing missing instructions', () => {
    for (const overrides of [{ idMeal: '../secret' }, { strInstructions: '  ' }, { strIngredient1: 2 }, { strMeal: null }]) {
      expect(() => parseMealDbRecipe(source(overrides))).toThrow(MealDbError);
    }
  });
});

describe('TheMealDB HTTP adapter', () => {
  it('uses only the fixed official endpoint, encodes input, and applies timeout/redirect controls', async () => {
    const calls: { url: URL; init: RequestInit }[] = [];
    const fetcher: MealDbFetch = async (url, init) => {
      calls.push({ url, init });
      return Response.json({ meals: [{ idMeal: '52772', strMeal: 'Source recipe' }] });
    };
    const rows = await new MealDbClient('1', fetcher).listByArea('Japanese');
    expect(rows).toEqual([{ externalId: '52772', title: 'Source recipe' }]);
    expect(calls[0].url.origin).toBe('https://www.themealdb.com');
    expect(calls[0].url.pathname).toBe('/api/json/v1/1/filter.php');
    expect(calls[0].url.searchParams.get('a')).toBe('Japanese');
    expect(calls[0].init.redirect).toBe('error');
    expect(calls[0].init.signal).toBeInstanceOf(AbortSignal);
  });

  it('handles no matches, lookup identity, and unsafe arguments', async () => {
    expect(await new MealDbClient('1', async () => Response.json({ meals: null })).listByArea('French')).toEqual([]);
    expect(await new MealDbClient('1', async () => Response.json({ meals: null })).lookup('52772')).toBeNull();
    await expect(new MealDbClient('1', async () => Response.json({ meals: [source({ idMeal: '52773' })] })).lookup('52772')).rejects.toThrow('different recipe ID');
    await expect(new MealDbClient().listByArea('Japan&apiKey=other')).rejects.toThrow(MealDbError);
    await expect(new MealDbClient().lookup('https://example.com')).rejects.toThrow(MealDbError);
    expect(() => new MealDbClient('../other')).toThrow(MealDbError);
  });

  it('reports HTTP failure, timeout, invalid JSON, and oversized responses without exposing keys', async () => {
    const failures: MealDbFetch[] = [
      async () => new Response('quota', { status: 429 }),
      async () => { throw new Error('https://www.themealdb.com/api/json/v1/private-key/lookup.php'); },
      async () => new Response('not json'),
      async () => new Response('x'.repeat(2 * 1024 * 1024 + 1)),
    ];
    for (const fetcher of failures) {
      await expect(new MealDbClient('privatekey', fetcher).lookup('52772')).rejects.toThrow(MealDbError);
      try { await new MealDbClient('privatekey', fetcher).lookup('52772'); }
      catch (error) { expect(String(error)).not.toMatch(/private-?key|https:/); }
    }
  });
});

describe('bounded import workflow', () => {
  it('defaults to a dry run and rejects target overrides and unbounded batches', () => {
    expect(parseImportOptions([])).toMatchObject({ apply: false, limit: 3 });
    expect(parseImportOptions(['--area', 'Italian', '--limit', '2', '--apply'])).toMatchObject({ areas: ['Italian'], limit: 2, apply: true });
    expect(parseImportOptions(['--list']).list).toBe(true);
    for (const args of [['--limit', '26'], ['--database', 'production'], ['--apply', '--apply'], ['--area', 'Italian', '--area', 'Italian'], ['--list', '--apply']]) {
      expect(() => parseImportOptions(args)).toThrow(MealDbError);
    }
  });

  it('deduplicates source IDs across areas and reports empty areas without fabricated recipes', async () => {
    let lookups = 0;
    const client = new MealDbClient('1', async (url) => {
      if (url.pathname.endsWith('filter.php')) return Response.json({ meals: url.searchParams.get('a') === 'French' ? null : [{ idMeal: '52772', strMeal: 'Source recipe' }] });
      lookups++;
      return Response.json({ meals: [source()] });
    });
    const result = await collectMealDbBatch(client, { areas: ['Italian', 'Japanese', 'French'], limit: 2 }, async () => {});
    expect(result.recipes).toHaveLength(1);
    expect(lookups).toBe(1);
    expect(result.areas[2]).toEqual({ area: 'French', available: 0, selected: 0 });
  });
});
