ALTER TABLE recipes ADD COLUMN additional_time_minutes INTEGER DEFAULT 0;
ALTER TABLE recipes ADD CONSTRAINT recipes_additional_time_chk CHECK (additional_time_minutes >= 0);
CREATE TABLE recipe_metadata_reviews (
 recipe_id UUID NOT NULL,
 revision TEXT NOT NULL,
 content_hash TEXT NOT NULL,
 fields JSONB NOT NULL,
 timing_note TEXT,
 reviewed_by TEXT NOT NULL,
 reviewed_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT recipe_metadata_reviews_pkey PRIMARY KEY (recipe_id),
 CONSTRAINT recipe_metadata_reviews_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE ON UPDATE CASCADE
);
