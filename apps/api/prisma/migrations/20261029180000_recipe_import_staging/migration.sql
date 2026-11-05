-- Provider imports are deliberately separate from the published recipe catalog.
CREATE TYPE "recipe_import_provider" AS ENUM ('THEMEALDB');
CREATE TYPE "recipe_import_review_status" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');

CREATE TABLE "recipe_imports" (
    "id" UUID NOT NULL,
    "provider" "recipe_import_provider" NOT NULL,
    "external_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "original_language" "language" NOT NULL DEFAULT 'EN',
    "area" TEXT,
    "country" TEXT,
    "category" TEXT,
    "image_url" TEXT,
    "source_url" TEXT,
    "image_source_url" TEXT,
    "license_metadata" JSONB NOT NULL,
    "ingredients" JSONB NOT NULL,
    "instructions_text" TEXT NOT NULL,
    "raw_payload" JSONB NOT NULL,
    "review_warnings" TEXT[],
    "review_status" "recipe_import_review_status" NOT NULL DEFAULT 'PENDING_REVIEW',
    "rights_reviewed" BOOLEAN NOT NULL DEFAULT false,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "recipe_imports_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "recipe_imports_provider_external_id_key" ON "recipe_imports"("provider", "external_id");
CREATE INDEX "recipe_imports_review_status_idx" ON "recipe_imports"("review_status");
