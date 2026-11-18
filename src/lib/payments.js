// 支払い内容の候補。「その他」を選ぶと自由に入力できる
export const MEMO_OPTIONS = ["食事", "宿", "交通費", "ガソリン", "観光", "買い物"];
export const OTHER = "その他";

// 編集時は保存済みの内容から、どのチップを選んだ状態にするかを決める
export function initialMemoChoice(memo) {
  if (!memo) return null;
  return MEMO_OPTIONS.includes(memo) ? memo : OTHER;
}

// 楽観的更新で、サーバーの応答を待たずに支払い一覧へ変更を反映する
export function applyPaymentChange(payments, change) {
  switch (change.type) {
    case "add":
      return [...payments, ...change.payments];
    case "restore":
      // 作成日時の順に並べ直して、元の位置に戻す
      return [...payments, change.payment].sort(
        (a, b) => new Date(a.createdAt ?? 0) - new Date(b.createdAt ?? 0)
      );
    case "edit":
      return payments.map((payment) =>
        payment.id === change.id ? { ...payment, ...change.changes } : payment
      );
    case "delete":
      return payments.filter((payment) => payment.id !== change.id);
    default:
      return payments;
  }
}
