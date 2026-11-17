-- 支払者を名前ではなく参加者IDで持つ（同じニックネームの参加者がいても区別できるようにする）

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "payerId" TEXT;

-- 既存データ：同じプロジェクト内で名前が一致する参加者を支払者にする
-- （同名が複数いた場合は元データでは区別できないので、IDが最小の参加者に寄せる）
UPDATE "Payment" AS pay
SET "payerId" = (
  SELECT par."id"
  FROM "Participant" AS par
  WHERE par."projectId" = pay."projectId" AND par."name" = pay."payer"
  ORDER BY par."id"
  LIMIT 1
);

-- 一致する参加者がいない支払いは、その名前の参加者（ユーザー未紐付け）を作って割り当てる
INSERT INTO "Participant" ("id", "name", "projectId")
SELECT 'migrated_' || md5(pay."projectId" || ':' || pay."payer"), pay."payer", pay."projectId"
FROM "Payment" AS pay
WHERE pay."payerId" IS NULL
GROUP BY pay."projectId", pay."payer";

UPDATE "Payment" AS pay
SET "payerId" = 'migrated_' || md5(pay."projectId" || ':' || pay."payer")
WHERE pay."payerId" IS NULL;

ALTER TABLE "Payment" ALTER COLUMN "payerId" SET NOT NULL;
ALTER TABLE "Payment" DROP COLUMN "payer";

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
