-- 支払いの「精算済み」チェックの機能をなくしたので、その列を削除する
-- （精算済みにしていた支払いも、これからは精算の計算に入る）

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "isSettled";

