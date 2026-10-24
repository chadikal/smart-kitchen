export const seedLanguages = ['EN', 'AR'] as const;
export type SeedLanguage = (typeof seedLanguages)[number];

export const dietaryTagSlugs = [
  'vegetarian',
  'vegan',
  'gluten-free',
  'dairy-free',
] as const;
export type DietaryTagSlug = (typeof dietaryTagSlugs)[number];

export const measuredUnits = [
  'MILLIGRAM',
  'GRAM',
  'KILOGRAM',
  'MILLILITER',
  'LITER',
  'TEASPOON',
  'TABLESPOON',
  'CUP',
  'PIECE',
] as const;
export type SeedUnit = (typeof measuredUnits)[number];

export interface SeedLabel {
  slug: string;
  originalLanguage: SeedLanguage;
  code?: string;
  names: Partial<Record<SeedLanguage, string>>;
}

export interface SeedIngredient extends SeedLabel {
  compatibleTags: readonly DietaryTagSlug[];
  bakingMass: boolean;
}

export interface SeedAmount {
  quantity: string;
  unit: SeedUnit;
}

export interface SeedLine {
  ingredientSlug: string;
  position: number;
  amount: SeedAmount | 'TO_TASTE';
  optional?: boolean;
  notes?: Partial<Record<SeedLanguage, string>>;
}

export interface SeedStep {
  position: number;
  instructions: Partial<Record<SeedLanguage, string>>;
}

export interface SeedRecipe {
  slug: string;
  originalLanguage: SeedLanguage;
  publicationStatus: 'PUBLISHED';
  visibility: 'PUBLIC';
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  baking: boolean;
  countries: readonly string[];
  cuisines: readonly string[];
  translations: Partial<
    Record<SeedLanguage, { title: string; description: string }>
  >;
  lines: readonly SeedLine[];
  steps: readonly SeedStep[];
}

export interface SeedCatalog {
  countries: readonly SeedLabel[];
  cuisines: readonly SeedLabel[];
  dietaryTags: readonly SeedLabel[];
  ingredients: readonly SeedIngredient[];
  recipes: readonly SeedRecipe[];
}

export class SeedCatalogError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SeedCatalogError';
  }
}

const decimalQuantity = /^\d+\.\d{3}$/;

export function dietaryTagsForRecipe(
  recipe: SeedRecipe,
  ingredients: ReadonlyMap<string, SeedIngredient>,
): DietaryTagSlug[] {
  return dietaryTagSlugs.filter((tag) =>
    recipe.lines.every((line) =>
      ingredients.get(line.ingredientSlug)?.compatibleTags.includes(tag),
    ),
  );
}

export function validateSeedCatalog(catalog: SeedCatalog): void {
  const problems: string[] = [];
  const countries = indexLabels(catalog.countries, 'country', problems);
  const cuisines = indexLabels(catalog.cuisines, 'cuisine', problems);
  indexLabels(catalog.dietaryTags, 'dietary tag', problems);
  const ingredients = new Map<string, SeedIngredient>();
  for (const ingredient of catalog.ingredients) {
    if (ingredients.has(ingredient.slug)) {
      problems.push(`Duplicate ingredient slug ${ingredient.slug}.`);
    }
    ingredients.set(ingredient.slug, ingredient);
    validateLabel(ingredient, 'ingredient', problems);
  }
  const definedTags = new Set(catalog.dietaryTags.map((tag) => tag.slug));
  const recipeSlugs = new Set<string>();
  for (const recipe of catalog.recipes) {
    if (recipeSlugs.has(recipe.slug)) {
      problems.push(`Duplicate recipe slug ${recipe.slug}.`);
    }
    recipeSlugs.add(recipe.slug);
    validateRecipe(recipe, countries, cuisines, ingredients, problems);
    for (const tag of dietaryTagsForRecipe(recipe, ingredients)) {
      if (!definedTags.has(tag)) {
        problems.push(`${recipe.slug} needs dietary tag ${tag} in the catalog.`);
      }
    }
  }
  if (problems.length > 0) {
    throw new SeedCatalogError(problems.join('\n'));
  }
}

