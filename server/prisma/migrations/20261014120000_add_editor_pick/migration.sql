-- CreateTable
CREATE TABLE IF NOT EXISTS "editor_pick" (
    "id" SERIAL NOT NULL,
    "content_id" VARCHAR(255) NOT NULL,
    "content_type_id" INTEGER NOT NULL,
    "label" VARCHAR(100),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "editor_pick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "editor_pick_content_type_id_display_order_idx" ON "editor_pick"("content_type_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "editor_pick_content_type_id_content_id_key" ON "editor_pick"("content_type_id", "content_id");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'editor_pick_content_id_fkey'
    ) THEN
        ALTER TABLE "editor_pick" ADD CONSTRAINT "editor_pick_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

