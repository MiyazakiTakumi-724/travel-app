-- 支払いが残っている参加者は削除できないようにする（メンバーを外しても支払い記録が消えないように）
-- プロジェクトごと削除する場合は、支払いも参加者も同じ削除の中で消えるので問題なく削除できる

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_payerId_fkey";

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "Participant"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
