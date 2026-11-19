-- アカウントを削除して抜けた人の印。支払いの記録があると精算に必要なので、参加者は残してこの印を付ける
-- （日程調整の提出・回答は待たない）

-- AlterTable
ALTER TABLE "Participant" ADD COLUMN "retired" BOOLEAN NOT NULL DEFAULT false;
