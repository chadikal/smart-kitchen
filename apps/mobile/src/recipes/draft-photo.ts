import type { RecipePhoto } from '../catalog/recipe-photo.ts';

const bundled: Record<string, number> = {
  'savora-draft://demo-draft-lemon-tahini-bowls': require('../../assets/demo/lemon-tahini-bowls.jpg') as number,
  'savora-draft://demo-draft-orange-cardamom-loaf': require('../../assets/demo/orange-cardamom-loaf.jpg') as number,
  'savora-draft://demo-draft-muhammara': require('../../assets/demo/muhammara.jpg') as number,
  'savora-draft://demo-draft-cucumber-yogurt': require('../../assets/demo/cucumber-yogurt.jpg') as number,
};

/** Bundled demo art uses savora-draft URIs. Library and camera photos use a file or data URI. */
export function draftPhoto(uri: string | null | undefined): RecipePhoto | null {
  if (!uri) return null;
  const localSource = bundled[uri];
  if (localSource !== undefined) {
    return { url: uri, attribution: 'Savora', sourceUrl: uri, localSource };
  }
  return { url: uri, attribution: 'Savora', sourceUrl: uri };
}
