/*
  Warnings:

  - Added the required column `kind` to the `usages` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UsageKind" AS ENUM ('USE', 'RETURN');

-- DropIndex
DROP INDEX "usages_user_id_qr_payload_key";

-- AlterTable
ALTER TABLE "usages" ADD COLUMN     "confidence" DOUBLE PRECISION,
ADD COLUMN     "game_id" BIGINT,
ADD COLUMN     "kind" "UsageKind" NOT NULL,
ALTER COLUMN "qr_payload" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "usages_user_kind_idx" ON "usages"("user_id", "kind");

-- AddForeignKey
ALTER TABLE "usages" ADD CONSTRAINT "usages_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE SET NULL ON UPDATE CASCADE;