export function isArabicOnly(recipe: SeedRecipe): boolean {
  return (
    recipe.originalLanguage === 'AR' &&
    Object.keys(recipe.translations).length === 1 &&
    recipe.translations.AR !== undefined
  );
}

function validateRecipe(
  recipe: SeedRecipe,
  countries: ReadonlySet<string>,
  cuisines: ReadonlySet<string>,
  ingredients: ReadonlyMap<string, SeedIngredient>,
  problems: string[],
): void {
  if (recipe.publicationStatus !== 'PUBLISHED' || recipe.visibility !== 'PUBLIC') {
    problems.push(`${recipe.slug} must be explicitly PUBLISHED and PUBLIC.`);
  }
  if (!Number.isInteger(recipe.prepTimeMinutes) || recipe.prepTimeMinutes < 0) {
    problems.push(`${recipe.slug} has a negative prep time.`);
  }
  if (!Number.isInteger(recipe.cookTimeMinutes) || recipe.cookTimeMinutes < 0) {
    problems.push(`${recipe.slug} has a negative cook time.`);
  }
  if (!Number.isInteger(recipe.servings) || recipe.servings < 1) {
    problems.push(`${recipe.slug} needs a positive serving count.`);
  }
  for (const country of recipe.countries) {
    if (!countries.has(country)) problems.push(`${recipe.slug} uses unknown country ${country}.`);
  }
  for (const cuisine of recipe.cuisines) {
    if (!cuisines.has(cuisine)) problems.push(`${recipe.slug} uses unknown cuisine ${cuisine}.`);
  }
  validatePositions(recipe.slug, 'step', recipe.steps.map((step) => step.position), problems);
  validatePositions(recipe.slug, 'ingredient', recipe.lines.map((line) => line.position), problems);
  const languages = new Set<SeedLanguage>([recipe.originalLanguage]);
  for (const language of seedLanguages) {
    const translation = recipe.translations[language];
    if (!translation) continue;
    languages.add(language);
    if (translation.title.trim() === '') {
      problems.push(`${recipe.slug} has a blank ${language} title.`);
    }
  }
  if (!recipe.translations[recipe.originalLanguage]) {
    problems.push(`${recipe.slug} is missing its ${recipe.originalLanguage} translation.`);
  }
  for (const language of languages) {
    for (const step of recipe.steps) {
      const instruction = step.instructions[language];
      if (!instruction || instruction.trim() === '') {
        problems.push(
          `${recipe.slug} is missing a ${language} instruction for step ${step.position}.`,
        );
      }
    }
  }
  for (const line of recipe.lines) {
    const ingredient = ingredients.get(line.ingredientSlug);
    if (!ingredient) {
      problems.push(`${recipe.slug} uses unknown ingredient ${line.ingredientSlug}.`);
      continue;
    }
    if (line.amount === 'TO_TASTE') {
      if (recipe.baking && ingredient.bakingMass) {
        problems.push(`${recipe.slug} uses a baking mass without grams.`);
      }
    } else {
      if (!decimalQuantity.test(line.amount.quantity) || zeroDecimal(line.amount.quantity)) {
        problems.push(
          `${recipe.slug} quantity ${line.amount.quantity} must be a positive decimal string with three places.`,
        );
      }
      if (recipe.baking && ingredient.bakingMass && line.amount.unit !== 'GRAM') {
        problems.push(`${recipe.slug} must store ${ingredient.slug} in grams.`);
      }
    }
    for (const language of seedLanguages) {
      const note = line.notes?.[language];
      if (note === undefined) continue;
      if (note.trim() === '') {
        problems.push(`${recipe.slug} has a blank ${language} preparation note.`);
      }
      if (!languages.has(language)) {
        problems.push(
          `${recipe.slug} has a ${language} note without a ${language} recipe translation.`,
        );
      }
    }
  }
}

