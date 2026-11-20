import { addDays, daysBetween } from "./dates";

export const MAX_DAYS = 14; // 日程調整で決める旅行の日数の上限
export const MAX_RANGE_DAYS = 92; // 行ける日を聞く期間は3か月まで
export const MAX_TRIP_DAYS = 31; // 日程が決まっている旅行の期間は1か月まで

// アカウントを削除して抜けた人（支払いの記録だけが残っている）か。日程調整の提出・回答は待たない
export function isRetired(participant) {
  return Boolean(participant.retired);
}

// 日程調整に加わるメンバー（退会した人を除く）
export function activeMembers(participants) {
  return participants.filter((p) => !isRetired(p));
}

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
// - "voting"     : 幹事が仮決定し、メンバーが ○× で答えている
// - "choosing"   : 全員が行ける日を提出し、幹事が仮決定するのを待っている
// - "collecting" : メンバーが行ける日を付けて提出している
// - "notStarted" : 日数や期間が決まっていない（日程を決めずに作った古いプロジェクトなど）
export function schedulePhase(project, participants) {
  if (project.startDate || project.endDate) return "decided";
  if (!isValidDays(project.days) || !project.rangeStart || !project.rangeEnd) return "notStarted";
  if (project.tentativeStart) return "voting";
  const members = activeMembers(participants);
  if (members.length > 0 && members.every((p) => p.availabilitySubmitted)) return "choosing";
  return "collecting";
}

// その日に行ける人数（表の一番下の行に出す）。まだ提出していない人の選びかけの日は数えない
export function availableCount(date, participants) {
  return activeMembers(participants).filter((p) => p.availabilitySubmitted && p.availableDays.includes(date)).length;
}

// 仮決定の日程への答えを集計する。全員が ○ なら確定してよい
export function tallyAnswers(participants) {
  const members = activeMembers(participants);
  const yes = members.filter((p) => p.tentativeAnswer === "yes").map((p) => p.id);
  const no = members.filter((p) => p.tentativeAnswer === "no").map((p) => p.id);
  const waiting = members.filter((p) => !p.tentativeAnswer).map((p) => p.id);
  return { yes, no, waiting, allAgreed: members.length > 0 && yes.length === members.length };
}

// 日程調整で、その人がやることのラベル（何もなければ null）
// participants は availabilitySubmitted・tentativeAnswer を持つ参加者の一覧
export function myScheduleTodo(project, participants, myParticipantId, isOwner) {
  const me = participants.find((p) => p.id === myParticipantId);
  if (!me || isRetired(me)) return null;
  const phase = schedulePhase(project, participants);
  if (phase === "collecting" && !me.availabilitySubmitted) return "行ける日を提出してください";
  if (phase === "choosing" && isOwner) return "日程を仮決定してください";
  if (phase === "voting" && !me.tentativeAnswer) return "仮決定の日程に回答してください";
  return null;
}
