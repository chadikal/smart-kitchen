import { extraRecipes } from './extra-recipes.ts';

type Language = 'en' | 'ar';
type Copy = Partial<Record<Language, string>>;
type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

type Named = { slug: string; name: Record<Language, string> };

type DemoIngredient = {
  slug: string;
  name: Record<Language, string>;
  quantity: string;
  unit: string;
  optional?: boolean;
};

type DemoRecipe = {
  slug: string;
  original: Language;
  title: Copy;
  description: Copy;
  country: Named;
  cuisine: Named;
  dietary: Named[];
  difficulty: Difficulty;
  prep: number;
  cook: number;
  total: number;
  servings: number;
  rest?: number;
  timingNote?: Copy;
  ingredients: DemoIngredient[];
  steps: Record<Language, string>[];
};

/** Arabic methods use a gender-neutral verbal noun: تقطيع البصل، إضافة الزيت، خلط المكونات. */
const both = (en: string, ar: string): Record<Language, string> => ({ en, ar });

const ingredient = (
  slug: string,
  en: string,
  ar: string,
  quantity: string,
  unit: string,
  optional = false,
): DemoIngredient => ({ slug, name: both(en, ar), quantity, unit, optional });

/**
 * Fixed portfolio catalog. My Kitchen matches these same ingredient slugs.
 * Photos are local and are not TheMealDB.
 */
