# Recipe catalog data model

This is the Milestone 2 database model. It does not authenticate callers or add write endpoints. The public read contract for `GET /recipes` and `GET /recipes/:slug` is in the API README. The development seed is a separate command and is not part of migration or startup.

## Ownership and access

`users` exists only so a recipe can reference its owner. It stores no credentials.

`recipes.owner_id` is nullable. A null owner means no user owns the recipe. It does not prove that the development seed created the row. Deleting a user is restricted while that user still owns recipes, so those recipes are not silently cleared or deleted.

Publication and visibility are separate:

| Field | Values | Default |
| --- | --- | --- |
| `publication_status` | `DRAFT`, `PUBLISHED` | `DRAFT` |
| `visibility` | `PRIVATE`, `PUBLIC` | `PRIVATE` |

All four combinations can be stored. The public recipe API returns a recipe only when it is both `PUBLISHED` and `PUBLIC` and its original-language translation is complete. That rule is not a database check, because a published private recipe and an unpublished public recipe are both valid stored states.

The index on `(publication_status, visibility)` supports that filter.

## Catalog relationships

Countries and cuisines are different entities. A recipe connects to zero or more of each through `recipe_countries` and `recipe_cuisines`. Dietary tags use `recipe_dietary_tags`.

Ingredients are shared catalog rows. A recipe lists them in `recipe_ingredients`, ordered by `position`. The same ingredient may appear more than once in one recipe. Cooking steps live in `recipe_steps`, also ordered by `position`.

Stable public identifiers are the UUID `id` and the unique `slug`. Slugs are not translated. Country `code` is an optional two-character code.

Deleting a recipe cascades to its translations, steps, ingredient lines, notes, and catalog links. Deleting a country, cuisine, dietary tag, or ingredient is restricted while a recipe still references it.

## Measurements

A recipe ingredient line is either measured or qualitative, never both and never neither:

- Measured: `quantity` is a `DECIMAL(12, 3)` greater than zero, and `unit` is set.
- Qualitative: `qualitative_amount` is `TO_TASTE`, and both `quantity` and `unit` are null. `TO_TASTE` is not a number and is not a member of `measured_unit`.

`is_optional` marks an ingredient that can be skipped. Preparation notes are translated separately and may be omitted.

The catalog volume units are metric cooking measures:

| Unit | Meaning |
| --- | --- |
| `MILLIGRAM` | 0.001 gram |
| `GRAM` | 1 gram |
| `KILOGRAM` | 1000 grams |
| `MILLILITER` | 1 milliliter |
| `LITER` | 1000 milliliters |
| `TEASPOON` | 5 milliliters |
| `TABLESPOON` | 15 milliliters |
| `CUP` | 250 milliliters |
| `PIECE` | one countable item, not a mass or volume |

`CUP` is the 250 milliliter metric cup. It is not a US legal cup of 240 milliliters and not a US customary cup of 236.588 milliliters. Spoon and cup values are exact volumes, not conversions that depend on ingredient density.

Store baking ingredients in `GRAM` when a mass is known. Flour, sugar, fats, and leaveners change weight per cup when they are packed or scooped, so a gram quantity is the unambiguous record. Volume units remain appropriate for liquids and for recipes that are specified by volume.

The public recipe API returns `quantity` as a decimal string with exactly three decimal places, such as `"12.500"`, and does not return it as a JSON number. The string keeps the stored scale. Clients must not parse it through binary floating point before displaying or saving it.

Ingredient matching compares ingredient identity only. The schema does not store a pantry or compare whether the available quantity is enough.

## Translations

Supported languages are `EN` and `AR`. Every catalog row and every recipe stores `original_language`. An Arabic-only recipe is a recipe whose original language is `AR` and whose only `recipe_translations` row is Arabic. English is not required, and the database does not generate a translation.

`recipe_translations` holds the title and description for one language. Step instructions and ingredient notes point at that row and at a step or ingredient line from the same recipe. One entity can have only one translation per language.

Composite foreign keys on `(step_id, recipe_id)` and `(recipe_translation_id, recipe_id)`, and the matching pair for ingredient notes, enforce recipe identity. An instruction or note cannot point at a step, ingredient line, or recipe translation from another recipe. They do not encode language. The parent `recipe_translations.language` determines the language of the title, description, instructions, and notes attached to that row. The database does not inspect the script or wording of `instruction` or `note`, so Arabic text can be stored on an English translation if a writer attaches it there.

### Recipe translation completeness

A recipe translation is complete only when all of these are true:

- its title is nonblank after trimming
- every `recipe_steps` row for that recipe has an instruction, also nonblank after trimming, attached to that same `recipe_translations` row

The description may be blank. A blank description does not make the translation incomplete, and it is still returned with the selected translation.

A recipe may have no steps. Completeness then requires only the nonblank title.

Preparation notes are optional. A missing `recipe_ingredient_translations` row does not make a translation incomplete. When a note row is present, its text should be nonblank; a future writer should omit the row instead of storing a blank note. Notes belong to the selected recipe translation. They are not borrowed from another language.

`title` and `instruction` are `NOT NULL`, which still allows an empty or whitespace-only string. The database does not enforce completeness. There is no trigger for it.

### Read fallback

The public read API chooses one complete recipe document. It does not assemble a document from more than one language. Search compares the title of that same selected document.

