CREATE TABLE "user_favorite_person" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "person_id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_favorite_person_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_favorite_person_user_id_person_id_key" ON "user_favorite_person"("user_id", "person_id");
CREATE INDEX "user_favorite_person_user_id_idx" ON "user_favorite_person"("user_id");
CREATE INDEX "user_favorite_person_person_id_idx" ON "user_favorite_person"("person_id");

ALTER TABLE "user_favorite_person"
ADD CONSTRAINT "user_favorite_person_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "app_user"("auth_user_id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_favorite_person"
ADD CONSTRAINT "user_favorite_person_person_id_fkey"
FOREIGN KEY ("person_id") REFERENCES "person"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
