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

// 支払い記録の絞り込み。payerIds に入っている人の支払いだけにする（空なら全員分）
export function filterPayments(payments, { payerIds = [] } = {}) {
  return payments.filter((payment) => payerIds.length === 0 || payerIds.includes(payment.payerId));
}
