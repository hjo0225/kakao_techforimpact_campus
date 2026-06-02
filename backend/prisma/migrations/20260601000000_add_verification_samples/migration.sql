-- CreateEnum
CREATE TYPE "ContainerLabel" AS ENUM ('REUSABLE', 'SINGLE_USE');

-- CreateEnum
CREATE TYPE "SampleStatus" AS ENUM ('PENDING', 'CONFIRMED');

-- CreateTable
CREATE TABLE "verification_samples" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "kind" "UsageKind" NOT NULL,
    "image_path" TEXT NOT NULL,
    "image_hash" TEXT NOT NULL,
    "ai_is_reusable" BOOLEAN,
    "ai_class_index" INTEGER,
    "ai_confidence" DOUBLE PRECISION,
    "user_label" "ContainerLabel",
    "status" "SampleStatus" NOT NULL DEFAULT 'PENDING',
    "game_id" BIGINT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "usage_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),

    CONSTRAINT "verification_samples_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "verification_samples_usage_id_key" ON "verification_samples"("usage_id");

-- CreateIndex
CREATE INDEX "verification_samples_user_created_idx" ON "verification_samples"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "verification_samples_status_idx" ON "verification_samples"("status");

-- CreateIndex
CREATE INDEX "verification_samples_user_label_idx" ON "verification_samples"("user_label");

-- AddForeignKey
ALTER TABLE "verification_samples" ADD CONSTRAINT "verification_samples_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_samples" ADD CONSTRAINT "verification_samples_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_samples" ADD CONSTRAINT "verification_samples_usage_id_fkey" FOREIGN KEY ("usage_id") REFERENCES "usages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
