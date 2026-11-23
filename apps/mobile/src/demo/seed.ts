import type { RecipeDraft } from '../recipes/drafts.ts';

export const demoKitchenKey = 'savora.demo.kitchen';
export const demoSavedKey = 'savora.demo.saved';
export const demoDraftKey = 'savora.demo.drafts';
export const demoProfileKey = 'savora.demo.profile';

/** A stable fictional account id. Saved recipes require a UUID owner. */
export const demoProfileId = '3f1c8a2e-7b64-4d19-9a05-6c2e8b1d4f70';
export const demoProfileEmail = 'maya.haddad@example.com';

export const demoKitchenSeed = [
  'olive-oil',
  'garlic',
  'yellow-onion',
  'tomato',
  'chickpeas',
  'fine-salt',
  'egg',
  'lemon-juice',
] as const;
export const demoSavedSeed = [
  'greek-village-salad',
  'chana-masala',
  'mushroom-risotto',
  'red-lentil-lemon-soup',
  'tofu-miso-soup',
  'olive-oil-yogurt-cake',
] as const;

export const demoProfileNames = {
  en: { firstName: 'Maya', lastName: 'Haddad' },
  ar: { firstName: 'مايا', lastName: 'حداد' },
} as const;

export const demoProfilePreferences = {
  dietaryPreferences: ['vegetarian'],
  cuisineInterests: ['levantine', 'italian'],
  countryInterests: ['lebanon', 'italy'],
} as const;

