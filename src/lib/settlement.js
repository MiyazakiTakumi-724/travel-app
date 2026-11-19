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

// 1人あたりの負担額を1円単位で決める。割り切れない端数（人数 − 1 円まで）は、多く払った人から順に1円ずつ負担する。
// 立て替えた人が数円少なく受け取る形になるので、表示する金額と送金の合計がぴったり合う
function splitShares(participants, payments) {
  const total = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const base = Math.floor(total / participants.length);
  let remainder = total - base * participants.length;

  const paid = new Map(participants.map((p) => [p.id, 0]));
  for (const payment of payments) {
    if (paid.has(payment.payerId)) paid.set(payment.payerId, paid.get(payment.payerId) + payment.amount);
  }

  const shares = new Map(participants.map((p) => [p.id, base]));
  const extraIds = [];
  // 多く払った順（同じ額なら参加した順）に、端数を1円ずつ割り当てる
  const byPaid = participants.map((p, index) => ({ id: p.id, index })).sort((a, b) => paid.get(b.id) - paid.get(a.id) || a.index - b.index);
  for (const { id } of byPaid) {
    if (remainder === 0) break;
    shares.set(id, shares.get(id) + 1);
    extraIds.push(id);
    remainder--;
  }
  return { total, base, paid, shares, extraIds };
}

// 支払いを参加者で均等割りし、誰が誰にいくら払えば精算できるかを計算する
// balances は参加者IDごとの収支（プラス=最終的に受け取る、マイナス=最終的に支払う）。すべて1円単位の整数
// 名前をキーにすると同じニックネームの参加者が1人にまとまってしまうので、必ずIDで集計する
export function calculateSettlements(participants, payments) {
  if (participants.length === 0) return { transfers: [], balances: new Map() };

  const { paid, shares } = splitShares(participants, payments);
  const balances = new Map(participants.map((p) => [p.id, paid.get(p.id) - shares.get(p.id)]));

  const creditors = [];
  const debtors = [];
  for (const [id, balance] of balances) {
    if (balance > 0) creditors.push({ id, amount: balance });
    else if (balance < 0) debtors.push({ id, amount: -balance });
  }
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  // 払う額が大きい人から、受け取る額が大きい人へ順に送る
  const transfers = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(debtor.amount, creditor.amount);
    transfers.push({ from: debtor.id, to: creditor.id, amount });

    debtor.amount -= amount;
    creditor.amount -= amount;
    if (debtor.amount === 0) i++;
    if (creditor.amount === 0) j++;
  }

  return { transfers, balances };
}

// 精算タブのレシートに出す内訳（支払いの合計・1人あたり・メンバーごとの収支・送金）をまとめて計算する。
// share は1人あたりの基本の負担額、remainder は割り切れなかった端数、extraIds は端数を1円ずつ負担する人
export function summarizeSettlement(participants, payments) {
  if (participants.length === 0) {
    return { count: payments.length, total: 0, share: 0, remainder: 0, extraIds: [], rows: [], transfers: [] };
  }
  const { total, base, paid, shares, extraIds } = splitShares(participants, payments);
  const { transfers, balances } = calculateSettlements(participants, payments);

  return {
    count: payments.length,
    total,
    share: base,
    remainder: extraIds.length,
    extraIds,
    rows: participants.map((participant) => ({
      id: participant.id,
      paid: paid.get(participant.id),
      share: shares.get(participant.id),
      balance: balances.get(participant.id),
    })),
    transfers,
  };
}