function validatePositions(
  slug: string,
  kind: string,
  positions: number[],
  problems: string[],
): void {
  const sorted = [...positions].sort((left, right) => left - right);
  if (sorted.length === 0) {
    problems.push(`${slug} needs at least one ${kind}.`);
    return;
  }
  sorted.forEach((position, index) => {
    if (position !== index + 1) {
      problems.push(`${slug} ${kind} positions must be 1..${sorted.length} without gaps.`);
    }
  });
}

function indexLabels(
  labels: readonly SeedLabel[],
  kind: string,
  problems: string[],
): Set<string> {
  const slugs = new Set<string>();
  const codes = new Set<string>();
  for (const label of labels) {
    if (slugs.has(label.slug)) problems.push(`Duplicate ${kind} slug ${label.slug}.`);
    slugs.add(label.slug);
    if (label.code) {
      if (codes.has(label.code)) problems.push(`Duplicate ${kind} code ${label.code}.`);
      codes.add(label.code);
    }
    validateLabel(label, kind, problems);
  }
  return slugs;
}

function validateLabel(label: SeedLabel, kind: string, problems: string[]): void {
  const name = label.names[label.originalLanguage];
  if (!name || name.trim() === '') {
    problems.push(`${kind} ${label.slug} is missing its ${label.originalLanguage} name.`);
  }
  for (const language of seedLanguages) {
    const translated = label.names[language];
    if (translated !== undefined && translated.trim() === '') {
      problems.push(`${kind} ${label.slug} has a blank ${language} name.`);
    }
  }
}

function zeroDecimal(quantity: string): boolean {
  return /^0+\.0{3}$/.test(quantity);
}

const plant = dietaryTagSlugs;
const dairyOrEgg = ['vegetarian', 'gluten-free'] as const;
const wheat = ['vegetarian', 'vegan', 'dairy-free'] as const;
const misoTags = ['vegetarian', 'vegan', 'dairy-free'] as const;

function ingredient(
  slug: string,
  en: string,
  ar: string,
  compatibleTags: readonly DietaryTagSlug[],
  bakingMass = false,
): SeedIngredient {
  return {
    slug,
    originalLanguage: 'EN',
    names: { EN: en, AR: ar },
    compatibleTags,
    bakingMass,
  };
}

function label(
  slug: string,
  en: string,
  ar: string,
  code?: string,
): SeedLabel {
  return {
    slug,
    originalLanguage: 'EN',
    ...(code ? { code } : {}),
    names: { EN: en, AR: ar },
  };
}

