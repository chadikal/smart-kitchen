import {
  escapeLike,
  parseRecipeDetailQuery,
  parseRecipeListQuery,
  parseRecipeSlug,
  RecipeQueryError,
} from '../src/recipes/recipe-query';

describe('recipe query parsing', () => {
  it('applies documented defaults', () => {
    expect(parseRecipeListQuery({})).toEqual({ lang: 'en', page: 1, pageSize: 20 });
    expect(parseRecipeDetailQuery({})).toEqual({ lang: 'en' });
  });

  it('accepts a bounded list query', () => {
    expect(
      parseRecipeListQuery({
        lang: 'ar',
        q: '  lemon  ',
        country: 'lebanon',
        cuisine: 'home-baking',
        dietaryTag: 'gluten-free',
        difficulty: 'MEDIUM',
        maxTotalMinutes: '30',
        page: '2',
        pageSize: '50',
      }),
    ).toEqual({
      lang: 'ar',
      q: 'lemon',
      country: 'lebanon',
      cuisine: 'home-baking',
      dietaryTag: 'gluten-free',
      difficulty: 'MEDIUM',
      maxTotalMinutes: 30,
      page: 2,
      pageSize: 50,
    });
  });

  it('rejects malformed list and detail input', () => {
    const rejected = [
      { lang: 'EN' },
      { lang: 'fr' },
      { page: '0' },
      { page: '1001' },
      { page: '01' },
      { pageSize: '51' },
      { pageSize: '1.5' },
      { difficulty: 'easy' },
      { maxTotalMinutes: '-1' },
      { maxTotalMinutes: '10081' },
      { q: '   ' },
      { q: 'x'.repeat(101) },
      { country: 'Lebanon' },
      { cuisine: 'french-' },
      { dietaryTag: 'a_b' },
      { sort: 'title' },
      { page: ['1', '2'] },
    ];
    for (const query of rejected) {
      expect(() => parseRecipeListQuery(query)).toThrow(RecipeQueryError);
    }
    expect(() => parseRecipeDetailQuery({ ownerId: '1' })).toThrow(RecipeQueryError);
    expect(() => parseRecipeSlug('Not-A-Slug')).toThrow(RecipeQueryError);
    expect(parseRecipeSlug('red-lentil-lemon-soup')).toBe('red-lentil-lemon-soup');
  });

  it('escapes LIKE wildcards', () => {
    expect(escapeLike('100%_\\')).toBe('100\\%\\_\\\\');
  });
});
