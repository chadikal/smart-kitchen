-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "language" AS ENUM ('EN', 'AR');

-- CreateEnum
CREATE TYPE "publication_status" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "visibility" AS ENUM ('PRIVATE', 'PUBLIC');

-- CreateEnum
CREATE TYPE "difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "measured_unit" AS ENUM ('MILLIGRAM', 'GRAM', 'KILOGRAM', 'MILLILITER', 'LITER', 'TEASPOON', 'TABLESPOON', 'CUP', 'PIECE');

-- CreateEnum
CREATE TYPE "qualitative_amount" AS ENUM ('TO_TASTE');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "countries" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "code" CHAR(2),
    "original_language" "language" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "country_translations" (
    "id" UUID NOT NULL,
    "country_id" UUID NOT NULL,
    "language" "language" NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "country_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuisines" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "original_language" "language" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cuisines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuisine_translations" (
    "id" UUID NOT NULL,
    "cuisine_id" UUID NOT NULL,
    "language" "language" NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cuisine_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dietary_tags" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "original_language" "language" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dietary_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dietary_tag_translations" (
    "id" UUID NOT NULL,
    "dietary_tag_id" UUID NOT NULL,
    "language" "language" NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dietary_tag_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredients" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "original_language" "language" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredient_translations" (
    "id" UUID NOT NULL,
    "ingredient_id" UUID NOT NULL,
    "language" "language" NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingredient_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "owner_id" UUID,
    "original_language" "language" NOT NULL,
    "publication_status" "publication_status" NOT NULL DEFAULT 'DRAFT',
    "visibility" "visibility" NOT NULL DEFAULT 'PRIVATE',
    "prep_time_minutes" INTEGER NOT NULL DEFAULT 0,
    "cook_time_minutes" INTEGER NOT NULL DEFAULT 0,
    "servings" INTEGER NOT NULL DEFAULT 1,
    "difficulty" "difficulty" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_translations" (
    "id" UUID NOT NULL,
    "recipe_id" UUID NOT NULL,
    "language" "language" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipe_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_steps" (
    "id" UUID NOT NULL,
    "recipe_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipe_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_step_translations" (
    "id" UUID NOT NULL,
    "recipe_id" UUID NOT NULL,
    "step_id" UUID NOT NULL,
    "recipe_translation_id" UUID NOT NULL,
    "instruction" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipe_step_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_ingredients" (
    "id" UUID NOT NULL,
    "recipe_id" UUID NOT NULL,
    "ingredient_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "quantity" DECIMAL(12,3),
    "unit" "measured_unit",
    "qualitative_amount" "qualitative_amount",
    "is_optional" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_ingredient_translations" (
    "id" UUID NOT NULL,
    "recipe_id" UUID NOT NULL,
    "recipe_ingredient_id" UUID NOT NULL,
    "recipe_translation_id" UUID NOT NULL,
    "note" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipe_ingredient_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_countries" (
    "recipe_id" UUID NOT NULL,
    "country_id" UUID NOT NULL,

    CONSTRAINT "recipe_countries_pkey" PRIMARY KEY ("recipe_id","country_id")
);

-- CreateTable
CREATE TABLE "recipe_cuisines" (
    "recipe_id" UUID NOT NULL,
    "cuisine_id" UUID NOT NULL,

    CONSTRAINT "recipe_cuisines_pkey" PRIMARY KEY ("recipe_id","cuisine_id")
);

-- CreateTable
CREATE TABLE "recipe_dietary_tags" (
    "recipe_id" UUID NOT NULL,
    "dietary_tag_id" UUID NOT NULL,

    CONSTRAINT "recipe_dietary_tags_pkey" PRIMARY KEY ("recipe_id","dietary_tag_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "countries_slug_key" ON "countries"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "countries_code_key" ON "countries"("code");

-- CreateIndex
CREATE INDEX "countries_original_language_idx" ON "countries"("original_language");

-- CreateIndex
CREATE INDEX "country_translations_language_idx" ON "country_translations"("language");

-- CreateIndex
CREATE UNIQUE INDEX "country_translations_country_id_language_key" ON "country_translations"("country_id", "language");

-- CreateIndex
CREATE UNIQUE INDEX "cuisines_slug_key" ON "cuisines"("slug");

-- CreateIndex
CREATE INDEX "cuisines_original_language_idx" ON "cuisines"("original_language");

-- CreateIndex
CREATE INDEX "cuisine_translations_language_idx" ON "cuisine_translations"("language");

-- CreateIndex
CREATE UNIQUE INDEX "cuisine_translations_cuisine_id_language_key" ON "cuisine_translations"("cuisine_id", "language");

-- CreateIndex
CREATE UNIQUE INDEX "dietary_tags_slug_key" ON "dietary_tags"("slug");

-- CreateIndex
CREATE INDEX "dietary_tags_original_language_idx" ON "dietary_tags"("original_language");

-- CreateIndex
CREATE INDEX "dietary_tag_translations_language_idx" ON "dietary_tag_translations"("language");

-- CreateIndex
CREATE UNIQUE INDEX "dietary_tag_translations_dietary_tag_id_language_key" ON "dietary_tag_translations"("dietary_tag_id", "language");

-- CreateIndex
CREATE UNIQUE INDEX "ingredients_slug_key" ON "ingredients"("slug");

-- CreateIndex
CREATE INDEX "ingredients_original_language_idx" ON "ingredients"("original_language");

-- CreateIndex
CREATE INDEX "ingredient_translations_language_name_idx" ON "ingredient_translations"("language", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ingredient_translations_ingredient_id_language_key" ON "ingredient_translations"("ingredient_id", "language");

-- CreateIndex
CREATE UNIQUE INDEX "recipes_slug_key" ON "recipes"("slug");

-- CreateIndex
CREATE INDEX "recipes_owner_id_idx" ON "recipes"("owner_id");

-- CreateIndex
CREATE INDEX "recipes_publication_status_visibility_idx" ON "recipes"("publication_status", "visibility");

-- CreateIndex
CREATE INDEX "recipes_original_language_idx" ON "recipes"("original_language");

-- CreateIndex
CREATE INDEX "recipe_translations_language_idx" ON "recipe_translations"("language");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_translations_recipe_id_language_key" ON "recipe_translations"("recipe_id", "language");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_translations_id_recipe_id_key" ON "recipe_translations"("id", "recipe_id");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_steps_recipe_id_position_key" ON "recipe_steps"("recipe_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_steps_id_recipe_id_key" ON "recipe_steps"("id", "recipe_id");

-- CreateIndex
CREATE INDEX "recipe_step_translations_recipe_translation_id_idx" ON "recipe_step_translations"("recipe_translation_id");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_step_translations_step_id_recipe_translation_id_key" ON "recipe_step_translations"("step_id", "recipe_translation_id");

-- CreateIndex
CREATE INDEX "recipe_ingredients_ingredient_id_idx" ON "recipe_ingredients"("ingredient_id");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_ingredients_recipe_id_position_key" ON "recipe_ingredients"("recipe_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_ingredients_id_recipe_id_key" ON "recipe_ingredients"("id", "recipe_id");

-- CreateIndex
CREATE INDEX "recipe_ingredient_translations_recipe_translation_id_idx" ON "recipe_ingredient_translations"("recipe_translation_id");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_ingredient_translations_recipe_ingredient_id_recipe__key" ON "recipe_ingredient_translations"("recipe_ingredient_id", "recipe_translation_id");

-- CreateIndex
CREATE INDEX "recipe_countries_country_id_idx" ON "recipe_countries"("country_id");

-- CreateIndex
CREATE INDEX "recipe_cuisines_cuisine_id_idx" ON "recipe_cuisines"("cuisine_id");

-- CreateIndex
CREATE INDEX "recipe_dietary_tags_dietary_tag_id_idx" ON "recipe_dietary_tags"("dietary_tag_id");

-- AddForeignKey
ALTER TABLE "country_translations" ADD CONSTRAINT "country_translations_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuisine_translations" ADD CONSTRAINT "cuisine_translations_cuisine_id_fkey" FOREIGN KEY ("cuisine_id") REFERENCES "cuisines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dietary_tag_translations" ADD CONSTRAINT "dietary_tag_translations_dietary_tag_id_fkey" FOREIGN KEY ("dietary_tag_id") REFERENCES "dietary_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_translations" ADD CONSTRAINT "ingredient_translations_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_translations" ADD CONSTRAINT "recipe_translations_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_steps" ADD CONSTRAINT "recipe_steps_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_step_translations" ADD CONSTRAINT "recipe_step_translations_step_id_recipe_id_fkey" FOREIGN KEY ("step_id", "recipe_id") REFERENCES "recipe_steps"("id", "recipe_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_step_translations" ADD CONSTRAINT "recipe_step_translations_recipe_translation_id_recipe_id_fkey" FOREIGN KEY ("recipe_translation_id", "recipe_id") REFERENCES "recipe_translations"("id", "recipe_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredient_translations" ADD CONSTRAINT "recipe_ingredient_translations_recipe_ingredient_id_recipe_fkey" FOREIGN KEY ("recipe_ingredient_id", "recipe_id") REFERENCES "recipe_ingredients"("id", "recipe_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredient_translations" ADD CONSTRAINT "recipe_ingredient_translations_recipe_translation_id_recip_fkey" FOREIGN KEY ("recipe_translation_id", "recipe_id") REFERENCES "recipe_translations"("id", "recipe_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_countries" ADD CONSTRAINT "recipe_countries_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_countries" ADD CONSTRAINT "recipe_countries_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_cuisines" ADD CONSTRAINT "recipe_cuisines_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_cuisines" ADD CONSTRAINT "recipe_cuisines_cuisine_id_fkey" FOREIGN KEY ("cuisine_id") REFERENCES "cuisines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_dietary_tags" ADD CONSTRAINT "recipe_dietary_tags_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_dietary_tags" ADD CONSTRAINT "recipe_dietary_tags_dietary_tag_id_fkey" FOREIGN KEY ("dietary_tag_id") REFERENCES "dietary_tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Checks Prisma cannot express. Preserve these if a later migration proposes dropping them.
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_time_and_servings_chk" CHECK (
    "prep_time_minutes" >= 0
    AND "cook_time_minutes" >= 0
    AND "servings" >= 1
);

ALTER TABLE "recipe_steps" ADD CONSTRAINT "recipe_steps_position_chk" CHECK (
    "position" >= 1
);

ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_position_chk" CHECK (
    "position" >= 1
);

ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_amount_chk" CHECK (
    (
        "quantity" IS NOT NULL
        AND "quantity" > 0
        AND "unit" IS NOT NULL
        AND "qualitative_amount" IS NULL
    )
    OR (
        "quantity" IS NULL
        AND "unit" IS NULL
        AND "qualitative_amount" IS NOT NULL
    )
);

