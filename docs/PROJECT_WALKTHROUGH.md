Recipe header update (November 5, 2026): the back button stays visible above the
scrolling document. The generic RECIPE label is removed. `RecipeDetailContent`
reports the bottom of its large title; the route compares that measurement with
`Screen` scroll events and shows a one-line title and subtle divider once the
large title has scrolled out of view. The compact title fades and rises 6 points
over 200 ms using the existing Reanimated dependency; the divider fades with it.
Scrolling back reverses the animation. The system Reduce Motion setting skips
the transition, and the hidden compact title is excluded from accessibility.
The compact title follows the returned content language, while the back button
follows the app's LTR/RTL direction. Opening another recipe or switching language
resets the header and scroll position.

Discover update (November 5, 2026): the native Discover navigation title is hidden.
The in-page heading scrolls away, then search and controls dock below the status
bar using ScrollView's sticky header behavior. The heading returns as the user
reaches the top, rather than on every upward gesture. A small arrow appears after
120 points of scrolling and calls `scrollTo({ y: 0, animated: true })` for a smooth
return. The arrow follows the app's RTL layout and has a translated accessible
label. Other screens keep their regular scrolling layout.

Active filter chips remove one filter immediately; the sheet
still drafts changes until Apply. A separate sort sheet chooses alphabetical,
fastest or easiest order. `recipe-query.ts` validates the new `sort` parameter and
`recipe.service.ts` orders the full filtered set before pagination. Unknown facts
sort last, and title/slug break ties. English/Arabic labels, in-session RTL and
Arabic digits use the existing helpers. No database migration or dependency was
needed. Home keeps its curated layout.

Latest metadata update: imported recipes now have reviewed descriptions and Savora
difficulty, evidence-backed or explicitly estimated times, supported servings and
conservative dietary tags. `RecipeMetadataReview` records per-field evidence and
protects later edits. Total time includes additional waiting and remains unknown
when required soaking/cooling cannot be quantified. See the API enrichment guide.

# Savora code walkthrough

Updated October 30, 2026. The latest Home/catalog expansion adds
`GET /recipes/home`, editorial selection in `home-selection.ts`, a strict mobile
feed parser, and seven additional reviewed imports. Current development totals
are 16 recipes, 8 with photos; 11 other imports remain pending. See the API README
for the current feed contract. Earlier milestone counts below describe history.

 UI cleanup later that day added horizontal Discover
cards with 96-point thumbnails and neutral missing-photo placeholders. Unknown
facts are omitted, development banners and the Profile API address are removed,
source credits are consolidated at the detail footer, and long method steps are
split into display paragraphs. Backend publication/review rules are unchanged.

This describes the current `dev` working tree, including
uncommitted work. It is a development setup, not a deployed production service.

## 1. The parts of the project

| Location | Responsibility |
| --- | --- |
| `package.json` | npm workspace commands for both applications |
| `apps/mobile/app/` | Expo Router screens and navigation |
| `apps/mobile/components/` | Reusable visual components |
| `apps/mobile/src/catalog/` | Recipe fetching, response validation, search/filter state and formatting |
| `apps/mobile/src/i18n/` | English/Arabic strings, selected language, RTL and Arabic digits |
| `apps/mobile/src/theme/` | Shared colors and layout tokens |
| `apps/api/src/recipes/` | Public recipe routes, database queries and JSON responses |
| `apps/api/src/imports/` | External-provider client, staging and reviewed development publication |
| `apps/api/src/catalog/` | Original seed data, ownership checks and database-target guards |
| `apps/api/prisma/` | Database schema, migration history and manual data commands |
| `apps/api/test/` | API, import and database tests |

React Native renders the phone interface. Expo supplies the development server and
bundles the mobile code. The same frontend can be exported for web. NestJS runs the
API. Prisma connects the API to PostgreSQL. There is no separate additional API
server to start for each endpoint.

## 2. How one recipe reaches the screen

1. A Home or Discover screen requests `GET /recipes` from Savora's API.
2. `recipes.controller.ts` parses the request parameters and calls `RecipesService`.
3. `recipe.service.ts` queries PostgreSQL through Prisma. It applies publication,
   visibility, language completeness, filters, ordering and pagination.
