# Smart Kitchen API

The REST API lives in this workspace. Setup, environment variables, and run commands are documented in the repository root [README](../../README.md).

The catalog schema and the rules it does not enforce are documented in [prisma/DATA_MODEL.md](prisma/DATA_MODEL.md).

`npm run prisma:seed` writes the sample catalog to `smart_kitchen_migration_test` only for rows already marked with `seed_provenance`. It is not part of `npm start` or `prisma migrate`. Unmarked rows already in that database are left unchanged, and the command aborts instead of adopting them. `npm run prisma:reconcile-seed` reports whether those existing rows match the catalog. Add `--apply` only after reviewing that report; it records provenance and does not change the rows. `npm run test:db` checks the migration, ownership collisions, repeatable updates of seed-owned rows, and the public recipe HTTP API.

`npm run prisma:seed:development` writes that same catalog to the application database. From `apps/api`, set `NODE_ENV` to `development`, then run `npx prisma migrate deploy` and `npm run prisma:seed:development`. The seed command accepts `DATABASE_URL` only when it is `postgresql` on a loopback host, port 5432, database `smart_kitchen`, and `schema=public`, with no other connection options. It rejects production mode, remote hosts, the migration-test database, and extra arguments. It checks `current_database()` before calling the shared seed writer, and it does not print the connection URL.

## Public recipes

`GET /health` returns `{ "status": "ok" }` and does not query PostgreSQL. `GET /recipes` and `GET /recipes/:slug` are the public recipe API. `GET /countries`, `GET /cuisines`, and `GET /dietary-tags` are the public catalog-option API. There is no authentication and no write route. Responses are explicit JSON objects: they include slugs and omit database ids, `ownerId`, and seed provenance.

A recipe is visible only when `publicationStatus` is `PUBLISHED`, `visibility` is `PUBLIC`, and its original-language translation is complete. A private recipe, a draft, a recipe whose original translation is missing or incomplete, and a slug that is not in the catalog all return the same `404` body, `Recipe not found`. A malformed slug or query parameter returns `400`. The list and the detail route use the same access rule.

### Query parameters

`lang` is `en` or `ar`. The default is `en`. `EN`, `fr`, and any other value are `400`.

List filters are combined with AND. A recipe must match every supplied filter:

| Parameter | Rule |
| --- | --- |
| `q` | Trimmed length 1–100. Case-insensitive substring of the selected recipe title only. `%`, `_`, and `\` are literal characters. Descriptions, steps, notes, and the unused language are not searched. |
| `country`, `cuisine`, `dietaryTag` | One exact slug each, matching `^[a-z0-9]+(?:-[a-z0-9]+)*$` and at most 80 characters. These are not name searches. |
| `difficulty` | `EASY`, `MEDIUM`, or `HARD`. |
| `maxTotalMinutes` | Integer 0–10080. Matches `prepTimeMinutes + cookTimeMinutes`. |
| `page` | Integer 1–1000. Default 1. A page past the end is `200` with an empty `items` array. |
| `pageSize` | Integer 1–50. Default 20. |

Unknown parameters and repeated parameters are `400`. Filtering, search, ordering, and pagination run in PostgreSQL. The API does not load the catalog and then filter it in process.

The list response is `{ items, page, pageSize, total, pageCount }`. `total` counts every visible recipe matching the filters, not only the current page. `pageCount` is `0` when `total` is `0`, and otherwise `ceil(total / pageSize)`. Items are ordered by the lowercase selected title, then by `slug`. The slug is unique, so the order does not change between requests. A list item is a summary: it has no ingredient lines and no steps.

### Catalog options

`GET /countries`, `GET /cuisines`, and `GET /dietary-tags` accept only `lang`, with the same `en` / `ar` rules as the recipe list. Each response is `{ items }`. An item is `{ slug, name, language, fallbackUsed }`. Country items also include `code`, the stored two-letter code or `null`.

An option is included only when at least one recipe that the public list would return is linked to it. Drafts, private recipes, and recipes whose original-language translation is incomplete do not contribute options. Names use the same catalog-label fallback as recipe summaries: a nonblank requested-language name when the original-language name is also nonblank, otherwise the original-language name. `language` is the language of the returned name. `fallbackUsed` is true when that language differs from `lang`. A label with no usable original-language name is omitted. Items are ordered by name in the requested language, then by `slug`. These routes are not paginated and do not accept recipe filters.

### Language

The requested language is used only when that recipe translation is complete: a title that is nonblank after trimming, plus a nonblank instruction for every step, attached to that same translation. The description may be blank and is still returned. A recipe with no steps needs only the title.

Otherwise the API returns the complete original-language document as a whole: its title, description, every step instruction, and only the notes on that translation. It does not mix a title from one language with steps from another, and it does not drop a step that the selected language did not translate. An incomplete requested translation is discarded entirely.

`requestedLanguage` is the `lang` query. `contentLanguage` is the language of the document actually returned. `fallbackUsed` is true only when those two differ. If the original-language translation is missing or incomplete, the recipe is omitted from the list and detail returns the same `404` as a missing recipe, even when another language is complete.

Search uses the title of that selected document. An English request searches the English title when the English translation is complete. It searches the Arabic title when the recipe is Arabic-only and the English request falls back. An incomplete English translation is not searched.

Country, cuisine, dietary tag, and ingredient names fall back independently of the recipe document. The requested name is used when it is nonblank and the entity's original-language name is also nonblank. Otherwise the original-language name is used. Each label reports the language of the name that was returned, which can differ from `contentLanguage`. A label with no usable original-language name is omitted. An ingredient line with no usable original-language name fails the request instead of inventing a name or dropping the line.

### Detail and measurements

`GET /recipes/:slug` adds `ingredients` and `steps`, both ordered by `position`. An ingredient line contains `position`, `ingredientSlug`, `name`, `language`, `quantity`, `unit`, `qualitativeAmount`, `optional`, and `note`. A measured `quantity` is a decimal string with exactly three places, such as `"12.500"` or `"200.000"`, never a JSON number. `TO_TASTE` lines return `quantity: null`, `unit: null`, and `qualitativeAmount: "TO_TASTE"`. `optional` preserves `is_optional`. A blank note is returned as `null`. Notes come only from the selected recipe translation.

The unit values are the metric conventions in [prisma/DATA_MODEL.md](prisma/DATA_MODEL.md): `TEASPOON` is 5 milliliters, `TABLESPOON` is 15 milliliters, and `CUP` is the 250 milliliter metric cup. `PIECE` is countable. The response does not repeat that conversion table.
