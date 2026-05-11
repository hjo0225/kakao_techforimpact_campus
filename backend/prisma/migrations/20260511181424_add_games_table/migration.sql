-- CreateTable
CREATE TABLE "games" (
    "id" BIGSERIAL NOT NULL,
    "date" DATE NOT NULL,
    "start_time" TEXT NOT NULL,
    "away_team_code" TEXT NOT NULL,
    "home_team_code" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT '-',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "games_date_idx" ON "games"("date");

-- CreateIndex
CREATE UNIQUE INDEX "games_date_away_team_code_home_team_code_key" ON "games"("date", "away_team_code", "home_team_code");

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_away_team_code_fkey" FOREIGN KEY ("away_team_code") REFERENCES "teams"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_home_team_code_fkey" FOREIGN KEY ("home_team_code") REFERENCES "teams"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
