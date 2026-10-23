export function formatPeriod(startDate, endDate) {
  if (!startDate && !endDate) return "未定";
  return `${startDate || "未定"} 〜 ${endDate || "未定"}`;
}

export function formatYen(amount) {
  return `¥${Number(amount).toLocaleString("ja-JP")}`;
}

export function formatSignedYen(amount) {
  const sign = amount > 0 ? "+" : amount < 0 ? "-" : "";
  return `${sign}${formatYen(Math.abs(amount))}`;
}
