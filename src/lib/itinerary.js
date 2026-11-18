import { addDays } from "./dates";

// 時刻は "HH:MM"（24時間）か、空（時刻なし）
export function isValidTime(time) {
  if (time === "") return true;
  const match = /^(\d{2}):(\d{2})$/.exec(time ?? "");
  return Boolean(match) && Number(match[1]) <= 23 && Number(match[2]) <= 59;
}

// 同じ日の予定は時刻の早い順。時刻のない予定は、その日の最後に追加した順で並べる
export function compareItems(a, b) {
  if (a.time && b.time && a.time !== b.time) return a.time.localeCompare(b.time);
  if (Boolean(a.time) !== Boolean(b.time)) return a.time ? -1 : 1;
  return new Date(a.createdAt ?? 0) - new Date(b.createdAt ?? 0);
}

// 旅行の日ごとに予定をまとめる。startDate があれば各日の日付も付ける。
// 日数を減らしたときに残った、日数より後ろの日の予定は出さない
export function groupByDay(items, { days, startDate }) {
  return Array.from({ length: days }, (_, index) => ({
    dayIndex: index + 1,
    date: startDate ? addDays(startDate, index) : null,
    items: items.filter((item) => item.dayIndex === index + 1).sort(compareItems),
  }));
}
