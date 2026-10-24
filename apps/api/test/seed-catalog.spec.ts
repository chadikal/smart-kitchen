import { dietaryTagsForRecipe, isArabicOnly, seedCatalog, SeedCatalogError, validateSeedCatalog } from '../src/catalog/seed-catalog';

describe('development seed catalog', () => {
  const ingredients = new Map(seedCatalog.ingredients.map((item) => [item.slug, item]));

  it('accepts the sample catalog', () => {
    expect(() => validateSeedCatalog(seedCatalog)).not.toThrow();
  });

  it('covers cooking, baking, bilingual recipes, and one Arabic-only recipe', () => {
    expect(seedCatalog.recipes).toHaveLength(8);
    expect(seedCatalog.recipes.filter((recipe) => recipe.baking)).toHaveLength(3);
    expect(seedCatalog.recipes.filter((recipe) => isArabicOnly(recipe)).map((recipe) => recipe.slug)).toEqual([
      'semolina-milk-pudding',
    ]);
    expect(new Set(seedCatalog.recipes.flatMap((recipe) => recipe.countries)).size).toBeGreaterThan(3);
  });

  it('assigns a dietary tag only when every ingredient supports it', () => {
    const tags = (slug: string) => {
      const recipe = seedCatalog.recipes.find((item) => item.slug === slug);
      if (!recipe) throw new Error(`Missing ${slug}`);
      return dietaryTagsForRecipe(recipe, ingredients);
    };
    expect(tags('red-lentil-lemon-soup')).toEqual([
      'vegetarian',
      'vegan',
      'gluten-free',
      'dairy-free',
    ]);
    expect(tags('lemon-herb-roast-chicken')).toEqual(['gluten-free', 'dairy-free']);
    expect(tags('olive-oil-yogurt-cake')).toEqual(['vegetarian']);
    expect(tags('tofu-miso-soup')).toEqual(['vegetarian', 'vegan', 'dairy-free']);
    expect(tags('semolina-milk-pudding')).toEqual(['vegetarian']);
  });

  it('keeps baking masses in grams and quantities as decimal strings', () => {
    const cake = seedCatalog.recipes.find((recipe) => recipe.slug === 'olive-oil-yogurt-cake');
    const flour = cake?.lines.find((line) => line.ingredientSlug === 'wheat-flour');
    expect(flour?.amount).toEqual({ quantity: '200.000', unit: 'GRAM' });
    const soup = seedCatalog.recipes.find((recipe) => recipe.slug === 'red-lentil-lemon-soup');
    expect(soup?.lines.some((line) => line.amount === 'TO_TASTE')).toBe(true);
    expect(soup?.lines.some((line) => line.optional)).toBe(true);
  });

  it('rejects an incomplete translation and a baking mass that is not weighed', () => {
    const broken = structuredClone(seedCatalog);
    const first = broken.recipes[0];
    if (!first || !first.translations.EN) throw new Error('Missing sample recipe');
    first.translations.EN.title = '   ';
    expect(() => validateSeedCatalog(broken)).toThrow(SeedCatalogError);

    const unweighed = structuredClone(seedCatalog);
    const cake = unweighed.recipes.find((recipe) => recipe.slug === 'olive-oil-yogurt-cake');
    const flour = cake?.lines.find((line) => line.ingredientSlug === 'wheat-flour');
    if (!flour || flour.amount === 'TO_TASTE') throw new Error('Missing flour line');
    flour.amount = { quantity: '1.000', unit: 'CUP' };
    expect(() => validateSeedCatalog(unweighed)).toThrow(/grams/);
  });
});
