-- 日程調整を「行ける日を提出 → 作成者が仮決定 → 全員の ○ で確定」の流れに変える
-- 「行けない日」と「候補・投票」のテーブルは使わなくなるので削除する

-- DropForeignKey
ALTER TABLE "UnavailableDay" DROP CONSTRAINT "UnavailableDay_participantId_fkey";

-- DropForeignKey
ALTER TABLE "ScheduleCandidate" DROP CONSTRAINT "ScheduleCandidate_projectId_fkey";

-- DropForeignKey
ALTER TABLE "ScheduleVote" DROP CONSTRAINT "ScheduleVote_candidateId_fkey";

-- DropForeignKey
ALTER TABLE "ScheduleVote" DROP CONSTRAINT "ScheduleVote_participantId_fkey";

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "tentativeStart" TEXT;

-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "availabilitySubmitted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tentativeAnswer" TEXT;

-- DropTable
DROP TABLE "UnavailableDay";

-- DropTable
DROP TABLE "ScheduleCandidate";

-- DropTable
DROP TABLE "ScheduleVote";

-- CreateTable
CREATE TABLE "AvailableDay" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,

    CONSTRAINT "AvailableDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AvailableDay_participantId_date_key" ON "AvailableDay"("participantId", "date");

-- AddForeignKey
ALTER TABLE "AvailableDay" ADD CONSTRAINT "AvailableDay_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

