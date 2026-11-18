import { addDays, daysBetween } from "./dates";

export const MAX_DAYS = 14; // 旅行の日数の上限
export const MAX_RANGE_DAYS = 92; // 行ける日を聞く期間は3か月まで

// 仮決定の日程への答え
export const ANSWERS = [
  { id: "yes", label: "○", text: "行ける" },
  { id: "no", label: "×", text: "行けない" },
];

// 旅行の日数として受け付けられるか
export function isValidDays(days) {
  return Number.isInteger(days) && days >= 1 && days <= MAX_DAYS;
}

// 開始日と日数から終了日を出す
export function tripEndDate(startDate, days) {
  return addDays(startDate, days - 1);
}

// その開始日の旅行が、期間の中に収まるか
export function fitsInRange(startDate, { rangeStart, rangeEnd, days }) {
  return daysBetween(rangeStart, startDate) >= 0 && daysBetween(tripEndDate(startDate, days), rangeEnd) >= 0;
}

// 日程調整の段階
// - "decided"    : 日程が確定した
// - "voting"     : 作成者が仮決定し、メンバーが ○× で答えている
// - "choosing"   : 全員が行ける日を提出し、作成者が仮決定するのを待っている
// - "collecting" : メンバーが行ける日を付けて提出している
// - "notStarted" : 日数や期間が決まっていない（日程を決めずに作った古いプロジェクトなど）
export function schedulePhase(project, participants) {
  if (project.startDate || project.endDate) return "decided";
  if (!isValidDays(project.days) || !project.rangeStart || !project.rangeEnd) return "notStarted";
  if (project.tentativeStart) return "voting";
  if (participants.length > 0 && participants.every((p) => p.availabilitySubmitted)) return "choosing";
  return "collecting";
}

// その日に行ける人数（表の一番下の行に出す）
export function availableCount(date, participants) {
  return participants.filter((p) => p.availableDays.includes(date)).length;
}

// 仮決定の日程への答えを集計する。全員が ○ なら確定してよい
export function tallyAnswers(participants) {
  const yes = participants.filter((p) => p.tentativeAnswer === "yes").map((p) => p.id);
  const no = participants.filter((p) => p.tentativeAnswer === "no").map((p) => p.id);
  const waiting = participants.filter((p) => !p.tentativeAnswer).map((p) => p.id);
  return { yes, no, waiting, allAgreed: participants.length > 0 && yes.length === participants.length };
}
