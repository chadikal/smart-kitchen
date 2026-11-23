-- Link an existing user id to a verified Supabase subject without rewriting ownership.
ALTER TABLE "users" ADD COLUMN "auth_subject" UUID;
ALTER TABLE "users" ADD COLUMN "display_name" VARCHAR(80);
ALTER TABLE "users" ADD COLUMN "preferred_language" "language";
ALTER TABLE "users" ADD COLUMN "welcome_completed_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "users_auth_subject_key" ON "users"("auth_subject");
