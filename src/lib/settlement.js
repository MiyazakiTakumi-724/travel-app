// 同じニックネームの参加者がいても見分けられるよう、2人目以降に番号を付けた表示名を作る
export function buildDisplayNames(participants) {
  const seen = new Map();
  const names = new Map();
  for (const participant of participants) {
    const count = (seen.get(participant.name) ?? 0) + 1;
    seen.set(participant.name, count);
    names.set(participant.id, count === 1 ? participant.name : `${participant.name}（${count}）`);
  }
  return names;
}

// 未清算の支払いを参加者で均等割りし、誰が誰にいくら払えば精算できるかを計算する
// balances は参加者IDごとの収支（プラス=最終的に受け取る、マイナス=最終的に支払う）
// 名前をキーにすると同じニックネームの参加者が1人にまとまってしまうので、必ずIDで集計する
export function calculateSettlements(participants, payments) {
  if (participants.length === 0) return { transfers: [], balances: new Map() };

  const unsettled = payments.filter((payment) => !payment.isSettled);
  const total = unsettled.reduce((sum, payment) => sum + payment.amount, 0);
  const share = total / participants.length;

  const balances = new Map(participants.map((p) => [p.id, -share]));
  for (const payment of unsettled) {
    balances.set(payment.payerId, (balances.get(payment.payerId) ?? -share) + payment.amount);
  }

  const creditors = [];
  const debtors = [];
  for (const [id, balance] of balances) {
    if (balance > 0.5) creditors.push({ id, amount: balance });
    else if (balance < -0.5) debtors.push({ id, amount: -balance });
  }
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transfers = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(debtor.amount, creditor.amount);

    if (amount > 0.5) {
      transfers.push({ from: debtor.id, to: creditor.id, amount: Math.round(amount) });
    }

    debtor.amount -= amount;
    creditor.amount -= amount;
    if (debtor.amount <= 0.5) i++;
    if (creditor.amount <= 0.5) j++;
  }

  return { transfers, balances };
}
