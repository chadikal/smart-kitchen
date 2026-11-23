import { genderedArabicCommand } from '../src/catalog/seed-catalog';
import { arabicRecipeTranslations } from '../src/imports/arabic-recipe-translations';

const expectedLengths: Record<string, { steps: number; ingredients: number }> = {
  'themealdb-air-fryer-egg-rolls': { steps: 11, ingredients: 14 },
  'themealdb-chicken-enchilada-casserole': { steps: 6, ingredients: 4 },
  'themealdb-garides-saganaki': { steps: 5, ingredients: 8 },
  'themealdb-gigantes-plaki': { steps: 2, ingredients: 10 },
  'themealdb-honey-yogurt-cheesecake': { steps: 3, ingredients: 10 },
  'themealdb-mediterranean-pasta-salad': { steps: 8, ingredients: 9 },
  'themealdb-spicy-north-african-potato-salad': { steps: 8, ingredients: 11 },
  'themealdb-teriyaki-chicken-casserole': { steps: 6, ingredients: 9 },
};

describe('reviewed Arabic recipe documents', () => {
  it('covers every imported recipe with a complete neutral translation', () => {
    expect(arabicRecipeTranslations.map((item) => item.slug).sort()).toEqual(Object.keys(expectedLengths).sort());
    for (const recipe of arabicRecipeTranslations) {
      const expected = expectedLengths[recipe.slug];
      expect(recipe.title.trim()).not.toBe('');
      expect(recipe.description.trim()).not.toBe('');
      expect(recipe.steps).toHaveLength(expected.steps);
      expect(recipe.ingredients).toHaveLength(expected.ingredients);
      for (const text of [recipe.title, recipe.description, ...recipe.steps, ...recipe.ingredients]) {
        expect(text.trim()).not.toBe('');
        expect(genderedArabicCommand.test(text)).toBe(false);
      }
    }
  });
});