export const demoRecipes: readonly DemoRecipe[] = [
  {
    slug: 'olive-oil-yogurt-cake',
    original: 'en',
    title: both('Olive oil yogurt cake', 'كعكة الزبادي بزيت الزيتون'),
    description: both(
      'A tender loaf with olive oil and plain yogurt, finished with a short rest so the crumb settles.',
      'كعكة طرية بزيت الزيتون واللبن، ترتاح قليلًا حتى يهدأ القوام.',
    ),
    country: { slug: 'france', name: both('France', 'فرنسا') },
    cuisine: { slug: 'home-baking', name: both('Home baking', 'خبز منزلي') },
    dietary: [{ slug: 'vegetarian', name: both('Vegetarian', 'نباتي') }],
    difficulty: 'EASY',
    prep: 15,
    cook: 40,
    total: 55,
    servings: 8,
    rest: 10,
    timingNote: both(
      'Let the cake rest for 10 minutes before slicing.',
      'ترك الكعكة ترتاح عشر دقائق قبل التقطيع.',
    ),
    ingredients: [
      ingredient('wheat-flour', 'Wheat flour', 'طحين القمح', '180.000', 'GRAM'),
      ingredient('sugar', 'Sugar', 'سكر', '150.000', 'GRAM'),
      ingredient('plain-yogurt', 'Plain yogurt', 'لبن زبادي', '200.000', 'GRAM'),
      ingredient('olive-oil', 'Olive oil', 'زيت زيتون', '80.000', 'MILLILITER'),
      ingredient('egg', 'Egg', 'بيض', '2.000', 'PIECE'),
      ingredient('baking-powder', 'Baking powder', 'بيكنج باودر', '8.000', 'GRAM'),
    ],
    steps: [
      both('Heat the oven to 180°C and oil a small loaf tin.', 'تسخين الفرن إلى 180 درجة ودهن قالب صغير بالزيت.'),
      both('Whisk the yogurt, oil, eggs, and sugar, then fold in the flour and baking powder.', 'خفق اللبن والزيت والبيض والسكر، ثم إضافة الطحين والبيكنج باودر.'),
      both('Bake until the top is golden and a skewer comes out clean, then rest before slicing.', 'الخبز حتى تصبح ذهبية ويخرج عود نظيف، ثم تركها ترتاح قبل التقطيع.'),
    ],
  },
  {
    slug: 'red-lentil-lemon-soup',
    original: 'en',
    title: both('Red lentil lemon soup', 'شوربة عدس بالليمون'),
    description: both(
      'A weeknight soup of red lentils, cumin, and lemon, finished with parsley if you have it.',
      'شوربة عدس أحمر بالكمون والليمون ليوم مشغول، ويُضاف البقدونس إن وُجد.',
    ),
    country: { slug: 'lebanon', name: both('Lebanon', 'لبنان') },
    cuisine: { slug: 'levantine', name: both('Levantine', 'شامي') },
    dietary: [{ slug: 'vegetarian', name: both('Vegetarian', 'نباتي') }],
    difficulty: 'EASY',
    prep: 10,
    cook: 30,
    total: 40,
    servings: 4,
    ingredients: [
      ingredient('red-lentils', 'Red lentils', 'عدس أحمر', '200.000', 'GRAM'),
      ingredient('yellow-onion', 'Yellow onion', 'بصل أصفر', '1.000', 'PIECE'),
      ingredient('garlic', 'Garlic', 'ثوم', '2.000', 'PIECE'),
      ingredient('olive-oil', 'Olive oil', 'زيت زيتون', '30.000', 'MILLILITER'),
      ingredient('lemon-juice', 'Lemon juice', 'عصير ليمون', '30.000', 'MILLILITER'),
      ingredient('ground-cumin', 'Ground cumin', 'كمون مطحون', '5.000', 'GRAM'),
      ingredient('flat-leaf-parsley', 'Flat-leaf parsley', 'بقدونس', '10.000', 'GRAM', true),
      ingredient('water', 'Water', 'ماء', '1.000', 'LITER'),
      ingredient('fine-salt', 'Fine salt', 'ملح ناعم', '4.000', 'GRAM'),
    ],
    steps: [
      both('Soften the onion and garlic in olive oil, then stir in the cumin.', 'تذبيل البصل والثوم في زيت الزيتون، ثم إضافة الكمون.'),
      both('Add the lentils, water, and salt. Simmer until the lentils collapse.', 'إضافة العدس والماء والملح، وتركه حتى يتفكك العدس.'),
      both('Stir in the lemon juice and parsley, then taste for salt.', 'إضافة عصير الليمون والبقدونس، ثم تذوق الملح.'),
    ],
  },
  {
    slug: 'semolina-milk-pudding',
    original: 'ar',
    title: { ar: 'سميد بالحليب' },
    description: { ar: 'حلوى سميد بالحليب والزبدة، تُقدَّم دافئة أو بعد أن تبرد.' },
    country: { slug: 'lebanon', name: both('Lebanon', 'لبنان') },
    cuisine: { slug: 'levantine', name: both('Levantine', 'شامي') },
    dietary: [{ slug: 'vegetarian', name: both('Vegetarian', 'نباتي') }],
    difficulty: 'EASY',
    prep: 5,
    cook: 15,
    total: 20,
    servings: 4,
    ingredients: [
      ingredient('whole-milk', 'Whole milk', 'حليب كامل الدسم', '500.000', 'MILLILITER'),
      ingredient('semolina', 'Semolina', 'سميد', '60.000', 'GRAM'),
      ingredient('sugar', 'Sugar', 'سكر', '50.000', 'GRAM'),
      ingredient('butter', 'Butter', 'زبدة', '20.000', 'GRAM'),
    ],
    steps: [
      both('Warm the milk with the sugar until the sugar dissolves.', 'تسخين الحليب مع السكر حتى يذوب.'),
      both('Rain in the semolina while stirring so it stays smooth.', 'إضافة السميد تدريجيًا مع التحريك حتى يبقى ناعمًا.'),
      both('Cook until it thickens, then stir in the butter.', 'الطهي حتى يثخن، ثم إضافة الزبدة.'),
    ],
  },
  {
    slug: 'lemon-herb-roast-chicken',
    original: 'en',
    title: both('Lemon herb roast chicken', 'دجاج مشوي بالليمون والأعشاب'),
    description: both(
      'A Sunday chicken roasted with lemon, garlic, and potatoes in the same pan.',
      'دجاج الأحد مع الليمون والثوم والبطاطا في الصينية نفسها.',
    ),
    country: { slug: 'united-states', name: both('United States', 'الولايات المتحدة') },
    cuisine: { slug: 'american', name: both('American', 'أمريكي') },
    dietary: [],
    difficulty: 'MEDIUM',
    prep: 20,
    cook: 75,
    total: 95,
    servings: 4,
    rest: 10,
    timingNote: both(
      'Let the chicken rest for 10 minutes before carving.',
      'ترك الدجاج يرتاح عشر دقائق قبل التقطيع.',
    ),
    ingredients: [
      ingredient('chicken', 'Whole chicken', 'دجاجة كاملة', '1.000', 'PIECE'),
      ingredient('lemon', 'Lemon', 'ليمون', '1.000', 'PIECE'),
      ingredient('garlic', 'Garlic', 'ثوم', '4.000', 'PIECE'),
      ingredient('potato', 'Potato', 'بطاطا', '500.000', 'GRAM'),
      ingredient('olive-oil', 'Olive oil', 'زيت زيتون', '30.000', 'MILLILITER'),
    ],
    steps: [
      both('Heat the oven to 200°C. Rub the chicken with oil, salt, lemon, and garlic.', 'تسخين الفرن إلى 200 درجة. فرك الدجاج بالزيت والملح والليمون والثوم.'),
      both('Tuck the potatoes around the bird and roast until the juices run clear.', 'وضع البطاطا حول الدجاج والشوي حتى يصبح العصير صافيًا.'),
      both('Rest, then carve and spoon the pan juices over the meat.', 'الترك يرتاح، ثم التقطيع وسكب عصارة الصينية فوقه.'),
    ],
  },
  {
    slug: 'tofu-miso-soup',
    original: 'en',
    title: both('Tofu miso soup', 'شوربة ميسو بالتوفو'),
    description: both(
      'A light bowl of miso, silken tofu, and scallions. It comes together in one pot.',
      'وعاء خفيف من الميسو والتوفو والبصل الأخضر، يُحضَّر في قدر واحد.',
    ),
    country: { slug: 'japan', name: both('Japan', 'اليابان') },
    cuisine: { slug: 'japanese', name: both('Japanese', 'ياباني') },
    dietary: [{ slug: 'vegetarian', name: both('Vegetarian', 'نباتي') }],
    difficulty: 'EASY',
    prep: 10,
    cook: 15,
    total: 25,
    servings: 2,
    ingredients: [
      ingredient('silken-tofu', 'Silken tofu', 'توفو ناعم', '200.000', 'GRAM'),
      ingredient('miso', 'Miso paste', 'معجون ميسو', '30.000', 'GRAM'),
      ingredient('scallion', 'Scallion', 'بصل أخضر', '2.000', 'PIECE'),
      ingredient('water', 'Water', 'ماء', '750.000', 'MILLILITER'),
    ],
    steps: [
      both('Bring the water to a simmer. Do not let it boil hard once the miso goes in.', 'ترك الماء يغلي بهدوء، دون غليان قوي بعد إضافة الميسو.'),
      both('Whisk in the miso off the heat, then add the tofu.', 'إذابة الميسو بعيدًا عن النار، ثم إضافة التوفو.'),
      both('Warm through and finish with scallions.', 'التسخين قليلًا ثم إضافة البصل الأخضر.'),
    ],
  },
  {
    slug: 'black-bean-skillet',
    original: 'en',
    title: both('Black bean skillet', 'مقلاة الفاصوليا السوداء'),
    description: both(
      'Black beans, sweetcorn, and red pepper cooked in one skillet and finished with lime.',
      'فاصوليا سوداء وذرة وفلفل أحمر في مقلاة واحدة، وتُختتم بالليمون.',
    ),
    country: { slug: 'mexico', name: both('Mexico', 'المكسيك') },
    cuisine: { slug: 'mexican', name: both('Mexican', 'مكسيكي') },
    dietary: [{ slug: 'vegetarian', name: both('Vegetarian', 'نباتي') }],
    difficulty: 'EASY',
    prep: 10,
    cook: 25,
    total: 35,
    servings: 3,
    ingredients: [
      ingredient('black-beans', 'Black beans', 'فاصوليا سوداء', '400.000', 'GRAM'),
      ingredient('sweetcorn', 'Sweetcorn', 'ذرة', '150.000', 'GRAM'),
      ingredient('red-pepper', 'Red pepper', 'فلفل أحمر', '1.000', 'PIECE'),
      ingredient('lime', 'Lime', 'ليمون أخضر', '1.000', 'PIECE'),
    ],
    steps: [
      both('Cook the pepper in a little oil until it softens.', 'طهي الفلفل بقليل من الزيت حتى يلين.'),
      both('Add the beans and sweetcorn and simmer until the pan looks glossy.', 'إضافة الفاصوليا والذرة وتركها حتى تلمع.'),
      both('Squeeze over the lime and serve warm.', 'عصر الليمون والتقديم دافئة.'),
    ],
  },
  {
    slug: 'spinach-fatayer',
    original: 'en',
    title: both('Spinach fatayer', 'فطائر السبانخ'),
    description: both(
      'Small spinach pies with lemon and sumac, baked until the pastry is golden.',
      'فطائر سبانخ بالليمون والسماق، تُخبز حتى تصبح العجينة ذهبية.',
    ),
    country: { slug: 'lebanon', name: both('Lebanon', 'لبنان') },
    cuisine: { slug: 'levantine', name: both('Levantine', 'شامي') },
    dietary: [{ slug: 'vegetarian', name: both('Vegetarian', 'نباتي') }],
    difficulty: 'MEDIUM',
    prep: 25,
    cook: 20,
    total: 45,
    servings: 8,
    ingredients: [
      ingredient('wheat-flour', 'Wheat flour', 'طحين القمح', '300.000', 'GRAM'),
      ingredient('olive-oil', 'Olive oil', 'زيت زيتون', '45.000', 'MILLILITER'),
      ingredient('water', 'Water', 'ماء', '120.000', 'MILLILITER'),
      ingredient('spinach', 'Spinach', 'سبانخ', '400.000', 'GRAM'),
      ingredient('yellow-onion', 'Yellow onion', 'بصل أصفر', '1.000', 'PIECE'),
      ingredient('lemon-juice', 'Lemon juice', 'عصير ليمون', '20.000', 'MILLILITER'),
      ingredient('sumac', 'Sumac', 'سماق', '5.000', 'GRAM'),
      ingredient('fine-salt', 'Fine salt', 'ملح ناعم', '4.000', 'GRAM'),
    ],
    steps: [
      both('Mix the flour, half the oil, a pinch of salt, and the water into a soft dough. Rest it for 15 minutes.', 'خلط الطحين ونصف الزيت ورشة ملح والماء حتى تتكون عجينة طرية، ثم تركها 15 دقيقة.'),
      both('Wilt the spinach with the chopped onion, lemon juice, sumac, salt, and the remaining oil. Squeeze out the extra liquid.', 'تذبيل السبانخ مع البصل المفروم وعصير الليمون والسماق والملح وباقي الزيت، ثم عصر السائل الزائد.'),
      both('Divide the dough, fill each round with spinach, and pinch it into a triangle.', 'تقسيم العجينة، وحشو كل قرص بالسبانخ، ثم إغلاقه على شكل مثلث.'),
      both('Bake at 200°C until the pastry is golden, about 20 minutes.', 'الخبز على 200 درجة حتى تصبح ذهبية، نحو 20 دقيقة.'),
    ],
  },
  {
    slug: 'mushroom-risotto',
    original: 'en',
    title: both('Mushroom risotto', 'ريزوتو الفطر'),
    description: both(
      'Arborio rice cooked slowly with mushrooms and butter, finished with a little cheese.',
      'أرز أربوريو يُطهى على مهل مع الفطر والزبدة، ويُختتم بقليل من الجبن.',
    ),
    country: { slug: 'italy', name: both('Italy', 'إيطاليا') },
    cuisine: { slug: 'italian', name: both('Italian', 'إيطالي') },
    dietary: [{ slug: 'vegetarian', name: both('Vegetarian', 'نباتي') }],
    difficulty: 'MEDIUM',
    prep: 10,
    cook: 30,
    total: 40,
    servings: 4,
    ingredients: [
      ingredient('arborio-rice', 'Arborio rice', 'أرز أربوريو', '200.000', 'GRAM'),
      ingredient('mushroom', 'Mushroom', 'فطر', '250.000', 'GRAM'),
      ingredient('yellow-onion', 'Yellow onion', 'بصل أصفر', '1.000', 'PIECE'),
      ingredient('garlic', 'Garlic', 'ثوم', '1.000', 'PIECE'),
      ingredient('butter', 'Butter', 'زبدة', '30.000', 'GRAM'),
      ingredient('vegetable-stock', 'Vegetable stock', 'مرق خضار', '800.000', 'MILLILITER'),
      ingredient('parmesan', 'Parmesan', 'جبن بارميزان', '40.000', 'GRAM'),
      ingredient('olive-oil', 'Olive oil', 'زيت زيتون', '15.000', 'MILLILITER'),
    ],
    steps: [
      both('Warm the stock and keep it at a bare simmer.', 'تسخين المرق وإبقاؤه على نار هادئة جدًا.'),
      both('Cook the onion and garlic in olive oil, add the sliced mushrooms, and let them brown.', 'طهي البصل والثوم في زيت الزيتون، ثم إضافة الفطر المقطّع وتركه يتحمّر.'),
      both('Stir in the rice, then add the stock a ladle at a time, stirring until each ladle is absorbed.', 'إضافة الأرز، ثم إضافة المرق مغرفة بعد مغرفة مع التحريك حتى يمتصه الأرز.'),
      both('When the rice is tender, beat in the butter and parmesan and rest for a minute.', 'عندما يلين الأرز، إضافة الزبدة والبارميزان وتركه دقيقة.'),
    ],
  },
  {
    slug: 'chickpea-tomato-stew',
    original: 'en',
    title: both('Chickpea and tomato stew', 'يخنة الحمص والطماطم'),
    description: both(
      'Chickpeas simmered with tomato, cumin, and garlic until the sauce thickens.',
      'حمص يُطهى مع الطماطم والكمون والثوم حتى يثخن الصلصة.',
    ),
    country: { slug: 'tunisia', name: both('Tunisia', 'تونس') },
    cuisine: { slug: 'north-african', name: both('North African', 'شمال أفريقي') },
    dietary: [
      { slug: 'vegetarian', name: both('Vegetarian', 'نباتي') },
      { slug: 'vegan', name: both('Vegan', 'نباتي صرف') },
    ],
    difficulty: 'EASY',
    prep: 10,
    cook: 30,
    total: 40,
    servings: 4,
    ingredients: [
      ingredient('chickpeas', 'Chickpeas', 'حمص', '400.000', 'GRAM'),
      ingredient('tomato', 'Tomato', 'طماطم', '400.000', 'GRAM'),
      ingredient('yellow-onion', 'Yellow onion', 'بصل أصفر', '1.000', 'PIECE'),
      ingredient('garlic', 'Garlic', 'ثوم', '2.000', 'PIECE'),
      ingredient('olive-oil', 'Olive oil', 'زيت زيتون', '30.000', 'MILLILITER'),
      ingredient('ground-cumin', 'Ground cumin', 'كمون مطحون', '5.000', 'GRAM'),
      ingredient('paprika', 'Paprika', 'بابريكا', '4.000', 'GRAM'),
      ingredient('fine-salt', 'Fine salt', 'ملح ناعم', '4.000', 'GRAM'),
      ingredient('flat-leaf-parsley', 'Flat-leaf parsley', 'بقدونس', '10.000', 'GRAM', true),
    ],
    steps: [
      both('Soften the onion and garlic in olive oil.', 'تذبيل البصل والثوم في زيت الزيتون.'),
      both('Stir in the cumin and paprika, then add the chopped tomatoes and salt.', 'إضافة الكمون والبابريكا، ثم الطماطم المفرومة والملح.'),
      both('Add the chickpeas and simmer until the sauce is thick, about 25 minutes.', 'إضافة الحمص وتركه على نار هادئة حتى تثخن الصلصة، نحو 25 دقيقة.'),
      both('Finish with parsley if you have it.', 'إضافة البقدونس إن وُجد.'),
    ],
  },
  {
    slug: 'apple-oat-crumble',
    original: 'en',
    title: both('Apple oat crumble', 'كرامبل التفاح بالشوفان'),
    description: both(
      'Soft apples under a butter and oat topping, baked until the crust is crisp.',
      'تفاح طري تحت طبقة من الشوفان والزبدة، يُخبز حتى تصبح القشرة مقرمشة.',
    ),
    country: { slug: 'united-kingdom', name: both('United Kingdom', 'المملكة المتحدة') },
    cuisine: { slug: 'home-baking', name: both('Home baking', 'خبز منزلي') },
    dietary: [{ slug: 'vegetarian', name: both('Vegetarian', 'نباتي') }],
    difficulty: 'EASY',
    prep: 15,
    cook: 30,
    total: 45,
    servings: 6,
    ingredients: [
      ingredient('apple', 'Apple', 'تفاح', '600.000', 'GRAM'),
      ingredient('rolled-oats', 'Rolled oats', 'شوفان', '80.000', 'GRAM'),
      ingredient('wheat-flour', 'Wheat flour', 'طحين القمح', '60.000', 'GRAM'),
      ingredient('butter', 'Butter', 'زبدة', '70.000', 'GRAM'),
      ingredient('sugar', 'Sugar', 'سكر', '50.000', 'GRAM'),
      ingredient('ground-cinnamon', 'Ground cinnamon', 'قرفة مطحونة', '3.000', 'GRAM'),
      ingredient('lemon-juice', 'Lemon juice', 'عصير ليمون', '15.000', 'MILLILITER'),
    ],
    steps: [
      both('Heat the oven to 180°C. Toss the sliced apples with lemon juice and half the sugar.', 'تسخين الفرن إلى 180 درجة. خلط التفاح المقطّع مع عصير الليمون ونصف السكر.'),
      both('Rub the butter into the flour, oats, cinnamon, and remaining sugar until it looks like crumbs.', 'فرك الزبدة مع الطحين والشوفان والقرفة وباقي السكر حتى تصبح كالفتات.'),
      both('Pile the crumbs over the apples and bake until the top is golden and the fruit is soft, about 30 minutes.', 'توزيع الفتات فوق التفاح والخَبز حتى يصبح ذهبيًا وتلين الفاكهة، نحو 30 دقيقة.'),
    ],
  },
  ...extraRecipes,
];

