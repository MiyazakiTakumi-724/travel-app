// "2026-11-03" → "11/3"
function shortDate(date) {
  const [, month, day] = date.split("-");
  return `${Number(month)}/${Number(day)}`;
}

export function formatPeriod(startDate, endDate) {
  if (!startDate && !endDate) return "";
  if (!endDate) return `${shortDate(startDate)}〜`;
  if (!startDate) return `〜${shortDate(endDate)}`;
  return `${shortDate(startDate)}〜${shortDate(endDate)}`;
}

export function formatYen(amount) {
  return `¥${Number(amount).toLocaleString("ja-JP")}`;
}

export function formatSignedYen(amount) {
  const sign = amount > 0 ? "+" : amount < 0 ? "-" : "±";
  return `${sign}${formatYen(Math.abs(amount))}`;
}

// 受け取り＝青、支払い＝オレンジ、差し引きゼロ＝グレー
export function balanceColorClass(amount) {
  return amount > 0 ? "text-blue-600" : amount < 0 ? "text-orange-600" : "text-gray-400";
}
