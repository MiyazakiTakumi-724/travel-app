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

// 支払い記録の絞り込み。payerId を指定するとその人の支払いだけにする
export function filterPayments(payments, { payerId = null } = {}) {
  return payments.filter((payment) => !payerId || payment.payerId === payerId);
}
