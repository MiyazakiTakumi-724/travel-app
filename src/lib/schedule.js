import { addDays, daysBetween, eachDay } from "./dates";

export const MAX_DAYS = 14; // 旅行の日数の上限
export const MAX_RANGE_DAYS = 92; // 行けない日を聞く期間は3か月まで

export const ANSWERS = [
  { id: "yes", label: "○", text: "行ける", score: 2 },
  { id: "maybe", label: "△", text: "たぶん", score: 1 },
  { id: "no", label: "×", text: "行けない", score: 0 },
];

// 旅行の日数として受け付けられるか
export function isValidDays(days) {
  return Number.isInteger(days) && days >= 1 && days <= MAX_DAYS;
}

// 開始日と日数から終了日を出す
export function tripEndDate(startDate, days) {
  return addDays(startDate, days - 1);
}

// participants: [{ id, unavailableDays: ["YYYY-MM-DD", ...] }]
// 期間内のすべての開始日について、その日数の旅行に行けない人を数え、行けない人が少ない順に並べる
export function findBestWindows({ rangeStart, rangeEnd, days, participants }) {
  if (!rangeStart || !rangeEnd || !days) return [];
  const lastStart = addDays(rangeEnd, -(days - 1));
  if (daysBetween(rangeStart, lastStart) < 0) return [];

  const unavailable = participants.map((p) => ({ id: p.id, dates: new Set(p.unavailableDays) }));

  return eachDay(rangeStart, lastStart)
    .map((startDate) => {
      const window = eachDay(startDate, tripEndDate(startDate, days));
      const absentIds = unavailable
        .filter((p) => window.some((date) => p.dates.has(date)))
        .map((p) => p.id);
      return { startDate, endDate: tripEndDate(startDate, days), absentIds };
    })
    .sort((a, b) => a.absentIds.length - b.absentIds.length || a.startDate.localeCompare(b.startDate));
}

// その日に行ける人数（期間の表の一番下の行に出す）
export function availableCount(date, participants) {
  return participants.filter((p) => !p.unavailableDays.includes(date)).length;
}

// 候補ごとの投票を集計する。○=2点・△=1点で点数が高い候補を「いちばん人気」にする
export function tallyVotes(candidate, participantIds) {
  const byAnswer = Object.fromEntries(ANSWERS.map((a) => [a.id, []]));
  for (const vote of candidate.votes) {
    if (participantIds.includes(vote.participantId) && byAnswer[vote.answer]) {
      byAnswer[vote.answer].push(vote.participantId);
    }
  }
  const voted = new Set(Object.values(byAnswer).flat());
  const score = ANSWERS.reduce((sum, a) => sum + a.score * byAnswer[a.id].length, 0);
  return { byAnswer, score, notVoted: participantIds.filter((id) => !voted.has(id)) };
}

// いちばん点数が高い候補のID（同点なら日付が早い方。誰も投票していなければ null）
export function bestCandidateId(candidates, participantIds) {
  let best = null;
  for (const candidate of [...candidates].sort((a, b) => a.startDate.localeCompare(b.startDate))) {
    const { score } = tallyVotes(candidate, participantIds);
    if (score > 0 && (!best || score > best.score)) best = { id: candidate.id, score };
  }
  return best?.id ?? null;
}
