-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "days" INTEGER,
ADD COLUMN     "rangeEnd" TEXT,
ADD COLUMN     "rangeStart" TEXT;

-- CreateTable
CREATE TABLE "UnavailableDay" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,

    CONSTRAINT "UnavailableDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleCandidate" (
    "id" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "ScheduleCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleVote" (
    "id" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,

    CONSTRAINT "ScheduleVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UnavailableDay_participantId_date_key" ON "UnavailableDay"("participantId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleCandidate_projectId_startDate_key" ON "ScheduleCandidate"("projectId", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleVote_candidateId_participantId_key" ON "ScheduleVote"("candidateId", "participantId");

-- AddForeignKey
ALTER TABLE "UnavailableDay" ADD CONSTRAINT "UnavailableDay_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleCandidate" ADD CONSTRAINT "ScheduleCandidate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleVote" ADD CONSTRAINT "ScheduleVote_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "ScheduleCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleVote" ADD CONSTRAINT "ScheduleVote_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

