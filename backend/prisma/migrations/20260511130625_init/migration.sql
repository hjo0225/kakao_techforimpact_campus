-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "kakao_id" BIGINT NOT NULL,
    "nickname" TEXT NOT NULL,
    "profile_image" TEXT,
    "team_code" TEXT,
    "avatar_config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "code" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "primary_color" TEXT NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "usages" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "qr_payload" TEXT NOT NULL,
    "stadium_code" TEXT,
    "scanned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "score" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_kakao_id_key" ON "users"("kakao_id");

-- CreateIndex
CREATE INDEX "users_team_code_idx" ON "users"("team_code");

-- CreateIndex
CREATE INDEX "usages_user_scanned_idx" ON "usages"("user_id", "scanned_at");

-- CreateIndex
CREATE INDEX "usages_scanned_idx" ON "usages"("scanned_at");

-- CreateIndex
CREATE UNIQUE INDEX "usages_user_id_qr_payload_key" ON "usages"("user_id", "qr_payload");

-- AddForeignKey
ALTER TABLE "usages" ADD CONSTRAINT "usages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
