// ECMAScript String.trim whitespace, shared with PostgreSQL completeness checks.
export const trimCharacters = '\u0009\u000a\u000b\u000c\u000d\u0020\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff';

export type PublicLanguage = 'en' | 'ar';
export type DatabaseLanguage = 'EN' | 'AR';

export function toDatabaseLanguage(language: PublicLanguage): DatabaseLanguage {
  return language === 'ar' ? 'AR' : 'EN';
}

export function toPublicLanguage(language: DatabaseLanguage): PublicLanguage {
  return language === 'AR' ? 'ar' : 'en';
}

export interface RecipeDocumentTranslation {
  language: DatabaseLanguage;
  title: string;
  instructions: readonly (string | undefined)[];
}

/**
 * A translation is complete when its title is nonblank after trimming and every
 * step has its own nonblank instruction. A recipe with no steps needs only the title.
 * This is the same rule as the SQL predicate in RecipesService.
 */
export function isCompleteTranslation(
  title: string,
  instructions: readonly (string | undefined)[],
): boolean {
  if (title.trim() === '') return false;
  return instructions.every(
    (instruction) => instruction !== undefined && instruction.trim() !== '',
  );
}

/**
 * Prefer a complete requested-language document. Otherwise use the complete
 * original-language document. An incomplete original document is invalid even
 * when another language is complete.
 */
export function selectRecipeDocument<T extends RecipeDocumentTranslation>(
  originalLanguage: DatabaseLanguage,
  translations: readonly T[],
  requested: DatabaseLanguage,
): { translation: T; fallbackUsed: boolean } | null {
  const original = translations.find((translation) => translation.language === originalLanguage);
  if (
    !original ||
    !isCompleteTranslation(original.title, original.instructions)
  ) {
    return null;
  }
  const requestedTranslation = translations.find(
    (translation) => translation.language === requested,
  );
  if (
    requestedTranslation &&
    isCompleteTranslation(requestedTranslation.title, requestedTranslation.instructions)
  ) {
    return { translation: requestedTranslation, fallbackUsed: false };
  }
  return {
    translation: original,
    fallbackUsed: original.language !== requested,
  };
}

export function selectCatalogLabel(
  originalLanguage: DatabaseLanguage,
  names: readonly { language: DatabaseLanguage; name: string }[],
  requested: DatabaseLanguage,
): { name: string; language: DatabaseLanguage } | null {
  const original = names.find(
    (name) => name.language === originalLanguage && name.name.trim() !== '',
  );
  if (!original) return null;
  const requestedName = names.find(
    (name) => name.language === requested && name.name.trim() !== '',
  );
  if (requestedName) {
    return { name: requestedName.name, language: requested };
  }
  return { name: original.name, language: originalLanguage };
}
