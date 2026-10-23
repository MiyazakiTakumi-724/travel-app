// 未清算の支払いを参加者で均等割りし、誰が誰にいくら払えば精算できるかを計算する
// balances は各参加者の収支（プラス=最終的に受け取る、マイナス=最終的に支払う）
export function calculateSettlements(participants, payments) {
  if (participants.length === 0) return { transfers: [], balances: new Map() };

  const unsettled = payments.filter((payment) => !payment.isSettled);
  const total = unsettled.reduce((sum, payment) => sum + payment.amount, 0);
  const share = total / participants.length;

  const balances = new Map(participants.map((p) => [p.name, -share]));
  for (const payment of unsettled) {
    balances.set(payment.payer, (balances.get(payment.payer) ?? -share) + payment.amount);
  }

  const creditors = [];
  const debtors = [];
  for (const [name, balance] of balances) {
    if (balance > 0.5) creditors.push({ name, amount: balance });
    else if (balance < -0.5) debtors.push({ name, amount: -balance });
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
      transfers.push({ from: debtor.name, to: creditor.name, amount: Math.round(amount) });
    }

    debtor.amount -= amount;
    creditor.amount -= amount;
    if (debtor.amount <= 0.5) i++;
    if (creditor.amount <= 0.5) j++;
  }

  return { transfers, balances };
}
