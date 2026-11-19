-- ゲストも参加・作成できるようにする
-- ・作成者を Project.ownerId（Googleのユーザー）ではなく、参加者の isOwner で持つ
-- ・ゲストの復帰用コード（ハッシュ）と、コードの入力ミスの記録を追加する

-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "guestCodeHash" TEXT,
ADD COLUMN     "isOwner" BOOLEAN NOT NULL DEFAULT false;

-- 既存データ：作成者が参加者にいないプロジェクトがあれば、作成者の参加者を作る（念のため）
INSERT INTO "Participant" ("id", "name", "projectId", "userId")
SELECT 'owner_' || md5(p."id"), COALESCE(u."nickname", u."name", '作成者'), p."id", p."ownerId"
FROM "Project" AS p
JOIN "User" AS u ON u."id" = p."ownerId"
WHERE NOT EXISTS (
  SELECT 1 FROM "Participant" AS par WHERE par."projectId" = p."id" AND par."userId" = p."ownerId"
);

-- 既存データ：作成者と同じユーザーの参加者に、作成者の印を付ける
UPDATE "Participant" AS par
SET "isOwner" = true
FROM "Project" AS p
WHERE par."projectId" = p."id" AND par."userId" = p."ownerId";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_ownerId_fkey";

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "ownerId";

-- CreateTable
CREATE TABLE "GuestCodeAttempt" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestCodeAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuestCodeAttempt_key_createdAt_idx" ON "GuestCodeAttempt"("key", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_guestCodeHash_key" ON "Participant"("guestCodeHash");
