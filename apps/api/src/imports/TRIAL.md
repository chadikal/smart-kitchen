# TheMealDB trial — October 29, 2026

12 recipes were staged in the local development review inbox. None were published.
The existing 8 public Savora recipes are unchanged.

| Provider area | Results accessible with development key | Staged |
| --- | ---: | ---: |
| Italian | 21 | 3 |
| Japanese | 9 | 3 |
| Mexican | 6 | 3 |
| Moroccan | 6 | 3 |

French and Lebanese filter checks returned no matches with this key. This is a development-access observation, not a claim that those cuisines have no recipes.

## Recipes awaiting review

| ID | Recipe | Area | Ingredient lines |
| --- | --- | --- | ---: |
| 52961 | Budino Di Ricotta | Italian | 8 |
| 52796 | Chicken Alfredo Primavera | Italian | 19 |
| 52839 | Chilli prawn linguine | Italian | 13 |
| 52831 | Chicken Karaage | Japanese | 9 |
| 52773 | Honey Teriyaki Salmon | Japanese | 5 |
| 53033 | Japanese gohan rice | Japanese | 4 |
| 52826 | Braised Beef Chilli | Mexican | 17 |
| 52819 | Cajun spiced fish tacos | Mexican | 12 |
| 52765 | Chicken Enchilada Casserole | Mexican | 4 |
| 52850 | Chicken Couscous | Moroccan | 10 |
| 52843 | Lamb Tagine | Moroccan | 15 |
| 52782 | Lamb tomato and sweet spices | Moroccan | 19 |

All 12 records have provider photo URLs. Every `strCreativeCommons` and `strCreativeCommonsConfirmed` value was null, so photo rights remain unreviewed. Some recipes link to third-party publishers and some have no original source URL. No image license was inferred.

The importer preserves free-text quantities, complete original instructions, source links, category/area claims, and the provider response. Review is required before converting these into published recipe records; no times, servings, difficulty, diets, or translations were invented.

Use `npm run recipes:import:themealdb -- --list` from `apps/api` with `NODE_ENV=development` to inspect stored source/photo links and review status. See [workflow and rights requirements](README.md).

## Development review outcome (October 29, 2026)

52765 is published only to local development with its matching provider photo.
Its complete four-line ingredient list and six paragraphs were reviewed; numeric
facts remain unknown. No country or dietary classification was inferred. Its
`rightsReviewed` value remains false; this is development permission, not a CC or
production license claim. The other 11 records remain pending and unpublished.
52773 is specifically held because its honey glaze instructions have no honey in
the ingredient list. Existing eight seed recipes are unchanged.


## Expansion — October 30, 2026

Seven additional fingerprint-reviewed documents were staged and published to the
local development catalog: 52777 Mediterranean Pasta Salad, 52772 Teriyaki Chicken
Casserole, 52797 Spicy North African Potato Salad, 53373 Air Fryer Egg Rolls, 52764
Garides Saganaki, 53012 Gigantes Plaki, and 53007 Honey Yogurt Cheesecake.

Current totals: 19 import records, 8 development-approved/published imports,
11 pending imports, and 16 public development recipes including the eight original
seeds. Each imported recipe retains its own provider photo, original measures and
instructions. Original publisher links are exposed in the detail source footer.
No numeric facts or dietary tags were inferred. Reviewed cuisine labels use
inspired/broad regional labels where appropriate; no country ownership claims were
added. Existing published recipe IDs/content remain unchanged on a repeated run.

Held candidate examples: sushi omits nori and several fillings; Greek chicken
quinoa salad mentions tomatoes absent from its ingredient list; honey teriyaki
salmon omits honey. Unstaged candidate payloads are temporary local review material,
not public catalog content. Production rights remain unreviewed for all imports.
