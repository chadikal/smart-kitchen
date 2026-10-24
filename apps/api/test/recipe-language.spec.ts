import { formatQuantity } from '../src/recipes/recipe.mapper';
import {
  isCompleteTranslation,
  selectCatalogLabel,
  selectRecipeDocument,
} from '../src/recipes/recipe-language';

describe('recipe language selection', () => {
  const english = (title: string, instructions: Array<string | undefined>) => ({
    language: 'EN' as const,
    title,
    instructions,
  });
  const arabic = (title: string, instructions: Array<string | undefined>) => ({
    language: 'AR' as const,
    title,
    instructions,
  });

  it('requires a trimmed title and one trimmed instruction per step', () => {
    expect(isCompleteTranslation('Soup', [])).toBe(true);
    expect(isCompleteTranslation('  ', [])).toBe(false);
    expect(isCompleteTranslation('Soup', ['Simmer'])).toBe(true);
    expect(isCompleteTranslation('Soup', ['  '])).toBe(false);
    expect(isCompleteTranslation('Soup', ['Simmer', undefined])).toBe(false);
  });

  it('uses a complete requested translation without calling it a fallback', () => {
    const selected = selectRecipeDocument(
      'EN',
      [english('Lemon', ['Stir']), arabic('ليمون', ['حرّك'])],
      'AR',
    );
    expect(selected).toEqual({
      translation: arabic('ليمون', ['حرّك']),
      fallbackUsed: false,
    });
  });

  it('falls back to the whole original document when the requested translation is incomplete', () => {
    const selected = selectRecipeDocument(
      'EN',
      [english('Lemon', ['Stir', 'Serve']), arabic('ليمون', ['حرّك', undefined])],
      'AR',
    );
    expect(selected?.translation).toEqual(english('Lemon', ['Stir', 'Serve']));
    expect(selected?.fallbackUsed).toBe(true);
  });

  it('falls back from English to an Arabic-only original', () => {
    const selected = selectRecipeDocument('AR', [arabic('مهلبية', ['اطبخ'])], 'EN');
    expect(selected?.translation.language).toBe('AR');
    expect(selected?.fallbackUsed).toBe(true);
  });

  it('hides a recipe whose original translation is incomplete', () => {
    expect(
      selectRecipeDocument(
        'AR',
        [arabic('ناقص', ['   ']), english('Complete', ['Cook'])],
        'EN',
      ),
    ).toBeNull();
  });

  it('does not borrow a catalog name when the original-language name is blank', () => {
    expect(
      selectCatalogLabel('EN', [{ language: 'AR', name: 'اسم' }], 'AR'),
    ).toBeNull();
    expect(
      selectCatalogLabel(
        'EN',
        [
          { language: 'EN', name: 'Kitchen' },
          { language: 'AR', name: '   ' },
        ],
        'AR',
      ),
    ).toEqual({ name: 'Kitchen', language: 'EN' });
    expect(
      selectCatalogLabel(
        'EN',
        [
          { language: 'EN', name: 'Kitchen' },
          { language: 'AR', name: 'مطبخ' },
        ],
        'AR',
      ),
    ).toEqual({ name: 'مطبخ', language: 'AR' });
  });

  it('serializes a measured quantity with exactly three decimal places', () => {
    expect(formatQuantity({ toFixed: (digits) => (12.5).toFixed(digits) })).toBe('12.500');
    expect(formatQuantity(null)).toBeNull();
  });
});