4. `recipe.mapper.ts` converts database rows into the public JSON contract. It
   omits internal IDs, owner IDs and seed provenance.
5. The frontend validates that response in `live-recipes.ts`, then renders
   `RecipeCard` components.
6. A card opens `/recipe/[slug]`. That screen requests `GET /recipes/:slug`.
7. `recipe-detail.ts` validates the detail response. `RecipeDetailContent` renders
   the facts, ingredients and ordered cooking steps.

The mobile app reads recipes from our database through our API. It does not call
TheMealDB to search for recipes on each screen visit. A photo is loaded directly
from the provider's HTTPS image URL when its component renders.

## 3. What changed in the latest milestone

We added one reviewed external recipe, Chicken Enchilada Casserole, with its
matching photograph. There are now eight original seed recipes plus this one
development-only recipe. Eleven other provider imports remain unpublished.

This was two connected steps: importing external content into a review area, then
publishing one selected document into the ordinary recipe catalog.

### Database files

| File | Change and reason |
| --- | --- |
| `apps/api/prisma/schema.prisma` | Added `RecipeImport`, its provider/review enums, a unique optional recipe-to-import link, `developmentOnly`, review metadata, nullable recipe facts and `sourceMeasure` |
| `apps/api/prisma/migrations/20261029180000_recipe_import_staging/migration.sql` | Creates the separate import-review storage |
| `apps/api/prisma/migrations/20261029210000_development_recipe_photos/migration.sql` | Adds the recipe/import link, development flag, nullable facts, review metadata and third ingredient-amount representation |
| `apps/api/prisma/DATA_MODEL.md` | Explains these new data rules |

Both new migrations were applied to the local `smart_kitchen` and
`smart_kitchen_migration_test` databases. Existing migrations were not rewritten.
Prisma regenerates `apps/api/src/generated/prisma/` from the schema; edit the
schema rather than editing that generated client by hand.

`RecipeImport` retains the provider ID, original payload, instructions, source
measurement strings, image/source URLs, warnings and review status. Keeping these
separate prevents an unreviewed download from becoming a public recipe.

Time, servings and difficulty can be `null`: the source does not reliably provide
them. Existing authoring defaults remain, so the import writer explicitly inserts
null instead of accepting a misleading zero-minute or one-serving default.

An ingredient line has exactly one of these representations, enforced by SQL:

- A positive decimal quantity and a standardized unit.
- `TO_TASTE`, with no numeric quantity or unit.
- Nonblank `sourceMeasure`, with all the structured amount fields null.

The third form preserves text such as `14 oz jar` and `3 Cups`. It makes no claim
that the provider's cup equals Savora's 250 mL metric cup. Existing decimal
quantities still travel through JSON as strings, preserving precision.

### External import and publication files

| File | Responsibility |
| --- | --- |
| `apps/api/src/imports/themealdb.client.ts` | Calls fixed official endpoints, validates responses, preserves provider content and limits network requests |
| `apps/api/src/imports/themealdb.import.ts` | Collects bounded batches and stages them transactionally; protects previously reviewed rows |
| `apps/api/prisma/import-themealdb.ts` | Manual CLI entry point for previewing, staging or listing imports |
| `apps/api/src/imports/themealdb.publish.ts` | Publishes only the selected reviewed document, checked against a SHA-256 fingerprint |
| `apps/api/prisma/publish-themealdb-development.ts` | Guarded manual publication command; defaults to a read-only preview |
| `apps/api/package.json` | Registers the import and development-publication commands |
| `apps/api/.env.example` | Documents the optional server-side provider key |
| `apps/api/src/imports/README.md` | Documents commands, contract and review requirements |
| `apps/api/src/imports/TRIAL.md` | Records the twelve-recipe trial and its review outcome |

The source fingerprint prevents changed provider content from silently inheriting
an old review. Publication uses a transaction and locks. Re-running it keeps the
same recipe ID; it does not overwrite or republish an existing edited recipe.
Conflicting records cause a rollback.