1. Use the requested language when that `recipe_translations` row exists and is complete.
2. Otherwise use the complete original-language recipe: its title, description, every step instruction, and only the preparation notes attached to that original translation.
3. Do not fill a missing step from another language, drop a step that has no instruction in the selected language, or keep a title from one language with steps from the other. An incomplete requested translation is discarded as a whole, including any steps or notes it already has.
4. Return `requestedLanguage`, `contentLanguage`, and `fallbackUsed`. `contentLanguage` is the language of the document returned. `fallbackUsed` is true when `contentLanguage` differs from `requestedLanguage`.

If the original-language recipe translation is missing or incomplete, the data is invalid. Do not substitute the other language or return a partial recipe.

Catalog labels are separate from the recipe document. A country, cuisine, dietary tag, or ingredient label is usable when its name is nonblank. Use the requested language when that name is nonblank; otherwise use that entity's original language. Do not invent a name. A missing original-language name is invalid. Label fallback can differ from `contentLanguage` because these names are not part of `recipe_translations`.

### Write and publish validation

Future write and publish services must apply the completeness rules in the same transaction as the recipe, its steps, and its translations. They are not implemented, and the database has no trigger for them.

That transaction must:

- keep the original-language title and one nonblank instruction for every step with the recipe
- reject a save that leaves the original-language translation missing or incomplete
- reject an additional language that is present but incomplete, instead of storing a partial translation
- publish only a recipe whose original-language translation is complete

Publishing still also requires the separate access rule: the public recipe API needs both `PUBLISHED` and `PUBLIC`. Completeness does not change publication status or visibility.

## Checks outside Prisma

Prisma creates the foreign keys, unique indexes, and defaults. The migration also adds checks Prisma cannot represent:

- recipe times are zero or greater, and servings are at least 1
- step and ingredient positions start at 1
- each ingredient line is either a positive decimal measurement or a qualitative amount

A later `prisma migrate dev` compares the database with the schema and may try to drop those checks. Keep them.

Identifiers are generated by Prisma Client. PostgreSQL does not assign them. `updated_at` is also written by Prisma Client; the column is `NOT NULL` and has no database default.

PostgreSQL truncates three identifiers to 63 characters. Leave these generated names as they are:

- `recipe_ingredient_translations_recipe_ingredient_id_recipe__key`
- `recipe_ingredient_translations_recipe_ingredient_id_recipe_fkey`
- `recipe_ingredient_translations_recipe_translation_id_recip_fkey`

The initial migration matches the Prisma schema, plus the checks above. `20261024153000_seed_provenance` adds `seed_provenance` only. Both have been applied to the disposable `smart_kitchen_migration_test` database. Neither has been applied to the application database. Completeness, blank-title rejection, and decimal-string serialization are service rules. They are not additional database constraints.

## Development seed

`npm run prisma:seed` loads eight original sample recipes into `smart_kitchen_migration_test`. It does not run during API startup or `prisma migrate`. The command reads `MIGRATION_TEST_DATABASE_URL` and uses that URL only when it is `postgresql` on `127.0.0.1`, `localhost`, or `::1`, port `5432`, database `smart_kitchen_migration_test`, and `schema=public`, with no other connection options. It also refuses to run when `DATABASE_URL` names that same database.

Sample recipes are stored with a null owner as `PUBLISHED` and `PUBLIC`. Seven have English and Arabic text. `semolina-milk-pudding` is Arabic only, so an English request should fall back to the original Arabic document. Baking masses are gram strings such as `200.000`. Liquids use the metric volumes in this document. Salt is `TO_TASTE` where a recipe is seasoned to taste. Parsley, basil, and coriander are optional.

A dietary tag is stored only when every ingredient on the recipe, including optional ingredients, allows it. Roast chicken is gluten-free and dairy-free. The yogurt cake and semolina pudding are vegetarian. Miso soup is vegetarian, vegan, and dairy-free, and it is not marked gluten-free.

Seed ownership is a `seed_provenance` row whose `seed_key` is `smart-kitchen-dev-seed`. The row records the entity type and id for a recipe, country, cuisine, dietary tag, or ingredient. A null owner, a matching slug, or a matching original language is not ownership. The seed updates a row only after it locks that row and finds its own provenance. A user-owned recipe is left unchanged even if provenance exists. An unmarked row, including an ownerless `PRIVATE` / `DRAFT` recipe or a catalog row in the same original language, aborts the transaction. Each seed run takes a transaction advisory lock before those checks, so a second seed waits and then sees the committed provenance instead of skipping it. One collision rolls back every insert from that run. Removing a slug from the seed file does not delete that row. Provenance is not a foreign key, so deleting a recipe does not delete its provenance row.

The eight sample recipes already in `smart_kitchen_migration_test` were written before provenance existed. They are unmarked. The seed does not attach provenance to them, does not update them, and does not delete them. The next `npm run prisma:seed` of that catalog aborts and rolls back.

`npm run prisma:reconcile-seed` is the one-time check for those rows. It uses the same guarded test URL and compares only the current eight-recipe catalog and its countries, cuisines, dietary tags, and ingredients. Decimal quantities are compared with `toFixed(3)`, and unordered links are sorted. Generated ids and timestamps are ignored. The default run is read-only and prints each entity type, slug, id, and any mismatched fields. `npm run prisma:reconcile-seed -- --apply` repeats that comparison in one transaction under the seed advisory lock, locks the compared rows and their children, and inserts missing provenance only when every compared row matches exactly. It preserves ids, content, and timestamps. A user-owned recipe, conflicting provenance, a missing row, an extra child, or any content mismatch aborts the whole transaction. Running it again after a successful apply inserts nothing further. It does not call the seed writer, delete rows, or reset the database. `--apply` stays a reviewed step and is not part of startup or migration.
