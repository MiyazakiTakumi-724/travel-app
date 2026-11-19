-- 招待リンク用の鍵を、プロジェクトIDとは別に持つ（作り直せるようにする）
-- 今までのプロジェクトは、配った招待リンクがそのまま使えるよう、プロジェクトIDを入れておく

-- AlterTable
ALTER TABLE "Project" ADD COLUMN "inviteToken" TEXT;
UPDATE "Project" SET "inviteToken" = "id" WHERE "inviteToken" IS NULL;
ALTER TABLE "Project" ALTER COLUMN "inviteToken" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Project_inviteToken_key" ON "Project"("inviteToken");