The casserole's import is approved for this local development trial, while
`rightsReviewed` remains false. Development approval is distinct from production
rights clearance. The other eleven imports remain pending. Honey Teriyaki Salmon
was held because the instructions mention honey while its ingredient list omits it.

No preparation time, cooking time, servings, difficulty, dietary claim, country
assignment or Arabic translation was invented for the imported casserole.
Its ingredients have dedicated source identities, so future pantry matching must
review their mapping to canonical ingredients before treating them as equivalent.

### API files

| File | Responsibility/change |
| --- | --- |
| `apps/api/src/recipes/recipe.mapper.ts` | Returns nullable facts, nullable credited `photo` and `source` objects, and ingredient `sourceMeasure` |
| `apps/api/src/recipes/recipe.service.ts` | Excludes development-only recipes and their catalog options unless `NODE_ENV` is exactly `development` |
| `apps/api/src/catalog/reconcile-seed.ts` | Updates its TypeScript input types for nullable facts; original seed reconciliation rules remain |
| `apps/api/README.md` | Links to the updated import/publication contract |

The existing `PUBLISHED` and `PUBLIC` conditions still apply. A complete original
translation is required. The requested translation is used only if complete;
otherwise the whole original-language document is returned with fallback metadata.
There is no automatic translation or mixing of step languages.

Unknown time or difficulty does not qualify for a maximum-time or difficulty
filter. The existing eight seed recipes keep their original measurements and facts.

Photo metadata currently comes from the linked import row. This is the first
provider-photo implementation, not a general image-upload/media-management system
for arbitrary user recipes.

### Mobile files

| File | Responsibility/change |
| --- | --- |
| `apps/mobile/components/RecipePhotoView.tsx` | Shared network photo, source credit and failure fallback |
| `apps/mobile/src/catalog/recipe-photo.ts` | Validates supported provider image and source-link metadata |
| `apps/mobile/components/RecipeCard.tsx` | Displays optional photos in both featured and compact cards; navigates with the recipe slug |
| `apps/mobile/src/catalog/live-recipes.ts` | Accepts photos and unknown facts in list responses; formats available card facts honestly |
| `apps/mobile/app/(tabs)/index.tsx` | Features the first photo-backed recipe from the fetched page, otherwise the first result |
| `apps/mobile/app/(tabs)/discover.tsx` | Passes live photos into cards and handles missing time/difficulty |
| `apps/mobile/src/catalog/recipe-detail.ts` | Validates detail facts, source credit, photo metadata and raw source measurements |
| `apps/mobile/components/RecipeDetailContent.tsx` | Renders the photo/source link, available facts and a concise measurement explanation |
| `apps/mobile/src/i18n/locales/en.json` and `ar.json` | Add translated photo credits, unavailable-fact labels and development/source wording |
| `apps/mobile/tsconfig.json` | Supports explicit `.ts` imports shared with Node-based tests |

Home's featured selection is a simple display rule over the fetched page. It is
not personalized recommendation, popularity ranking or an editorial picks system.
Only the imported casserole currently has a recipe photograph; the eight original
recipes have not received invented or unrelated photos.

### Tests

| File | Coverage |
| --- | --- |
| `apps/api/test/themealdb.spec.ts` | Provider parsing, source preservation, bounded imports and error handling |
| `apps/api/test/catalog-imports.integration.ts` | Staging isolation, stable IDs and reviewed-row protection |
| `apps/api/test/recipes-import-publication.integration.ts` | Source amount constraints, nullable facts and development-only recipe/catalog visibility |
| `apps/api/test/recipes.integration.ts` | Existing public API contract, updated for nullable source measures |
| `apps/mobile/src/catalog/live-recipes.test.ts` | Live cards retain unknown facts without fabricated values |
| `apps/mobile/src/catalog/recipe-detail.test.ts` | Exact measurements, detail states, source/photo validation and unknown facts |

