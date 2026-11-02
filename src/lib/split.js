// 金額を count 人で均等割りし、端数は先頭から順に1円ずつ乗せる
export function splitAmount(amount, count) {
  const base = Math.floor(amount / count);
  const remainder = amount - base * count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}
