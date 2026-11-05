export type Basis = 'SOURCE' | 'ESTIMATE' | 'EDITORIAL' | 'UNKNOWN';
export type Evidence<T> = { value: T; basis: Basis; sourceUrl: string | null; note: string };
export type Enrichment = {
  externalId: string; description: string;
  prepTimeMinutes: Evidence<number | null>; cookTimeMinutes: Evidence<number | null>;
  additionalTimeMinutes: Evidence<number | null>; servings: Evidence<number | null>;
  difficulty: Evidence<'EASY' | 'MEDIUM' | 'HARD'>;
  dietaryTags: Evidence<string[]>; timingNote: string | null;
};
const provider = (id: string) => `https://www.themealdb.com/meal/${id}`;
const fact = <T>(value: T, basis: Basis, sourceUrl: string | null, note: string): Evidence<T> => ({ value, basis, sourceUrl, note });
const unknown = (note: string) => fact(null, 'UNKNOWN', null, note);
const estimate = (value: number, id: string, note: string) => fact(value, 'ESTIMATE', provider(id), note);
const rating = (value: 'EASY' | 'MEDIUM', note: string) => fact(value, 'EDITORIAL', null, note);
const tags = (values: string[], note: string) => fact(values, 'EDITORIAL', null, note);
const enchilada = 'https://www.jocooks.com/recipes/easy-chicken-enchilada-casserole/';
const teriyaki = 'https://life-in-the-lofthouse.com/teriyaki-chicken-casserole/';
const eggRolls = 'https://www.simplyrecipes.com/recipes/air_fryer_chinese_egg_rolls/';
const beans = 'https://www.bbcgoodfood.com/recipes/gigantes-plaki';
const cheesecake = 'https://www.bbcgoodfood.com/recipes/honey-yogurt-cheesecake';
export const enrichmentRevision = 'savora-metadata-2026-10-30-v1';
export const enrichmentManifest: readonly Enrichment[] = [
  {
    externalId: '52765', description: 'Corn tortillas layered with shredded chicken, enchilada sauce and melted Monterey Jack cheese.',
    prepTimeMinutes: fact(15, 'SOURCE', enchilada, 'Publisher recipe card states 15 minutes prep.'),
    cookTimeMinutes: fact(45, 'SOURCE', enchilada, 'Publisher states 45 minutes cooking.'),
    additionalTimeMinutes: unknown('Publisher total and prep/cook sum differ; resting duration is not consistently specified.'),
    servings: fact(4, 'SOURCE', enchilada, 'Publisher yield is four for the matching four-ingredient batch.'),
    difficulty: rating('EASY', 'Basic simmering, shredding and layering; no specialist technique.'),
    dietaryTags: tags([], 'No gluten-free claim: enchilada sauce and tortilla composition are unspecified. Contains chicken and dairy.'),
    timingNote: 'Allow extra resting time before serving.',
  },
  {
    externalId: '52777', description: 'A cool pasta salad with tuna, mozzarella, tomatoes, olives and fresh basil.',
    prepTimeMinutes: estimate(15, '52777', 'Editorial allowance for chopping and assembly; not kitchen-tested.'),
    cookTimeMinutes: fact(10, 'SOURCE', provider('52777'), 'Imported instructions give about ten minutes for pasta; follow its packet.'),
    additionalTimeMinutes: fact(30, 'SOURCE', provider('52777'), 'Instructions require at least half an hour of resting.'),
    servings: unknown('Original publisher could not be retrieved; no verified yield in the imported document.'),
    difficulty: rating('EASY', 'Boiling pasta, chopping and tossing.'),
    dietaryTags: tags([], 'Contains tuna, mozzarella and wheat pasta.'),
    timingNote: 'Includes at least 30 minutes of resting. Follow the pasta packet for cooking time.',
  },
  {
    externalId: '52772', description: 'Shredded chicken, cooked brown rice and stir-fry vegetables baked with a soy and ginger glaze.',
    prepTimeMinutes: estimate(15, '52772', 'Editorial preparation allowance using already cooked rice.'),
    cookTimeMinutes: estimate(55, '52772', 'Imported version bakes for 35 then 15 minutes, with an allowance for the sauce. Publisher has since revised the method.'),
    additionalTimeMinutes: fact(5, 'SOURCE', provider('52772'), 'Imported instructions specify five minutes standing before serving.'),
    servings: fact(4, 'SOURCE', teriyaki, 'Related original batch specifies four servings; current source has revised sauce quantities and bake timings.'),
    difficulty: rating('MEDIUM', 'Sauce thickening plus separate chicken, vegetable and rice preparation.'),
    dietaryTags: tags(['dairy-free'], 'The listed chicken, plain vegetables, rice and soy-based sauce contain no dairy; no gluten-free claim for soy sauce.'),
    timingNote: 'Uses cooked rice; allow extra time if starting with dry rice.',
  },
  {
    externalId: '52797', description: 'Potatoes tossed with harissa and lemon, served over rocket with feta, mint and pine nuts.',
    prepTimeMinutes: estimate(15, '52797', 'Editorial allowance for washing, chopping, dressing and assembly.'),
    cookTimeMinutes: estimate(30, '52797', 'Twenty-minute boil in source plus estimated time to bring cold water to a boil.'),
    additionalTimeMinutes: estimate(0, '52797', 'No separate waiting stage in the imported method.'),
    servings: unknown('No verified serving count in the imported recipe or a confirmed original publisher.'),
    difficulty: rating('EASY', 'One boiled component and a mixed dressing.'),
    dietaryTags: tags([], 'Feta rennet and harissa blend are unspecified; do not infer vegetarian or gluten-free certification.'),
    timingNote: null,
  },
  {
    externalId: '53373', description: 'Crisp air-fried egg rolls filled with pork, cabbage, carrot, ginger and spring onions.',
    prepTimeMinutes: fact(20, 'SOURCE', eggRolls, 'Publisher preparation duration.'),
    cookTimeMinutes: fact(25, 'SOURCE', eggRolls, 'Publisher whole-recipe cooking duration, not just one air-fryer batch.'),
    additionalTimeMinutes: fact(0, 'SOURCE', eggRolls, 'Publisher total equals prep plus cook.'),
    servings: fact(12, 'SOURCE', eggRolls, 'Publisher lists twelve servings and twelve egg rolls; one roll per serving.'),
    difficulty: rating('MEDIUM', 'Filling preparation, wrapper folding and batch air frying.'),
    dietaryTags: tags([], 'Contains pork; wrapper and dipping-sauce compositions are not fully specified.'),
    timingNote: 'Makes 12 egg rolls, one per serving. Larger air-fryer batches may take longer.',
  },
  {
    externalId: '52764', description: 'Prawns simmered in a tomato and white-wine sauce, finished with feta cheese.',
    prepTimeMinutes: estimate(15, '52764', 'Editorial allowance for chopping and handling prawns.'),
    cookTimeMinutes: estimate(45, '52764', 'Five-minute prawn boil, roughly thirty-minute sauce simmer and final five-minute simmer, plus onion cooking.'),
    additionalTimeMinutes: estimate(0, '52764', 'Prawn cooling overlaps the sauce simmer.'),
    servings: unknown('No yield in the imported document; other saganaki versions differ materially.'),
    difficulty: rating('MEDIUM', 'Shelling cooked prawns and coordinating them with a reduced sauce.'),
    dietaryTags: tags([], 'Contains shellfish and feta; bread is suggested for serving, so no gluten-free claim.'),
    timingNote: null,
  },
  {
    externalId: '53012', description: 'Butter beans baked in a tomato sauce with onion, oregano, cinnamon and parsley.',
    prepTimeMinutes: fact(20, 'SOURCE', beans, 'Publisher preparation duration.'),
    cookTimeMinutes: fact(120, 'SOURCE', beans, 'Publisher cooking duration; sugar and oregano measures in provider copy differ from current source.'),
    additionalTimeMinutes: unknown('Overnight soaking is required but no exact duration is specified.'),
    servings: fact(4, 'SOURCE', beans, 'Publisher yield for the matching bean batch.'),
    difficulty: rating('EASY', 'Soaking, simmering and oven baking use basic techniques; elapsed time does not increase difficulty.'),
    dietaryTags: tags(['vegan', 'vegetarian', 'dairy-free'], 'Reviewed all ten listed ingredients, including tomato puree and herbs. No animal ingredients; publisher also labels vegan and vegetarian.'),
    timingNote: 'Soak the dried beans overnight before cooking.',
  },
  {
    externalId: '53007', description: 'A honey-sweetened yogurt and mascarpone cheesecake with citrus zest and an almond biscuit base.',
    prepTimeMinutes: fact(30, 'SOURCE', cheesecake, 'Publisher preparation duration.'),
    cookTimeMinutes: fact(85, 'SOURCE', cheesecake, 'Ten-minute base bake followed by sixty and fifteen minutes for the filling.'),
    additionalTimeMinutes: unknown('Cooling is required but its duration is not specified.'),
    servings: fact(8, 'SOURCE', cheesecake, 'Publisher yield for matching dairy, egg and honey quantities.'),
    difficulty: rating('EASY', 'Press-in base and mixed filling; no pastry or water bath.'),
    dietaryTags: tags([], 'Contains dairy, eggs, almonds and biscuits; vegetarian suitability of packaged biscuits is not specified.'),
    timingNote: 'Allow extra cooling time after baking.',
  },
];