The last completed verification passed 32 API unit tests, 40 database/API tests,
2 health e2e tests and 37 mobile tests. Lint, typechecks, API build, web export
and iOS bundle compilation also passed. Those are previous milestone results,
not a claim that the entire suite was re-run during today's service startup.
Physical iPhone layout still needs the user's check.

## 4. Earlier uncommitted work in the same working tree

`git status` includes more than the latest photo milestone. Earlier work added:

- `app/recipe/[slug].tsx` and the detail helpers/content component: live detail
  navigation, loading/retry/missing states, language changes and stale-response protection.
- Home live cards and country navigation, plus Discover's incoming country/search
  parameter handling in `src/catalog/discover.ts` and its tests.
- `AppText.tsx`, `Heading.tsx`, `Screen.tsx`, `SearchField.tsx`, i18n language helpers
  and tests: RTL alignment and Arabic numeral display.
- `CountryCard.tsx` and the France, Italy, Japan, Lebanon and Mexico SVG assets:
  consistent country food illustrations. `arrow-left.svg` supports detail navigation.
- `app/_layout.tsx`: registering the detail route.
- Mobile test scripts/eslint settings and root documentation/ignore adjustments.

These accumulated changes have not been committed or pushed. Do not assume every
line shown in the current Git diff was written during the latest import/photo task.

## 5. Local services and configuration

| Service | Current address/use |
| --- | --- |
| PostgreSQL 17 | Port 5432; application database `smart_kitchen` |
| API | `http://localhost:3001`; development mode exposes the one trial recipe |
| Expo/Metro | Port 8082; iPhone opens `exp://192.168.1.16:8082` on the same Wi-Fi |
| Exported web preview | `http://127.0.0.1:8091`; serves `apps/mobile/dist` |

The LAN IP may change. The API is a running compiled build; source changes need
an API rebuild/restart, or use the watch command below. Expo reloads mobile source
changes. The exported web preview is a snapshot and needs another export after
frontend changes. It is useful when Expo's development web renderer has problems.

`apps/mobile/.env` supplies `EXPO_PUBLIC_API_URL`, currently the computer's LAN
address on port 3001. `src/config/api.ts` reads that value. A phone's `localhost`
means the phone, so it must use the computer's LAN address.

`apps/api/.env` contains database credentials; keep it private. The provider key
belongs on the backend. Environment files are ignored by Git. `.cursor/status/`
contains ignored local process logs and temporary reports.

The running API also allows the local web-preview and Expo web origins through
`CORS_ORIGIN`. This is a process-level startup setting; today's startup did not
rewrite the private `.env` file. Native phone requests do not use browser CORS.

To start development manually from the repository root, use separate PowerShell
terminals and avoid starting a duplicate process on an occupied port:

```powershell
# Backend with source watching
$env:PORT = '3001'
$env:NODE_ENV = 'development'
$env:CORS_ORIGIN = 'http://localhost:8082,http://127.0.0.1:8082,http://localhost:8091,http://127.0.0.1:8091,http://192.168.1.16:8082'
npm run dev:api
```

```powershell
# Phone frontend
cd apps/mobile
npx expo start --lan --port 8082
```

The public routes are `/health`, `/recipes`, `/recipes/:slug`, `/countries`,
`/cuisines` and `/dietary-tags`. The import/publication commands are manual backend
tools, not public write endpoints and not startup hooks.

## 6. Where to edit next

- Screen composition: edit the matching file under `apps/mobile/app/`.
- Shared card/photo appearance: edit `RecipeCard` or `RecipePhotoView`.
- Shared colors/type: use the existing theme/font helpers rather than duplicating values.
- UI wording: edit both locale JSON files.
- Filtering or public visibility: edit `recipe.service.ts` and add API tests.
- Public response shape: edit the API mapper and the corresponding mobile validators/types together.
- Persistent data structure: edit Prisma, create a new migration, then verify it on the test database.
- Another provider: add a backend adapter and review workflow; keep screens using Savora's own API.

Favorites, accounts, recipe creation, pantry matching, personalized recommendations
and general image uploads are still future work. My Kitchen and My Recipes remain
placeholder areas. No new functionality in those areas was introduced by this milestone.
