-- CreateTable
CREATE TABLE "seed_provenance" (
    "id" UUID NOT NULL,
    "seed_key" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seed_provenance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "seed_provenance_seed_key_idx" ON "seed_provenance"("seed_key");

-- CreateIndex
CREATE UNIQUE INDEX "seed_provenance_entity_type_entity_id_key" ON "seed_provenance"("entity_type", "entity_id");
