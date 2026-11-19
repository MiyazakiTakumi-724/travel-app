import { addDays, formatDays, formatTripDates } from "./dates";

// 決まっている日程の表示（日程タブ・一覧・ヘッダーで同じ書き方にする）
export function formatPeriod(startDate, endDate) {
  return formatTripDates(startDate, endDate);
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
  if (project.tentativeStart && project.days) {
    return `仮決定 ${formatTripDates(project.tentativeStart, addDays(project.tentativeStart, project.days - 1))}`;
  }
  if (project.days) return `日程調整中（${formatDays(project.days)}）`;
  return "日程未定";
}