export function demoDraftSeed(): RecipeDraft[] {
  return [
    {
      id: 'demo-draft-lemon-tahini-bowls',
      language: 'en',
      title: 'Lemon tahini chickpea bowls',
      description: 'Warm chickpeas with a lemon tahini sauce, cucumber, and parsley.',
      prepMinutes: '15',
      cookMinutes: '10',
      servings: '2',
      ingredients: [
        { id: 'demo-draft-chickpeas', name: 'Chickpeas', quantity: '400', unit: 'GRAM', toTaste: false },
        { id: 'demo-draft-tahini', name: 'Tahini', quantity: '60', unit: 'GRAM', toTaste: false },
        { id: 'demo-draft-lemon', name: 'Lemon juice', quantity: '30', unit: 'MILLILITER', toTaste: false },
        { id: 'demo-draft-garlic', name: 'Garlic', quantity: '1', unit: 'PIECE', toTaste: false },
        { id: 'demo-draft-cucumber', name: 'Cucumber', quantity: '1', unit: 'PIECE', toTaste: false },
        { id: 'demo-draft-parsley', name: 'Flat-leaf parsley', quantity: '15', unit: 'GRAM', toTaste: false },
        { id: 'demo-draft-oil', name: 'Olive oil', quantity: '15', unit: 'MILLILITER', toTaste: false },
        { id: 'demo-draft-salt', name: 'Fine salt', quantity: '2', unit: 'GRAM', toTaste: false },
      ],
      steps: [
        { id: 'demo-draft-bowls-sauce', instruction: 'Whisk the tahini, lemon juice, grated garlic, and salt with a splash of water until smooth.' },
        { id: 'demo-draft-bowls-warm', instruction: 'Warm the chickpeas in the olive oil until they are glossy.' },
        { id: 'demo-draft-bowls-cut', instruction: 'Slice the cucumber and chop the parsley.' },
        { id: 'demo-draft-bowls-serve', instruction: 'Spoon the chickpeas into bowls, add the cucumber, and dress with the tahini sauce and parsley.' },
      ],
      updatedAt: '2026-11-14T11:20:00.000Z',
      photoUri: 'savora-draft://demo-draft-lemon-tahini-bowls',
    },
    {
      id: 'demo-draft-orange-cardamom-loaf',
      language: 'en',
      title: 'Orange cardamom loaf',
      description: 'A yogurt loaf scented with orange zest and cardamom.',
      prepMinutes: '20',
      cookMinutes: '45',
      servings: '8',
      ingredients: [
        { id: 'demo-draft-flour', name: 'Wheat flour', quantity: '180', unit: 'GRAM', toTaste: false },
        { id: 'demo-draft-sugar', name: 'Sugar', quantity: '140', unit: 'GRAM', toTaste: false },
        { id: 'demo-draft-yogurt', name: 'Plain yogurt', quantity: '180', unit: 'GRAM', toTaste: false },
        { id: 'demo-draft-eggs', name: 'Egg', quantity: '2', unit: 'PIECE', toTaste: false },
        { id: 'demo-draft-loaf-oil', name: 'Olive oil', quantity: '70', unit: 'MILLILITER', toTaste: false },
        { id: 'demo-draft-zest', name: 'Orange zest', quantity: '1', unit: 'TABLESPOON', toTaste: false },
        { id: 'demo-draft-cardamom', name: 'Ground cardamom', quantity: '2', unit: 'TEASPOON', toTaste: false },
        { id: 'demo-draft-baking', name: 'Baking powder', quantity: '8', unit: 'GRAM', toTaste: false },
      ],
      steps: [
        { id: 'demo-draft-loaf-heat', instruction: 'Heat the oven to 175°C and line a small loaf tin.' },
        { id: 'demo-draft-loaf-mix', instruction: 'Whisk the yogurt, oil, eggs, sugar, orange zest, and cardamom.' },
        { id: 'demo-draft-loaf-fold', instruction: 'Fold in the flour and baking powder until just combined.' },
        { id: 'demo-draft-loaf-bake', instruction: 'Bake until a skewer comes out clean, then cool in the tin before slicing.' },
      ],
      updatedAt: '2026-11-12T09:00:00.000Z',
      photoUri: 'savora-draft://demo-draft-orange-cardamom-loaf',
    },
    {
      id: 'demo-draft-muhammara',
      language: 'en',
      title: 'Roasted pepper muhammara',
      description: 'A coarse dip of roasted red peppers, walnuts, and olive oil.',
      prepMinutes: '15',
      cookMinutes: '20',
      servings: '6',
      ingredients: [
        { id: 'demo-draft-pepper', name: 'Red pepper', quantity: '3', unit: 'PIECE', toTaste: false },
        { id: 'demo-draft-walnuts', name: 'Walnuts', quantity: '80', unit: 'GRAM', toTaste: false },
        { id: 'demo-draft-crumbs', name: 'Breadcrumbs', quantity: '30', unit: 'GRAM', toTaste: false },
        { id: 'demo-draft-muh-oil', name: 'Olive oil', quantity: '40', unit: 'MILLILITER', toTaste: false },
        { id: 'demo-draft-muh-lemon', name: 'Lemon juice', quantity: '20', unit: 'MILLILITER', toTaste: false },
        { id: 'demo-draft-muh-salt', name: 'Fine salt', quantity: '2', unit: 'GRAM', toTaste: false },
      ],
      steps: [
        { id: 'demo-draft-muh-roast', instruction: 'Roast the peppers at 220°C until the skins blacken, then peel and seed them.' },
        { id: 'demo-draft-muh-blend', instruction: 'Pulse the peppers with the walnuts, breadcrumbs, lemon juice, and salt until coarse.' },
        { id: 'demo-draft-muh-oil', instruction: 'Stir in the olive oil and taste for salt.' },
      ],
      updatedAt: '2026-11-10T16:00:00.000Z',
      photoUri: 'savora-draft://demo-draft-muhammara',
    },
    {
      id: 'demo-draft-cucumber-yogurt',
      language: 'en',
      title: 'Cucumber yogurt',
      description: 'Cold yogurt with grated cucumber, mint, and a thread of olive oil.',
      prepMinutes: '10',
      cookMinutes: '',
      servings: '4',
      ingredients: [
        { id: 'demo-draft-yogurt', name: 'Plain yogurt', quantity: '400', unit: 'GRAM', toTaste: false },
        { id: 'demo-draft-cuke', name: 'Cucumber', quantity: '1', unit: 'PIECE', toTaste: false },
        { id: 'demo-draft-mint', name: 'Dried mint', quantity: '2', unit: 'GRAM', toTaste: false },
        { id: 'demo-draft-cuke-salt', name: 'Fine salt', quantity: '2', unit: 'GRAM', toTaste: false },
        { id: 'demo-draft-cuke-oil', name: 'Olive oil', quantity: '15', unit: 'MILLILITER', toTaste: false },
      ],
      steps: [
        { id: 'demo-draft-cuke-grate', instruction: 'Grate the cucumber and squeeze out the extra water.' },
        { id: 'demo-draft-cuke-mix', instruction: 'Stir it into the yogurt with the mint and salt.' },
        { id: 'demo-draft-cuke-finish', instruction: 'Spoon into a bowl and finish with olive oil.' },
      ],
      updatedAt: '2026-11-08T13:30:00.000Z',
      photoUri: 'savora-draft://demo-draft-cucumber-yogurt',
    },
  ];
}