const bySlug = new Map(demoRecipes.map((recipe) => [recipe.slug, recipe]));

function pick(copy: Copy, requested: Language, original: Language): { text: string; language: Language } {
  const translated = copy[requested];
  if (translated) return { text: translated, language: requested };
  return { text: copy[original] ?? '', language: original };
}

function named(entry: Named, requested: Language) {
  const chosen = pick(entry.name, requested, 'en');
  return {
    slug: entry.slug,
    name: chosen.text,
    language: chosen.language,
    fallbackUsed: chosen.language !== requested,
  };
}

function card(recipe: DemoRecipe, requested: Language) {
  const title = pick(recipe.title, requested, recipe.original);
  return {
    slug: recipe.slug,
    title: title.text,
    photo: null,
    totalTimeMinutes: recipe.total,
    difficulty: recipe.difficulty,
    fallbackUsed: title.language !== requested,
    contentLanguage: title.language,
    countries: [named(recipe.country, requested)],
    cuisines: [named(recipe.cuisine, requested)],
    dietaryTags: recipe.dietary.map((tag) => named(tag, requested)),
    factSources: { totalTimeMinutes: 'PUBLISHED', difficulty: 'PUBLISHED' },
  };
}

const featuredSlug = 'olive-oil-yogurt-cake';
const pickSlugs = ['vegetable-tagine', 'chana-masala', 'spanish-tortilla'] as const;
const quickSlugs = ['greek-village-salad', 'semolina-milk-pudding', 'tofu-miso-soup', 'menemen'] as const;

