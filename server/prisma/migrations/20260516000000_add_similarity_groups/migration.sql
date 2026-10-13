CREATE TYPE "SimilarityNodeType" AS ENUM ('content', 'franchise');

CREATE TABLE "similarity_group" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "similarity_group_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "similarity_group_item" (
    "id" SERIAL NOT NULL,
    "group_id" UUID NOT NULL,
    "node_type" "SimilarityNodeType" NOT NULL,
    "node_id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "similarity_group_item_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "similarity_group_item_node_type_node_id_key" ON "similarity_group_item"("node_type", "node_id");
CREATE UNIQUE INDEX "similarity_group_item_group_id_node_type_node_id_key" ON "similarity_group_item"("group_id", "node_type", "node_id");
CREATE INDEX "similarity_group_item_group_id_idx" ON "similarity_group_item"("group_id");
CREATE INDEX "similarity_group_item_node_type_node_id_idx" ON "similarity_group_item"("node_type", "node_id");

ALTER TABLE "similarity_group_item"
ADD CONSTRAINT "similarity_group_item_group_id_fkey"
FOREIGN KEY ("group_id") REFERENCES "similarity_group"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
