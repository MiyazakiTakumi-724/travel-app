import { formatDays } from "./dates";

export function formatPeriod(startDate, endDate) {
  if (!startDate && !endDate) return "日程未定";
  return `${startDate || "未定"} 〜 ${endDate || "未定"}`;
}

export function formatYen(amount) {
  return `¥${Number(amount).toLocaleString("ja-JP")}`;
}

export function formatSignedYen(amount) {
  const sign = amount > 0 ? "+" : amount < 0 ? "-" : "";
  return `${sign}${formatYen(Math.abs(amount))}`;
}

// プロジェクトの日程の表示。日程調整中なら日数を添える
export function formatTripPeriod(project) {
  if (project.startDate || project.endDate) return formatPeriod(project.startDate, project.endDate);
  if (project.days) return `日程調整中（${formatDays(project.days)}）`;
  return "日程未定";
}
