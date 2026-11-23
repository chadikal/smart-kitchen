import type { RecipePhoto } from './recipe-photo';

const bundled: Record<string, number> = {
  'olive-oil-yogurt-cake': require('../../assets/demo/olive-oil-yogurt-cake.jpg') as number,
  'red-lentil-lemon-soup': require('../../assets/demo/red-lentil-lemon-soup.jpg') as number,
  'semolina-milk-pudding': require('../../assets/demo/semolina-milk-pudding.jpg') as number,
  'lemon-herb-roast-chicken': require('../../assets/demo/lemon-herb-roast-chicken.jpg') as number,
  'tofu-miso-soup': require('../../assets/demo/tofu-miso-soup.jpg') as number,
  'black-bean-skillet': require('../../assets/demo/black-bean-skillet.jpg') as number,
  'spinach-fatayer': require('../../assets/demo/spinach-fatayer.jpg') as number,
  'mushroom-risotto': require('../../assets/demo/mushroom-risotto.jpg') as number,
  'chickpea-tomato-stew': require('../../assets/demo/chickpea-tomato-stew.jpg') as number,
  'apple-oat-crumble': require('../../assets/demo/apple-oat-crumble.jpg') as number,
  'greek-village-salad': require('../../assets/demo/greek-village-salad.jpg') as number,
  'spanish-tortilla': require('../../assets/demo/spanish-tortilla.jpg') as number,
  'chana-masala': require('../../assets/demo/chana-masala.jpg') as number,
  'vegetable-tagine': require('../../assets/demo/vegetable-tagine.jpg') as number,
  'tofu-pad-thai': require('../../assets/demo/tofu-pad-thai.jpg') as number,
  'menemen': require('../../assets/demo/menemen.jpg') as number,
  'lemon-ricotta-pasta': require('../../assets/demo/lemon-ricotta-pasta.jpg') as number,
  'miso-eggplant': require('../../assets/demo/miso-eggplant.jpg') as number,
};

/** Local portfolio photos. These are not API or TheMealDB images. */
export function demoPhotoFor(slug: string): RecipePhoto | null {
  const localSource = bundled[slug];
  if (localSource === undefined) return null;
  return {
    url: `savora-demo://${slug}`,
    attribution: 'Savora',
    sourceUrl: `savora-demo://${slug}`,
    localSource,
  };
}

export function photoForRecipe(slug: string, photo?: RecipePhoto | null): RecipePhoto | null {
  return photo ?? demoPhotoFor(slug);
}