export function demoHomeBody(language: Language): unknown {
  const featured = bySlug.get(featuredSlug);
  const picks = pickSlugs.map((slug) => bySlug.get(slug));
  const quick = quickSlugs.map((slug) => bySlug.get(slug));
  if (!featured || picks.some((recipe) => !recipe) || quick.some((recipe) => !recipe)) return null;
  const used = new Set<string>([featuredSlug, ...pickSlugs, ...quickSlugs]);
  const more = demoRecipes.filter((recipe) => !used.has(recipe.slug));
  return {
    featured: card(featured, language),
    picks: picks.map((recipe) => card(recipe!, language)),
    quick: quick.map((recipe) => card(recipe!, language)),
    more: more.map((recipe) => card(recipe, language)),
  };
}

export function demoListBody(params: URLSearchParams): unknown {
  const language: Language = params.get('lang') === 'ar' ? 'ar' : 'en';
  const query = (params.get('q') ?? '').trim().toLocaleLowerCase(language);
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);
  const pageSize = Math.max(1, Number(params.get('pageSize') ?? '20') || 20);
  let items = demoRecipes.filter((recipe) => {
    if (params.get('country') && recipe.country.slug !== params.get('country')) return false;
    if (params.get('cuisine') && recipe.cuisine.slug !== params.get('cuisine')) return false;
    if (params.get('dietaryTag') && !recipe.dietary.some((tag) => tag.slug === params.get('dietaryTag'))) return false;
    if (params.get('difficulty') && recipe.difficulty !== params.get('difficulty')) return false;
    const max = params.get('maxTotalMinutes');
    if (max && recipe.total > Number(max)) return false;
    if (!query) return true;
    const titles = [recipe.title.en, recipe.title.ar].filter((value): value is string => Boolean(value));
    return titles.some((title) => title.toLocaleLowerCase(language).includes(query));
  });
  const sort = params.get('sort');
  items = items.slice().sort((left, right) => {
    if (sort === 'fastest' && left.total !== right.total) return left.total - right.total;
    if (sort === 'easiest' && left.difficulty !== right.difficulty) return left.difficulty === 'EASY' ? -1 : 1;
    const leftTitle = pick(left.title, language, left.original).text;
    const rightTitle = pick(right.title, language, right.original).text;
    return leftTitle.localeCompare(rightTitle, language);
  });
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize).map((recipe) => card(recipe, language)),
    total: items.length,
  };
}

