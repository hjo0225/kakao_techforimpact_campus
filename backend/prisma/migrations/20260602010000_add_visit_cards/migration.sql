-- CreateTable
CREATE TABLE "visit_cards" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "image_path" TEXT NOT NULL,
    "image_hash" TEXT NOT NULL,
    "team_code" TEXT,
    "caption" TEXT,
    "share_token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visit_cards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "visit_cards_share_token_key" ON "visit_cards"("share_token");

-- CreateIndex
CREATE INDEX "visit_cards_user_created_idx" ON "visit_cards"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "visit_cards" ADD CONSTRAINT "visit_cards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
