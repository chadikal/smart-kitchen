type Language = 'en' | 'ar';
type Copy = Record<Language, string>;

type Named = { slug: string; name: Copy };

type DemoIngredient = {
  slug: string;
  name: Copy;
  quantity: string;
  unit: string;
  optional?: boolean;
};

export type ExtraRecipe = {
  slug: string;
  original: Language;
  title: Copy;
  description: Copy;
  country: Named;
  cuisine: Named;
  dietary: Named[];
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  prep: number;
  cook: number;
  total: number;
  servings: number;
  ingredients: DemoIngredient[];
  steps: Copy[];
};

/** Arabic methods use a gender-neutral verbal noun: تقطيع البصل، إضافة الزيت، خلط المكونات. */
const both = (en: string, ar: string): Copy => ({ en, ar });

const ingredient = (
  slug: string,
  en: string,
  ar: string,
  quantity: string,
  unit: string,
  optional = false,
): DemoIngredient => ({ slug, name: both(en, ar), quantity, unit, optional });

const vegetarian = { slug: 'vegetarian', name: both('Vegetarian', 'نباتي') };
const vegan = { slug: 'vegan', name: both('Vegan', 'نباتي صرف') };

/** Additional portfolio recipes. Ingredient slugs match the rest of the demo catalog. */
export const extraRecipes: readonly ExtraRecipe[] = [
  {
    slug: 'greek-village-salad',
    original: 'en',
    title: both('Greek village salad', 'سلطة يونانية'),
    description: both(
      'Tomatoes, cucumber, onion, olives, and a block of feta, dressed only with olive oil and oregano.',
      'طماطم وخيار وبصل وزيتون وقطعة فيتا، بزيت الزيتون والأوريغانو فقط.',
    ),
    country: { slug: 'greece', name: both('Greece', 'اليونان') },
    cuisine: { slug: 'greek', name: both('Greek', 'يوناني') },
    dietary: [vegetarian],
    difficulty: 'EASY',
    prep: 15,
    cook: 0,
    total: 15,
    servings: 4,
    ingredients: [
      ingredient('tomato', 'Tomato', 'طماطم', '400.000', 'GRAM'),
      ingredient('cucumber', 'Cucumber', 'خيار', '1.000', 'PIECE'),
      ingredient('red-onion', 'Red onion', 'بصل أحمر', '0.500', 'PIECE'),
      ingredient('feta', 'Feta', 'جبن فيتا', '150.000', 'GRAM'),
      ingredient('kalamata-olives', 'Kalamata olives', 'زيتون كلاماتا', '80.000', 'GRAM'),
      ingredient('olive-oil', 'Olive oil', 'زيت زيتون', '40.000', 'MILLILITER'),
      ingredient('dried-oregano', 'Dried oregano', 'أوريغانو مجفف', '2.000', 'GRAM'),
    ],
    steps: [
      both('Cut the tomatoes into wedges and the cucumber into thick half-moons. Slice the onion thinly.', 'تقطيع الطماطم أسافين والخيار أنصاف دوائر سميكة، وتشريح البصل رقيقًا.'),
      both('Add the olives and lay the feta on top in one piece.', 'إضافة الزيتون ووضع الفيتا فوقها قطعة واحدة.'),
      both('Dress with olive oil and oregano. Do not toss the feta into the salad.', 'التتبيل بزيت الزيتون والأوريغانو، من دون خلط الفيتا بالسلطة.'),
    ],
  },
  {
    slug: 'spanish-tortilla',
    original: 'en',
    title: both('Spanish tortilla', 'تورتيلا إسبانية'),
    description: both(
      'A thick potato and onion omelette, cooked slowly in olive oil until the center is just set.',
      'عجة سميكة بالبطاطا والبصل، تُطهى على مهل بزيت الزيتون حتى يتماسك الوسط.',
    ),
    country: { slug: 'spain', name: both('Spain', 'إسبانيا') },
    cuisine: { slug: 'spanish', name: both('Spanish', 'إسباني') },
    dietary: [vegetarian],
    difficulty: 'MEDIUM',
    prep: 15,
    cook: 30,
    total: 45,
    servings: 4,
    ingredients: [
      ingredient('potato', 'Potato', 'بطاطا', '500.000', 'GRAM'),
      ingredient('yellow-onion', 'Yellow onion', 'بصل أصفر', '1.000', 'PIECE'),
      ingredient('egg', 'Egg', 'بيض', '5.000', 'PIECE'),
      ingredient('olive-oil', 'Olive oil', 'زيت زيتون', '80.000', 'MILLILITER'),
      ingredient('fine-salt', 'Fine salt', 'ملح ناعم', '4.000', 'GRAM'),
    ],
    steps: [
      both('Slice the potatoes and onion. Cook them gently in the olive oil until the potatoes are tender, not browned.', 'تشريح البطاطا والبصل، وطهيهما بهدوء في زيت الزيتون حتى تلين البطاطا دون أن تتحمّر.'),
      both('Beat the eggs with the salt, fold in the drained potatoes, and rest the mixture for five minutes.', 'خفق البيض مع الملح، ثم إضافة البطاطا المصفاة وترك الخليط خمس دقائق.'),
      both('Cook in a small pan over medium-low heat, turn it once, and stop while the center is still soft.', 'الطهي في مقلاة صغيرة على نار متوسطة هادئة، والقلب مرة واحدة، وإيقاف الطهي والوسط ما يزال طريًا.'),
    ],
  },
  {
    slug: 'chana-masala',
    original: 'en',
    title: both('Chana masala', 'تشانا ماسالا'),
    description: both(
      'Chickpeas simmered in a tomato and onion gravy with cumin, coriander, and turmeric.',
      'حمص يُطهى في صلصة طماطم وبصل مع الكمون والكزبرة والكركم.',
    ),
    country: { slug: 'india', name: both('India', 'الهند') },
    cuisine: { slug: 'indian', name: both('Indian', 'هندي') },
    dietary: [vegetarian, vegan],
    difficulty: 'EASY',
    prep: 10,
    cook: 30,
    total: 40,
    servings: 4,
    ingredients: [
      ingredient('chickpeas', 'Chickpeas', 'حمص', '480.000', 'GRAM'),
      ingredient('yellow-onion', 'Yellow onion', 'بصل أصفر', '1.000', 'PIECE'),
      ingredient('garlic', 'Garlic', 'ثوم', '3.000', 'PIECE'),
      ingredient('tomato', 'Tomato', 'طماطم', '300.000', 'GRAM'),
      ingredient('ground-cumin', 'Ground cumin', 'كمون مطحون', '5.000', 'GRAM'),
      ingredient('ground-coriander', 'Ground coriander', 'كزبرة مطحونة', '5.000', 'GRAM'),
      ingredient('turmeric', 'Turmeric', 'كركم', '2.000', 'GRAM'),
      ingredient('olive-oil', 'Olive oil', 'زيت زيتون', '30.000', 'MILLILITER'),
      ingredient('fine-salt', 'Fine salt', 'ملح ناعم', '4.000', 'GRAM'),
    ],
    steps: [
      both('Cook the chopped onion in the oil until it turns golden, then add the garlic.', 'طهي البصل المفروم في الزيت حتى يذهب، ثم إضافة الثوم.'),
      both('Stir in the cumin, coriander, and turmeric, then add the chopped tomatoes and salt.', 'إضافة الكمون والكزبرة والكركم، ثم الطماطم المفرومة والملح.'),
      both('Add the chickpeas with a splash of water and simmer until the gravy is thick, about 25 minutes.', 'إضافة الحمص مع قليل من الماء وتركه حتى تثخن الصلصة، نحو 25 دقيقة.'),
    ],
  },
  {
    slug: 'vegetable-tagine',
    original: 'en',
    title: both('Vegetable tagine', 'طاجين الخضار'),
    description: both(
      'Chickpeas, carrots, and zucchini cooked slowly with cumin and cinnamon.',
      'حمص وجزر وكوسا تُطهى على مهل مع الكمون والقرفة.',
    ),
    country: { slug: 'morocco', name: both('Morocco', 'المغرب') },
    cuisine: { slug: 'moroccan', name: both('Moroccan', 'مغربي') },
    dietary: [vegetarian, vegan],
    difficulty: 'MEDIUM',
    prep: 15,
    cook: 40,
    total: 55,
    servings: 4,
    ingredients: [
      ingredient('chickpeas', 'Chickpeas', 'حمص', '400.000', 'GRAM'),
      ingredient('carrot', 'Carrot', 'جزر', '250.000', 'GRAM'),
      ingredient('zucchini', 'Zucchini', 'كوسا', '250.000', 'GRAM'),
      ingredient('yellow-onion', 'Yellow onion', 'بصل أصفر', '1.000', 'PIECE'),
      ingredient('garlic', 'Garlic', 'ثوم', '2.000', 'PIECE'),
      ingredient('tomato', 'Tomato', 'طماطم', '200.000', 'GRAM'),
      ingredient('olive-oil', 'Olive oil', 'زيت زيتون', '30.000', 'MILLILITER'),
      ingredient('ground-cumin', 'Ground cumin', 'كمون مطحون', '5.000', 'GRAM'),
      ingredient('ground-cinnamon', 'Ground cinnamon', 'قرفة مطحونة', '2.000', 'GRAM'),
      ingredient('fine-salt', 'Fine salt', 'ملح ناعم', '4.000', 'GRAM'),
    ],
    steps: [
      both('Soften the onion and garlic in olive oil, then stir in the cumin and cinnamon.', 'تذبيل البصل والثوم في زيت الزيتون، ثم إضافة الكمون والقرفة.'),
      both('Add the carrots, tomatoes, chickpeas, salt, and enough water to barely cover them.', 'إضافة الجزر والطماطم والحمص والملح وماء يكفي لتغطيتها بالكاد.'),
      both('Cover and simmer for 25 minutes. Add the zucchini and cook until it is tender, about 10 minutes more.', 'تغطية القدر وتركه 25 دقيقة، ثم إضافة الكوسا حتى تلين، نحو 10 دقائق.'),
    ],
  },
  {
    slug: 'tofu-pad-thai',
    original: 'en',
    title: both('Tofu pad thai', 'باد تاي بالتوفو'),
    description: both(
      'Rice noodles with firm tofu, bean sprouts, peanuts, and lime. No fish sauce.',
      'نودلز الأرز مع التوفو المتماسك وبراعم الفاصوليا والفول السوداني والليمون، من دون صلصة سمك.',
    ),
    country: { slug: 'thailand', name: both('Thailand', 'تايلاند') },
    cuisine: { slug: 'thai', name: both('Thai', 'تايلاندي') },
    dietary: [vegetarian],
    difficulty: 'MEDIUM',
    prep: 15,
    cook: 15,
    total: 30,
    servings: 2,
    ingredients: [
      ingredient('rice-noodles', 'Rice noodles', 'نودلز الأرز', '200.000', 'GRAM'),
      ingredient('firm-tofu', 'Firm tofu', 'توفو متماسك', '200.000', 'GRAM'),
      ingredient('garlic', 'Garlic', 'ثوم', '2.000', 'PIECE'),
      ingredient('bean-sprouts', 'Bean sprouts', 'براعم الفاصوليا', '100.000', 'GRAM'),
      ingredient('lime', 'Lime', 'ليمون أخضر', '1.000', 'PIECE'),
      ingredient('peanuts', 'Peanuts', 'فول سوداني', '30.000', 'GRAM'),
      ingredient('soy-sauce', 'Soy sauce', 'صلصة الصويا', '30.000', 'MILLILITER'),
      ingredient('scallion', 'Scallion', 'بصل أخضر', '2.000', 'PIECE'),
    ],
    steps: [
      both('Soak the noodles until they bend, then drain them.', 'نقع النودلز حتى تلين، ثم تصفيتها.'),
      both('Fry the tofu cubes until golden. Add the garlic, noodles, and soy sauce and toss until the noodles are coated.', 'قلي مكعبات التوفو حتى تذهب، ثم إضافة الثوم والنودلز وصلصة الصويا والقلب حتى تتغطى.'),
      both('Add the bean sprouts and scallions. Serve with peanuts and lime.', 'إضافة براعم الفاصوليا والبصل الأخضر، والتقديم مع الفول السوداني والليمون.'),
    ],
  },
  {
    slug: 'menemen',
    original: 'en',
    title: both('Menemen', 'مينمين'),
    description: both(
      'Eggs folded into tomatoes and green peppers, cooked in olive oil and served warm.',
      'بيض يُخلط مع الطماطم والفلفل الأخضر، ويُطهى بزيت الزيتون ويُقدَّم دافئًا.',
    ),
    country: { slug: 'turkey', name: both('Turkey', 'تركيا') },
    cuisine: { slug: 'turkish', name: both('Turkish', 'تركي') },
    dietary: [vegetarian],
    difficulty: 'EASY',
    prep: 10,
    cook: 15,
    total: 25,
    servings: 2,
    ingredients: [
      ingredient('egg', 'Egg', 'بيض', '3.000', 'PIECE'),
      ingredient('tomato', 'Tomato', 'طماطم', '300.000', 'GRAM'),
      ingredient('green-pepper', 'Green pepper', 'فلفل أخضر', '1.000', 'PIECE'),
      ingredient('yellow-onion', 'Yellow onion', 'بصل أصفر', '0.500', 'PIECE'),
      ingredient('olive-oil', 'Olive oil', 'زيت زيتون', '30.000', 'MILLILITER'),
      ingredient('fine-salt', 'Fine salt', 'ملح ناعم', '3.000', 'GRAM'),
    ],
    steps: [
      both('Cook the onion and green pepper in the olive oil until they soften.', 'طهي البصل والفلفل الأخضر في زيت الزيتون حتى يلين.'),
      both('Add the chopped tomatoes and salt and simmer until the sauce thickens.', 'إضافة الطماطم المفرومة والملح وتركها حتى تثخن الصلصة.'),
      both('Pour in the beaten eggs and fold them through the sauce until just set.', 'إضافة البيض المخفوق وقلبه في الصلصة حتى يتماسك.'),
    ],
  },
  {
    slug: 'lemon-ricotta-pasta',
    original: 'en',
    title: both('Lemon ricotta pasta', 'معكرونة الريكوتا والليمون'),
    description: both(
      'Short pasta tossed with ricotta, lemon, and black pepper. It needs no simmering sauce.',
      'معكرونة قصيرة مع الريكوتا والليمون والفلفل الأسود، من دون صلصة على النار.',
    ),
    country: { slug: 'italy', name: both('Italy', 'إيطاليا') },
    cuisine: { slug: 'italian', name: both('Italian', 'إيطالي') },
    dietary: [vegetarian],
    difficulty: 'EASY',
    prep: 10,
    cook: 15,
    total: 25,
    servings: 2,
    ingredients: [
      ingredient('short-pasta', 'Short pasta', 'معكرونة قصيرة', '200.000', 'GRAM'),
      ingredient('ricotta', 'Ricotta', 'ريكوتا', '150.000', 'GRAM'),
      ingredient('lemon', 'Lemon', 'ليمون', '1.000', 'PIECE'),
      ingredient('olive-oil', 'Olive oil', 'زيت زيتون', '15.000', 'MILLILITER'),
      ingredient('black-pepper', 'Black pepper', 'فلفل أسود', '1.000', 'GRAM'),
      ingredient('fine-salt', 'Fine salt', 'ملح ناعم', '3.000', 'GRAM'),
      ingredient('basil', 'Basil', 'ريحان', '8.000', 'GRAM', true),
    ],
    steps: [
      both('Boil the pasta in salted water until al dente. Save a splash of the cooking water.', 'سلق المعكرونة في ماء مملح حتى تنضج مع بقائها متماسكة، والاحتفاظ بقليل من ماء السلق.'),
      both('Stir the ricotta with the lemon zest and juice, olive oil, salt, and pepper.', 'خلط الريكوتا مع مبشور الليمون وعصيره وزيت الزيتون والملح والفلفل.'),
      both('Toss the drained pasta with the ricotta and a spoon of pasta water. Add basil if you have it.', 'قلب المعكرونة المصفاة مع الريكوتا وملعقة من ماء السلق، وإضافة الريحان إن وُجد.'),
    ],
  },
  {
    slug: 'miso-eggplant',
    original: 'en',
    title: both('Miso eggplant', 'باذنجان بالميسو'),
    description: both(
      'Halved eggplant roasted until soft, then brushed with miso, sesame, and scallions.',
      'باذنجان مقطوع نصفين يُشوى حتى يلين، ثم يُدهن بالميسو والسمسم والبصل الأخضر.',
    ),
    country: { slug: 'japan', name: both('Japan', 'اليابان') },
    cuisine: { slug: 'japanese', name: both('Japanese', 'ياباني') },
    dietary: [vegetarian, vegan],
    difficulty: 'EASY',
    prep: 10,
    cook: 20,
    total: 30,
    servings: 2,
    ingredients: [
      ingredient('eggplant', 'Eggplant', 'باذنجان', '2.000', 'PIECE'),
      ingredient('miso', 'Miso paste', 'معجون ميسو', '30.000', 'GRAM'),
      ingredient('sesame-oil', 'Sesame oil', 'زيت سمسم', '15.000', 'MILLILITER'),
      ingredient('sesame-seeds', 'Sesame seeds', 'سمسم', '8.000', 'GRAM'),
      ingredient('scallion', 'Scallion', 'بصل أخضر', '1.000', 'PIECE'),
    ],
    steps: [
      both('Heat the oven to 200°C. Halve the eggplants and score the cut sides.', 'تسخين الفرن إلى 200 درجة. تقطيع الباذنجان نصفين وتشريط الوجه المقطوع.'),
      both('Brush with half the sesame oil and roast until the flesh is soft, about 18 minutes.', 'الدهن بنصف زيت السمسم والشوي حتى يلين اللب، نحو 18 دقيقة.'),
      both('Stir the miso with the remaining oil, spread it on the eggplant, and finish with sesame seeds and scallion.', 'خلط الميسو مع باقي الزيت، وفرده على الباذنجان، ثم إضافة السمسم والبصل الأخضر.'),
    ],
  },
];