export function demoOptionsBody(kind: 'countries' | 'cuisines' | 'dietary-tags', language: Language): unknown {
  const seen = new Map<string, Named>();
  for (const recipe of demoRecipes) {
    const entries = kind === 'countries' ? [recipe.country] : kind === 'cuisines' ? [recipe.cuisine] : recipe.dietary;
    for (const entry of entries) seen.set(entry.slug, entry);
  }
  return {
    items: [...seen.values()]
      .map((entry) => named(entry, language))
      .sort((left, right) => left.name.localeCompare(right.name, language)),
  };
}

export function demoDetailBody(slug: string, language: Language): unknown | null {
  const recipe = bySlug.get(slug);
  if (!recipe) return null;
  const title = pick(recipe.title, language, recipe.original);
  const spoken = title.language;
  const description = pick(recipe.description, spoken, recipe.original);
  const note = recipe.timingNote ? pick(recipe.timingNote, spoken, recipe.original) : null;
  return {
    slug: recipe.slug,
    title: title.text,
    description: description.text,
    requestedLanguage: language,
    contentLanguage: title.language,
    fallbackUsed: title.language !== language,
    originalLanguage: recipe.original,
    photo: null,
    source: null,
    difficulty: recipe.difficulty,
    prepTimeMinutes: recipe.prep,
    cookTimeMinutes: recipe.cook > 0 ? recipe.cook : null,
    totalTimeMinutes: recipe.total,
    servings: recipe.servings,
    additionalTimeMinutes: recipe.rest ?? 0,
    timingNote: note?.text ?? null,
    factSources: {
      prepTimeMinutes: 'PUBLISHED',
      cookTimeMinutes: 'PUBLISHED',
      totalTimeMinutes: 'PUBLISHED',
      difficulty: 'PUBLISHED',
    },
    countries: [named(recipe.country, language)],
    cuisines: [named(recipe.cuisine, language)],
    dietaryTags: recipe.dietary.map((tag) => named(tag, language)),
    ingredients: recipe.ingredients.map((line, index) => ({
      position: index + 1,
      ingredientSlug: line.slug,
      name: pick(line.name, spoken, 'en').text,
      language: pick(line.name, spoken, 'en').language,
      quantity: line.quantity,
      unit: line.unit,
      qualitativeAmount: null,
      optional: line.optional === true,
      note: null,
    })),
    steps: recipe.steps.map((step, index) => ({
      position: index + 1,
      instruction: pick(step, spoken, recipe.original).text,
    })),
  };
}

export function demoCatalogBody(url: string): unknown | null {
  const parsed = new URL(url, 'http://savora.local');
  const language: Language = parsed.searchParams.get('lang') === 'ar' ? 'ar' : 'en';
  if (parsed.pathname.endsWith('/recipes/home')) return demoHomeBody(language);
  if (parsed.pathname.endsWith('/countries')) return demoOptionsBody('countries', language);
  if (parsed.pathname.endsWith('/cuisines')) return demoOptionsBody('cuisines', language);
  if (parsed.pathname.endsWith('/dietary-tags')) return demoOptionsBody('dietary-tags', language);
  if (parsed.pathname.endsWith('/recipes')) return demoListBody(parsed.searchParams);
  const detail = parsed.pathname.match(/\/recipes\/([a-z0-9-]+)$/);
  if (detail?.[1]) return demoDetailBody(detail[1], language);
  return null;
}
