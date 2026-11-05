# TheMealDB development import

The backend can fetch a bounded trial of international recipes from the official
TheMealDB V1 API. It uses the public development key `1` unless the backend-only
`THEMEALDB_API_KEY` environment variable is set. Never put a provider key in an
`EXPO_PUBLIC_*` variable.

## Run

From `apps/api`, with the local development `DATABASE_URL` configured:

```powershell
$env:NODE_ENV = 'development'
# Fetch and inspect metadata without database writes:
npm run recipes:import:themealdb
# Preview a specific area (provider area names, not Savora country slugs):
npm run recipes:import:themealdb -- --area Italian --limit 3
# Store the bounded batch in the review table:
npm run recipes:import:themealdb -- --apply
# Read staged metadata without contacting TheMealDB:
npm run recipes:import:themealdb -- --list
```

Apply pending migrations to the intended development database before `--apply`.
The command uses the existing development guard: `NODE_ENV=development`, PostgreSQL
on a loopback host at port 5432, database `smart_kitchen`, `schema=public`, and no
extra URL options. It checks `current_database()` before database access. It cannot
be retargeted through CLI flags. The migration-test database is used only by tests.

Defaults: up to three recipes each from Italian, Japanese, Mexican, and Moroccan
area results. Up to five `--area` arguments and a `--limit` of 1–5 are permitted
(25 details maximum). Requests are sequential with a short delay, a 12-second
timeout, a two-megabyte response limit, and redirects disabled. There is no bulk
scraping, scheduled sync, or startup import. A failed detail request stops the
batch before database writes. Empty areas are reported without invented content.

## What is stored

`recipe_imports` is a review inbox, separate from `recipes`. Imports have no route
through `/recipes`, `/recipes/:slug`, or the public filter-option endpoints.
The current public catalog remains unchanged by importing.

Every import retains provider + source ID, English source title and instructions,
original ingredient names and measure strings, original provider payload, source
area/country/category, image URL, original recipe/image source links, license flags,
fetch time, review warnings, and an initial `PENDING_REVIEW` status. An absent
Creative Commons flag means unknown, not licensed. Photo URLs are accepted for
display metadata only from TheMealDB's HTTPS meal-image path. No images are
downloaded or attached to a different recipe.

Fractions, imperial units, ambiguous measures, and provider instructions are
preserved verbatim. No cup-to-gram conversion, instruction rewriting, inferred
times/servings/difficulty, dietary assurances, or Arabic translation is generated.
Provider origin labels are claims to review, not automatically authoritative
country mappings. An orphan measurement is retained and flagged.

Repeated imports update only pending, rights-unreviewed records with stable IDs.
The database unique key prevents duplicates. Batch writes use an advisory lock
and row locks, and a reviewed/rejected record aborts the whole transaction instead
of being overwritten. There is intentionally no publish/approve command yet.

## Before publication

Review full instructions, measurements, catalog ingredient mapping, country/cuisine
classification, times, servings, difficulty, and any dietary tags. Review each
photo's rights/source and retain attribution. Then add a reviewed publication path
and image fields to the public recipe contract; never bypass the existing
`PUBLISHED` + `PUBLIC` visibility rule. Curated Home picks should reference these
approved public recipes, not raw provider imports.

Official references checked October 29, 2026:

- [API documentation](https://www.themealdb.com/api.php)
- [V1 OpenAPI specification](https://www.themealdb.com/api/spec/openapi-v1.yaml)
- [Terms of use](https://www.themealdb.com/terms_of_use.php)

The public key is for development/education. TheMealDB requires a paid subscription
before app-store publication. Its terms allow copying/modification through official
API endpoints, require source credit for its artwork, and separately require
permission or a legal basis for third-party content. These are not a blanket
license for every returned photograph. Missing rights metadata remains unresolved.

Free-key filter results may be limited; a long area list does not prove recipe
availability for every country. The first checks returned no matches for French
or Lebanese filters. Do not claim complete international coverage.

## Limited development publication

With `NODE_ENV=development`, run `npm run recipes:publish:development` for a locked
read-only preview, then add `-- --apply` to publish the single reviewed document
(52765, Chicken Enchilada Casserole). The source payload is SHA-256 pinned; changed
source or staged content requires a new review. This command uses the same guarded
local `smart_kitchen` target as the development seed. It creates once and never
updates or republishes an existing recipe. Conflicts roll back the transaction.

Approval is limited to local development under the provider's Free API Usage terms.
`rightsReviewed` remains false; the import stores a dated development review note.
The recipe has `developmentOnly=true`, no invented times/servings/difficulty,
no dietary or country claims, and no automatic translation. English instructions
are preserved as six source paragraphs. Ingredient identities are dedicated source
rows; raw `sourceMeasure` strings are not standardized metric measurements.
Ingredient matching must not treat these dedicated identities as reviewed canonical
matches until an explicit mapping review is done.

The public contract now adds nullable `photo` (URL, attribution, provider page) and
`source` (name, provider page, developmentOnly). Facts may be null. Ingredient
lines carry nullable `sourceMeasure`; exactly one amount representation is allowed.
Unknown total time is excluded by a maximum-time filter, and unknown difficulty
is excluded by a difficulty filter. Original decimal measurements are unchanged.

All recipe and catalog-option reads exclude development-only content unless
`NODE_ENV` is exactly `development`. Do not export a production website against a
development API. App-store publication still needs provider subscription and a
separate review of third-party/photo rights. The trial does not claim CC licensing.

Mobile cards and detail display the matching photo, credit TheMealDB, preserve
source measurements, and show unavailable facts honestly. Home features the first
photo-backed recipe from its fetched page, without claiming personal recommendation
or popularity. Image failures have a labeled fallback. The detail source credit
links to the provider recipe page.


### Expanded reviewed manifest

The October 30 manifest in `reviewed-recipes.ts` supersedes the original single
recipe trial above. It contains eight reviewed IDs/fingerprints and their explicit
slugs/cuisine choices. `npm run recipes:stage:reviewed` previews pending/missing
entries from that manifest; append `-- --apply` to stage. Publication processes
the manifest in one transaction, preserving existing recipes and rolling back all
new writes on a conflict. Source documents must still match their reviewed hashes.
All imports remain development-only with `rightsReviewed=false`.
