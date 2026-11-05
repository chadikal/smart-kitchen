# Reviewed recipe details — October 30, 2026

`recipe-enrichment.ts` is the versioned review manifest. Each value records its
basis (`SOURCE`, `ESTIMATE`, `EDITORIAL`, or `UNKNOWN`), evidence URL and review
note. Estimates are planning aids, not kitchen-tested measurements. Descriptions
are Savora summaries; difficulty follows the rubric below. No Arabic recipe text
was fabricated and no ingredients, source measures, titles or steps were changed.

## Difficulty rubric

- EASY: basic chopping, boiling, mixing, layering or unattended baking.
- MEDIUM: wrapper shaping, sauce thickening, handling shell-on seafood, or multiple
  separately prepared components that require coordination.
- HARD: specialist techniques or precision not present in this reviewed batch.

Elapsed time alone does not increase difficulty. The public UI identifies these
as Savora difficulty ratings rather than attributing them to the provider.

## Timing review

| Recipe | Prep | Cook | Additional waiting | Servings |
| --- | ---: | ---: | --- | --- |
| Chicken Enchilada Casserole | 15, source | 45, source | Unknown resting duration | 4, source |
| Mediterranean Pasta Salad | 15, estimate | 10, imported instructions | At least 30 resting | Unknown |
| Teriyaki Chicken Casserole | 15, estimate | 55, estimate | 5 standing | 4, related original source |
| Spicy North African Potato Salad | 15, estimate | 30, estimate | No separate stage planned | Unknown |
| Air Fryer Egg Rolls | 20, source | 25, source | Source total has no additional wait | 12, one roll each |
| Garides Saganaki | 15, estimate | 45, estimate | Cooling overlaps sauce preparation | Unknown |
| Gigantes Plaki | 20, source | 120, source | Overnight soaking, unquantified | 4, source |
| Honey Yogurt Cheesecake | 30, source | 85, source | Cooling, unquantified | 8, source |

Primary sources checked:

- https://www.jocooks.com/recipes/easy-chicken-enchilada-casserole/
- https://life-in-the-lofthouse.com/teriyaki-chicken-casserole/
- https://www.simplyrecipes.com/recipes/air_fryer_chinese_egg_rolls/
- https://www.bbcgoodfood.com/recipes/gigantes-plaki
- https://www.bbcgoodfood.com/recipes/honey-yogurt-cheesecake

The current Jo Cooks card has an inconsistent prep/cook/total sum; do not invent a
rest duration to make the arithmetic match. The original teriyaki publisher has
changed sauce quantities and baking instructions since the provider copy. Its
current cooking duration was not copied to our older variant. The pasta publisher
could not be retrieved. Other versions of saganaki and copied provider mirrors
were not used to invent serving counts.

The bean provider copy differs from the current source in sugar/oregano measures;
these measures were preserved. Its matching method supports the source durations
and yield. Overnight soaking is additional and cannot be included as a precise
number. Cheesecake cooling is also required and unquantified.

## Dietary review

Only explicit positive classifications are attached. Gigantes Plaki has vegan,
vegetarian and dairy-free labels after checking the complete ingredient list.
Teriyaki Chicken Casserole has dairy-free based on its listed plain ingredients.
No gluten-free claim is made for soy/enchilada sauces or serving bread. Feta
rennet, biscuit composition, wrapper and dipping-sauce ingredients remain
unspecified; tags that depend on those details are withheld. Dietary labels
classify the recipe; they are not an allergen or cross-contamination certification.

## Persistence and repeat runs

The `recipe_metadata_reviews` row stores the evidence JSON, revision, timestamp,
reviewer description and applied-content fingerprint. The writer locks recipes,
checks their import fingerprints and exact original document, and refuses an
owner, visibility or content conflict. Its transaction rolls back on any conflict.
A repeat run is read-only when the reviewed state is unchanged; a later edit is
preserved and requires another explicit review.

From `apps/api`, with `NODE_ENV=development`:

```powershell
npm run recipes:enrich:development
npm run recipes:enrich:development -- --apply
```

The command uses the guarded local `smart_kitchen` target and never runs at startup
or during imports. The original import/publish commands preserve existing recipe
content. Source-level Creative Commons/production rights status is unchanged.

## Public contract

`additionalTimeMinutes` is nullable, defaults to zero for existing authoring
clients and has a nonnegative SQL check. Total = prep + cook + additional time,
but is null if any component is unknown. Maximum-time filters use that same sum.
`factSources` exposes only the basis per field, not internal audit evidence or IDs.
`timingNote` carries the original-language waiting note. Estimates receive the
approximately symbol in cards and detail facts. Source waiting notes appear next
to the facts. Quick & cozy excludes unknown waiting time and reviewed estimates.
