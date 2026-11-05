/** Explicit editorial review, local development only. No inferred numeric facts or diets. */
export const reviewedRecipes = [
  {
    "externalId": "52765",
    "slug": "themealdb-chicken-enchilada-casserole",
    "hash": "7079871a75390c25f6b2844aa091c49828dd997d7c6d8d7f1382015e7735ef10",
    "cuisine": null
  },
  {
    "externalId": "52777",
    "slug": "themealdb-mediterranean-pasta-salad",
    "hash": "e9e3efd43f8019dd43a3cd3bc5f784a8eef25c2c8a325922d9a2bd659d87a256",
    "cuisine": "mediterranean"
  },
  {
    "externalId": "52772",
    "slug": "themealdb-teriyaki-chicken-casserole",
    "hash": "67e0b7ee2bbd183ff6a63e088ef31ca14138cd0e60ef6e8c277d850acc2652f0",
    "cuisine": "japanese-inspired"
  },
  {
    "externalId": "52797",
    "slug": "themealdb-spicy-north-african-potato-salad",
    "hash": "08cf4b6220b45c65fd5774d027c87b8d05d1b8dd35e9283e0718e2d368581c2d",
    "cuisine": "north-african"
  },
  {
    "externalId": "53373",
    "slug": "themealdb-air-fryer-egg-rolls",
    "hash": "3fa115aa563f823a8d10a942b9cebe96e48e69baf29ca3d9faee90540eedc3c6",
    "cuisine": "chinese-inspired"
  },
  {
    "externalId": "52764",
    "slug": "themealdb-garides-saganaki",
    "hash": "5e6bda3bfeef3a6461ab6c10ad59d44e2f76f7548fc41faf1401dda66f6d7c0c",
    "cuisine": "greek"
  },
  {
    "externalId": "53012",
    "slug": "themealdb-gigantes-plaki",
    "hash": "39fb33a6016f527010f3d53d108304b3517d2a9ff9cea5cfa3823912abd12823",
    "cuisine": "greek"
  },
  {
    "externalId": "53007",
    "slug": "themealdb-honey-yogurt-cheesecake",
    "hash": "672d681ebda3a48dda35b6bb400ba91628941f873bcdd9f1cf1d256877aae1b5",
    "cuisine": "greek-inspired"
  }
] as const;

export const reviewedCuisineNames: Record<string, string> = {
  mediterranean: 'Mediterranean', 'japanese-inspired': 'Japanese-inspired',
  'north-african': 'North African', 'chinese-inspired': 'Chinese-inspired',
  greek: 'Greek', 'greek-inspired': 'Greek-inspired',
};