export const seedCatalog: SeedCatalog = {
  countries: [
    label('lebanon', 'Lebanon', 'لبنان', 'LB'),
    label('france', 'France', 'فرنسا', 'FR'),
    label('italy', 'Italy', 'إيطاليا', 'IT'),
    label('japan', 'Japan', 'اليابان', 'JP'),
    label('mexico', 'Mexico', 'المكسيك', 'MX'),
  ],
  cuisines: [
    label('levantine', 'Levantine', 'شامي'),
    label('french', 'French', 'فرنسي'),
    label('italian', 'Italian', 'إيطالي'),
    label('japanese', 'Japanese', 'ياباني'),
    label('mexican', 'Mexican', 'مكسيكي'),
    label('home-baking', 'Home baking', 'خبز منزلي'),
  ],
  dietaryTags: [
    label('vegetarian', 'Vegetarian', 'نباتي'),
    label('vegan', 'Vegan', 'نباتي صرف'),
    label('gluten-free', 'Gluten-free', 'خالٍ من الغلوتين'),
    label('dairy-free', 'Dairy-free', 'خالٍ من الألبان'),
  ],
  ingredients: [
    ingredient('red-lentils', 'Red lentils', 'عدس أحمر', plant),
    ingredient('yellow-onion', 'Yellow onion', 'بصل أصفر', plant),
    ingredient('garlic', 'Garlic', 'ثوم', plant),
    ingredient('olive-oil', 'Olive oil', 'زيت زيتون', plant),
    ingredient('lemon-juice', 'Lemon juice', 'عصير ليمون', plant),
    ingredient('ground-cumin', 'Ground cumin', 'كمون مطحون', plant),
    ingredient('flat-leaf-parsley', 'Flat-leaf parsley', 'بقدونس', plant),
    ingredient('water', 'Water', 'ماء', plant),
    ingredient('fine-salt', 'Fine salt', 'ملح ناعم', plant),
    ingredient('chicken', 'Chicken', 'دجاج', ['gluten-free', 'dairy-free']),
    ingredient('lemon', 'Lemon', 'ليمون', plant),
    ingredient('black-pepper', 'Black pepper', 'فلفل أسود', plant),
    ingredient('cannellini-beans', 'Cannellini beans', 'فاصولياء بيضاء', plant),
    ingredient('tomato', 'Tomato', 'طماطم', plant),
    ingredient('fresh-basil', 'Fresh basil', 'ريحان طازج', plant),
    ingredient('wheat-flour', 'Wheat flour', 'طحين القمح', wheat, true),
    ingredient('sugar', 'Sugar', 'سكر', plant, true),
    ingredient('plain-yogurt', 'Plain yogurt', 'لبن زبادي', dairyOrEgg, true),
    ingredient('egg', 'Egg', 'بيض', dairyOrEgg),
    ingredient('baking-powder', 'Baking powder', 'بيكنج باودر', plant, true),
    ingredient('butter', 'Butter', 'زبدة', dairyOrEgg, true),
    ingredient('sesame-seeds', 'Sesame seeds', 'سمسم', plant, true),
    ingredient('white-miso', 'White miso', 'ميسو أبيض', misoTags),
    ingredient('firm-tofu', 'Firm tofu', 'توفو متماسك', plant),
    ingredient('dried-kombu', 'Dried kombu', 'كومبو مجفف', plant),
    ingredient('spring-onion', 'Spring onion', 'بصل أخضر', plant),
    ingredient('black-beans', 'Black beans', 'فاصولياء سوداء', plant),
    ingredient('sweet-corn', 'Sweet corn', 'ذرة', plant),
    ingredient('fresh-coriander', 'Fresh coriander', 'كزبرة طازجة', plant),
    ingredient('semolina', 'Semolina', 'سميد', wheat, true),
    ingredient('whole-milk', 'Whole milk', 'حليب كامل الدسم', dairyOrEgg),
  ],
  recipes: [
    recipe({
      slug: 'red-lentil-lemon-soup',
      originalLanguage: 'EN',
      prepTimeMinutes: 15,
      cookTimeMinutes: 30,
      servings: 4,
      difficulty: 'EASY',
      baking: false,
      countries: ['lebanon'],
      cuisines: ['levantine'],
      translations: {
        EN: {
          title: 'Red lentil lemon soup',
          description: 'A simple pot of red lentils with cumin and lemon.',
        },
        AR: {
          title: 'شوربة عدس بالليمون',
          description: 'قدر بسيط من العدس الأحمر مع الكمون والليمون.',
        },
      },
      lines: [
        measured('red-lentils', 1, '200.000', 'GRAM'),
        measured('yellow-onion', 2, '1.000', 'PIECE', { EN: 'Finely chopped', AR: 'مفروم ناعم' }),
        measured('garlic', 3, '3.000', 'PIECE'),
        measured('olive-oil', 4, '30.000', 'MILLILITER'),
        measured('lemon-juice', 5, '30.000', 'MILLILITER'),
        measured('ground-cumin', 6, '2.000', 'GRAM'),
        measured('flat-leaf-parsley', 7, '10.000', 'GRAM', undefined, true),
        measured('water', 8, '1000.000', 'MILLILITER'),
        taste('fine-salt', 9),
      ],
      steps: [
        step(1, 'Rinse the lentils, then chop the onion and garlic.', 'اغسل العدس، ثم فرّم البصل والثوم.'),
        step(2, 'Warm the oil, soften the onion and garlic, and stir in the cumin.', 'سخّن الزيت، ليّن البصل والثوم، ثم أضف الكمون.'),
        step(3, 'Add the lentils and water and simmer until the lentils are soft.', 'أضف العدس والماء واتركه على نار هادئة حتى يطرى العدس.'),
        step(4, 'Stir in the lemon and salt, then add parsley if you are using it.', 'أضف الليمون والملح، ثم البقدونس إن استخدمته.'),
      ],
    }),
    recipe({
      slug: 'lemon-herb-roast-chicken',
      originalLanguage: 'EN',
      prepTimeMinutes: 20,
      cookTimeMinutes: 75,
      servings: 4,
      difficulty: 'MEDIUM',
      baking: false,
      countries: ['france'],
      cuisines: ['french'],
      translations: {
        EN: {
          title: 'Lemon herb roast chicken',
          description: 'A whole chicken roasted with lemon, garlic, and black pepper.',
        },
        AR: {
          title: 'دجاج مشوي بالليمون والأعشاب',
          description: 'دجاجة كاملة مشوية بالليمون والثوم والفلفل الأسود.',
        },
      },
      lines: [
        measured('chicken', 1, '1200.000', 'GRAM'),
        measured('olive-oil', 2, '15.000', 'MILLILITER'),
        measured('lemon', 3, '1.000', 'PIECE'),
        measured('garlic', 4, '4.000', 'PIECE'),
        measured('black-pepper', 5, '1.000', 'GRAM'),
        taste('fine-salt', 6),
      ],
      steps: [
        step(1, 'Heat the oven to 200°C. Pat the chicken dry.', 'سخّن الفرن إلى ٢٠٠ درجة. جفف الدجاج.'),
        step(2, 'Rub the chicken with oil, lemon, garlic, pepper, and salt.', 'ادعك الدجاج بالزيت والليمون والثوم والفلفل والملح.'),
        step(3, 'Roast until the juices run clear, then rest before carving.', 'اشوه حتى يصبح العصير صافياً، ثم اتركه يرتاح قبل التقطيع.'),
      ],
    }),
    recipe({
      slug: 'tomato-white-beans',
      originalLanguage: 'EN',
      prepTimeMinutes: 10,
      cookTimeMinutes: 25,
      servings: 4,
      difficulty: 'EASY',
      baking: false,
      countries: ['italy'],
      cuisines: ['italian'],
      translations: {
        EN: {
          title: 'Tomato white beans',
          description: 'Cannellini beans simmered with tomato, garlic, and olive oil.',
        },
        AR: {
          title: 'فاصولياء بيضاء بالطماطم',
          description: 'فاصولياء بيضاء مطهوة مع الطماطم والثوم وزيت الزيتون.',
        },
      },
      lines: [
        measured('cannellini-beans', 1, '400.000', 'GRAM'),
        measured('tomato', 2, '3.000', 'PIECE'),
        measured('garlic', 3, '2.000', 'PIECE'),
        measured('olive-oil', 4, '20.000', 'MILLILITER'),
        taste('fine-salt', 5),
        measured('fresh-basil', 6, '8.000', 'GRAM', { EN: 'Torn', AR: 'ممزق' }, true),
      ],
      steps: [
        step(1, 'Chop the tomatoes and garlic.', 'قطّع الطماطم والثوم.'),
        step(2, 'Warm the oil, cook the garlic briefly, then add the tomatoes.', 'سخّن الزيت، اطبخ الثوم قليلاً، ثم أضف الطماطم.'),
        step(3, 'Stir in the beans and salt and simmer until the sauce thickens.', 'أضف الفاصولياء والملح واتركها حتى تتكاثف الصلصة.'),
      ],
    }),
    recipe({
      slug: 'olive-oil-yogurt-cake',
      originalLanguage: 'EN',
      prepTimeMinutes: 20,
      cookTimeMinutes: 40,
      servings: 8,
      difficulty: 'EASY',
      baking: true,
      countries: ['france'],
      cuisines: ['home-baking'],
      translations: {
        EN: {
          title: 'Olive oil yogurt cake',
          description: 'A plain cake mixed by weight, with olive oil and yogurt.',
        },
        AR: {
          title: 'كعكة الزبادي بزيت الزيتون',
          description: 'كعكة بسيطة بالميزان، بزيت الزيتون والزبادي.',
        },
      },
      lines: [
        measured('wheat-flour', 1, '200.000', 'GRAM'),
        measured('sugar', 2, '150.000', 'GRAM'),
        measured('plain-yogurt', 3, '200.000', 'GRAM'),
        measured('olive-oil', 4, '80.000', 'MILLILITER'),
        measured('egg', 5, '2.000', 'PIECE'),
        measured('baking-powder', 6, '8.000', 'GRAM'),
      ],
      steps: [
        step(1, 'Heat the oven to 180°C and line a cake tin.', 'سخّن الفرن إلى ١٨٠ درجة وجهّز قالب الكعكة.'),
        step(2, 'Weigh the flour, sugar, yogurt, and baking powder.', 'زِن الطحين والسكر والزبادي والبيكنج باودر.'),
        step(3, 'Mix in the oil and eggs, then bake until the center is set.', 'أضف الزيت والبيض، ثم اخبز حتى ينضج الوسط.'),
      ],
    }),
    recipe({
      slug: 'sesame-butter-shortbread',
      originalLanguage: 'EN',
      prepTimeMinutes: 20,
      cookTimeMinutes: 18,
      servings: 16,
      difficulty: 'EASY',
      baking: true,
      countries: [],
      cuisines: ['home-baking'],
      translations: {
        EN: {
          title: 'Sesame butter shortbread',
          description: 'A short crumbly biscuit made with butter, flour, sugar, and sesame.',
        },
        AR: {
          title: 'بسكويت السمسم بالزبدة',
          description: 'بسكويت مفتت بالزبدة والطحين والسكر والسمسم.',
        },
      },
      lines: [
        measured('wheat-flour', 1, '180.000', 'GRAM'),
        measured('butter', 2, '120.000', 'GRAM'),
        measured('sugar', 3, '80.000', 'GRAM'),
        measured('sesame-seeds', 4, '30.000', 'GRAM'),
      ],
      steps: [
        step(1, 'Heat the oven to 170°C.', 'سخّن الفرن إلى ١٧٠ درجة.'),
        step(2, 'Work the butter into the flour, sugar, and sesame.', 'ادمج الزبدة مع الطحين والسكر والسمسم.'),
        step(3, 'Press the dough into a tin, bake, and cut while warm.', 'افرد العجين في صينية، اخبزه، وقطعه وهو دافئ.'),
      ],
    }),
    recipe({
      slug: 'tofu-miso-soup',
      originalLanguage: 'EN',
      prepTimeMinutes: 10,
      cookTimeMinutes: 15,
      servings: 4,
      difficulty: 'EASY',
      baking: false,
      countries: ['japan'],
      cuisines: ['japanese'],
      translations: {
        EN: {
          title: 'Tofu miso soup',
          description: 'A kombu and miso broth with tofu and spring onion. This version has no fish.',
        },
        AR: {
          title: 'شوربة ميسو بالتوفو',
          description: 'مرق كومبو وميسو مع التوفو والبصل الأخضر. هذه النسخة بلا سمك.',
        },
      },
      lines: [
        measured('water', 1, '800.000', 'MILLILITER'),
        measured('dried-kombu', 2, '5.000', 'GRAM'),
        measured('white-miso', 3, '40.000', 'GRAM'),
        measured('firm-tofu', 4, '200.000', 'GRAM'),
        measured('spring-onion', 5, '2.000', 'PIECE'),
      ],
      steps: [
        step(1, 'Simmer the kombu in water, then remove it.', 'اترك الكومبو في الماء على نار هادئة، ثم أخرجه.'),
        step(2, 'Take the pot off the heat and stir in the miso.', 'أبعد القدر عن النار وحرك الميسو فيه.'),
        step(3, 'Add the tofu and spring onion and warm gently without boiling.', 'أضف التوفو والبصل الأخضر ودفئ المرق دون غليان.'),
      ],
    }),
    recipe({
      slug: 'black-bean-corn-skillet',
      originalLanguage: 'EN',
      prepTimeMinutes: 15,
      cookTimeMinutes: 20,
      servings: 4,
      difficulty: 'EASY',
      baking: false,
      countries: ['mexico'],
      cuisines: ['mexican'],
      translations: {
        EN: {
          title: 'Black bean and corn skillet',
          description: 'Beans and corn cooked with tomato, onion, and cumin.',
        },
        AR: {
          title: 'مقلاة الفاصولياء السوداء والذرة',
          description: 'فاصولياء وذرة مطهوة مع الطماطم والبصل والكمون.',
        },
      },
      lines: [
        measured('black-beans', 1, '400.000', 'GRAM'),
        measured('sweet-corn', 2, '200.000', 'GRAM'),
        measured('tomato', 3, '2.000', 'PIECE'),
        measured('yellow-onion', 4, '1.000', 'PIECE'),
        measured('olive-oil', 5, '15.000', 'MILLILITER'),
        measured('ground-cumin', 6, '2.000', 'GRAM'),
        taste('fine-salt', 7),
        measured('fresh-coriander', 8, '10.000', 'GRAM', undefined, true),
      ],
      steps: [
        step(1, 'Chop the onion and tomatoes.', 'فرّم البصل والطماطم.'),
        step(2, 'Cook the onion in oil, then add the cumin, tomatoes, beans, and corn.', 'اطبخ البصل بالزيت، ثم أضف الكمون والطماطم والفاصولياء والذرة.'),
        step(3, 'Season with salt and scatter coriander on top if you like.', 'تبّل بالملح وانثر الكزبرة فوقها إن رغبت.'),
      ],
    }),
    recipe({
      slug: 'semolina-milk-pudding',
      originalLanguage: 'AR',
      prepTimeMinutes: 5,
      cookTimeMinutes: 15,
      servings: 4,
      difficulty: 'EASY',
      baking: true,
      countries: ['lebanon'],
      cuisines: ['levantine'],
      translations: {
        AR: {
          title: 'سميد بالحليب',
          description: 'حلوى سميد سريعة بالحليب والزبدة.',
        },
      },
      lines: [
        measured('whole-milk', 1, '500.000', 'MILLILITER'),
        measured('semolina', 2, '80.000', 'GRAM'),
        measured('sugar', 3, '60.000', 'GRAM'),
        measured('butter', 4, '20.000', 'GRAM', { AR: 'مذابة' }),
      ],
      steps: [
        step(1, '', 'سخّن الحليب في قدر.'),
        step(2, '', 'رش السميد مع التحريك حتى يثخن.'),
        step(3, '', 'أضف السكر والزبدة وحرّك حتى تذوب.'),
      ],
    }),
  ],
};

function recipe(input: Omit<SeedRecipe, 'publicationStatus' | 'visibility'>): SeedRecipe {
  return {
    ...input,
    publicationStatus: 'PUBLISHED',
    visibility: 'PUBLIC',
  };
}

function measured(
  ingredientSlug: string,
  position: number,
  quantity: string,
  unit: SeedUnit,
  notes?: Partial<Record<SeedLanguage, string>>,
  optional = false,
): SeedLine {
  return {
    ingredientSlug,
    position,
    amount: { quantity, unit },
    ...(optional ? { optional: true } : {}),
    ...(notes ? { notes } : {}),
  };
}

function taste(ingredientSlug: string, position: number): SeedLine {
  return { ingredientSlug, position, amount: 'TO_TASTE' };
}

function step(position: number, en: string, ar: string): SeedStep {
  if (en === '') return { position, instructions: { AR: ar } };
  return { position, instructions: { EN: en, AR: ar } };
}
