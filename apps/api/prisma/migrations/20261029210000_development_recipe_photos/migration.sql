-- Unknown provider facts remain null; defaults for existing authoring clients stay unchanged.
ALTER TABLE recipes ALTER COLUMN prep_time_minutes DROP NOT NULL,
 ALTER COLUMN cook_time_minutes DROP NOT NULL, ALTER COLUMN servings DROP NOT NULL,
 ALTER COLUMN difficulty DROP NOT NULL,
 ADD COLUMN development_only BOOLEAN NOT NULL DEFAULT false,
 ADD COLUMN import_id UUID;
CREATE UNIQUE INDEX recipes_import_id_key ON recipes(import_id);
ALTER TABLE recipes ADD CONSTRAINT recipes_import_id_fkey FOREIGN KEY(import_id) REFERENCES recipe_imports(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE recipe_imports ADD COLUMN development_review_note TEXT, ADD COLUMN development_reviewed_at TIMESTAMP(3);
ALTER TABLE recipe_ingredients ADD COLUMN source_measure TEXT;
ALTER TABLE recipe_ingredients DROP CONSTRAINT recipe_ingredients_amount_chk;
ALTER TABLE recipe_ingredients ADD CONSTRAINT recipe_ingredients_amount_chk CHECK (
 (source_measure IS NULL AND quantity IS NOT NULL AND quantity > 0 AND unit IS NOT NULL AND qualitative_amount IS NULL)
 OR (source_measure IS NULL AND quantity IS NULL AND unit IS NULL AND qualitative_amount IS NOT NULL)
 OR (source_measure IS NOT NULL AND btrim(source_measure) <> '' AND quantity IS NULL AND unit IS NULL AND qualitative_amount IS NULL)
);
