export type SampleLanguage = 'en' | 'ar';
/**
 * Display fields copied from the sample catalog in apps/api/src/catalog/seed-catalog.ts.
 * This is a preview fixture for the Home screen. It is not a response from the recipe API.
 */
export type SampleDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type SampleRecipe = {
  slug: string;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  difficulty: SampleDifficulty;
  countries: readonly string[];
  cuisines: readonly string[];
  originalLanguage: SampleLanguage;
  titles: { en?: string; ar?: string };
};

export const featuredSampleSlug = 'olive-oil-yogurt-cake';

export const sampleRecipes: readonly SampleRecipe[] = [
  {
    slug: 'red-lentil-lemon-soup',
    prepTimeMinutes: 15,
    cookTimeMinutes: 30,
    difficulty: 'EASY',
    countries: ['lebanon'],
    cuisines: ['levantine'],
    originalLanguage: 'en',
    titles: { en: 'Red lentil lemon soup', ar: 'شوربة عدس بالليمون' },
  },
  {
    slug: 'lemon-herb-roast-chicken',
    prepTimeMinutes: 20,
    cookTimeMinutes: 75,
    difficulty: 'MEDIUM',
    countries: ['france'],
    cuisines: ['french'],
    originalLanguage: 'en',
    titles: { en: 'Lemon herb roast chicken', ar: 'دجاج مشوي بالليمون والأعشاب' },
  },
  {
    slug: 'tomato-white-beans',
    prepTimeMinutes: 10,
    cookTimeMinutes: 25,
    difficulty: 'EASY',
    countries: ['italy'],
    cuisines: ['italian'],
    originalLanguage: 'en',
    titles: { en: 'Tomato white beans', ar: 'فاصولياء بيضاء بالطماطم' },
  },
  {
    slug: 'olive-oil-yogurt-cake',
    prepTimeMinutes: 20,
    cookTimeMinutes: 40,
    difficulty: 'EASY',
    countries: ['france'],
    cuisines: ['home-baking'],
    originalLanguage: 'en',
    titles: { en: 'Olive oil yogurt cake', ar: 'كعكة الزبادي بزيت الزيتون' },
  },
  {
    slug: 'sesame-butter-shortbread',
    prepTimeMinutes: 20,
    cookTimeMinutes: 18,
    difficulty: 'EASY',
    countries: [],
    cuisines: ['home-baking'],
    originalLanguage: 'en',
    titles: { en: 'Sesame butter shortbread', ar: 'بسكويت السمسم بالزبدة' },
  },
  {
    slug: 'tofu-miso-soup',
    prepTimeMinutes: 10,
    cookTimeMinutes: 15,
    difficulty: 'EASY',
    countries: ['japan'],
    cuisines: ['japanese'],
    originalLanguage: 'en',
    titles: { en: 'Tofu miso soup', ar: 'شوربة ميسو بالتوفو' },
  },
  {
    slug: 'black-bean-corn-skillet',
    prepTimeMinutes: 15,
    cookTimeMinutes: 20,
    difficulty: 'EASY',
    countries: ['mexico'],
    cuisines: ['mexican'],
    originalLanguage: 'en',
    titles: { en: 'Black bean and corn skillet', ar: 'مقلاة الفاصولياء السوداء والذرة' },
  },
  {
    slug: 'semolina-milk-pudding',
    prepTimeMinutes: 5,
    cookTimeMinutes: 15,
    difficulty: 'EASY',
    countries: ['lebanon'],
    cuisines: ['levantine'],
    originalLanguage: 'ar',
    titles: { ar: 'سميد بالحليب' },
  },
];

const countryNames: Record<string, { en: string; ar: string }> = {
  lebanon: { en: 'Lebanon', ar: 'لبنان' },
  france: { en: 'France', ar: 'فرنسا' },
  italy: { en: 'Italy', ar: 'إيطاليا' },
  japan: { en: 'Japan', ar: 'اليابان' },
  mexico: { en: 'Mexico', ar: 'المكسيك' },
};

const cuisineNames: Record<string, { en: string; ar: string }> = {
  levantine: { en: 'Levantine', ar: 'شامي' },
  french: { en: 'French', ar: 'فرنسي' },
  italian: { en: 'Italian', ar: 'إيطالي' },
  japanese: { en: 'Japanese', ar: 'ياباني' },
  mexican: { en: 'Mexican', ar: 'مكسيكي' },
  'home-baking': { en: 'Home baking', ar: 'خبز منزلي' },
};

const countryOrder = ['italy', 'japan', 'lebanon', 'france', 'mexico'] as const;

export type SampleCountryCard = {
  slug: (typeof countryOrder)[number];
  name: string;
  recipeCount: number;
};

export function sampleTitle(
  recipe: SampleRecipe,
  language: SampleLanguage,
): { title: string; fallback: boolean; contentLanguage: SampleLanguage } {
  const requested = recipe.titles[language];
  if (requested) return { title: requested, fallback: false, contentLanguage: language };
  const original = recipe.titles[recipe.originalLanguage];
  if (!original) {
    throw new Error(`Sample recipe ${recipe.slug} is missing its original title.`);
  }
  return {
    title: original,
    fallback: recipe.originalLanguage !== language,
    contentLanguage: recipe.originalLanguage,
  };
}

export function sampleTotalMinutes(recipe: SampleRecipe): number {
  return recipe.prepTimeMinutes + recipe.cookTimeMinutes;
}

export function sampleLabel(slug: string, language: SampleLanguage, kind: 'country' | 'cuisine'): string | null {
  const table = kind === 'country' ? countryNames : cuisineNames;
  return table[slug]?.[language] ?? null;
}

export function sampleKicker(recipe: SampleRecipe, language: SampleLanguage): string {
  const labels = [
    ...recipe.countries.map((slug) => sampleLabel(slug, language, 'country')),
    ...recipe.cuisines.map((slug) => sampleLabel(slug, language, 'cuisine')),
  ].filter((label): label is string => label !== null);
  return labels.join(' · ');
}

export function sampleCountryCards(language: SampleLanguage): SampleCountryCard[] {
  return countryOrder.map((slug) => ({
    slug,
    name: countryNames[slug]?.[language] ?? slug,
    recipeCount: sampleRecipes.filter((recipe) => recipe.countries.includes(slug)).length,
  }));
}

export function titleMatches(recipe: SampleRecipe, language: SampleLanguage, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase();
  if (needle.length === 0) return true;
  return sampleTitle(recipe, language).title.toLocaleLowerCase().includes(needle);
}

export type SampleSearchLayout = {
  featured: SampleRecipe | undefined;
  rest: SampleRecipe[];
  showSampleList: boolean;
  showEmpty: boolean;
};

export function sampleSearchLayout(
  recipes: readonly SampleRecipe[],
  language: SampleLanguage,
  query: string,
): SampleSearchLayout {
  const visible = recipes.filter((recipe) => titleMatches(recipe, language, query));
  const featured = visible.find((recipe) => recipe.slug === featuredSampleSlug);
  const rest = visible.filter((recipe) => recipe.slug !== featuredSampleSlug);
  return {
    featured,
    rest,
    showSampleList: rest.length > 0,
    showEmpty: visible.length === 0,
  };
}
