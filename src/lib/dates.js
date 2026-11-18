// 日付は "YYYY-MM-DD" の文字列で扱う。タイムゾーンでずれないよう、計算はすべて UTC で行う

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export function parseDate(text) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text ?? "")) return null;
  const [y, m, d] = text.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  // 2/30 のようなありえない日付は受け付けない
  return date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? date : null;
}

export function isValidDate(text) {
  return parseDate(text) !== null;
}

export function toDateString(date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(text, count) {
  return toDateString(new Date(parseDate(text).getTime() + count * DAY_MS));
}

// start から end までの日数（同じ日なら 0）
export function daysBetween(start, end) {
  return Math.round((parseDate(end) - parseDate(start)) / DAY_MS);
}

// start〜end の日付を順に並べる（両端を含む）
export function eachDay(start, end) {
  const count = daysBetween(start, end);
  return Array.from({ length: Math.max(count + 1, 0) }, (_, index) => addDays(start, index));
}

export function weekday(text) {
  return parseDate(text).getUTCDay();
}

// 「11/14(土)」の形
export function formatShortDate(text) {
  const date = parseDate(text);
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}(${WEEKDAYS[date.getUTCDay()]})`;
}

// 「11/14(土)〜11/16(月)」の形。1日だけなら開始日のみ
export function formatDateRange(start, end) {
  return start === end ? formatShortDate(start) : `${formatShortDate(start)}〜${formatShortDate(end)}`;
}

// 「2泊3日」「日帰り」の形
export function formatDays(days) {
  if (!days) return "";
  return days === 1 ? "日帰り" : `${days - 1}泊${days}日`;
}

// ---- 日本の祝日（2007年以降の祝日法にもとづいて計算する） ----

function nthMonday(year, month, n) {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const day = 1 + ((8 - first) % 7) + (n - 1) * 7;
  return toDateString(new Date(Date.UTC(year, month - 1, day)));
}

const ymd = (year, month, day) => toDateString(new Date(Date.UTC(year, month - 1, day)));

function baseHolidays(year) {
  // 春分・秋分の日は 1980〜2099 年で使える近似式
  const vernal = Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
  const autumnal = Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
  return new Map([
    [ymd(year, 1, 1), "元日"],
    [nthMonday(year, 1, 2), "成人の日"],
    [ymd(year, 2, 11), "建国記念の日"],
    [ymd(year, 2, 23), "天皇誕生日"],
    [ymd(year, 3, vernal), "春分の日"],
    [ymd(year, 4, 29), "昭和の日"],
    [ymd(year, 5, 3), "憲法記念日"],
    [ymd(year, 5, 4), "みどりの日"],
    [ymd(year, 5, 5), "こどもの日"],
    [nthMonday(year, 7, 3), "海の日"],
    [ymd(year, 8, 11), "山の日"],
    [nthMonday(year, 9, 3), "敬老の日"],
    [ymd(year, 9, autumnal), "秋分の日"],
    [nthMonday(year, 10, 2), "スポーツの日"],
    [ymd(year, 11, 3), "文化の日"],
    [ymd(year, 11, 23), "勤労感謝の日"],
  ]);
}

const holidayCache = new Map();

// その年の祝日（日付 → 祝日名）。振替休日と国民の休日も含む
export function holidaysOf(year) {
  if (holidayCache.has(year)) return holidayCache.get(year);
  const holidays = baseHolidays(year);

  // 国民の休日：前後の日が祝日にはさまれた平日（9月にできることがある）
  for (const date of [...holidays.keys()]) {
    const next = addDays(date, 1);
    const afterNext = addDays(date, 2);
    if (!holidays.has(next) && holidays.has(afterNext) && weekday(next) !== 0) {
      holidays.set(next, "国民の休日");
    }
  }

  // 振替休日：祝日が日曜なら、その後の最初の祝日でない日が休みになる
  for (const date of [...holidays.keys()].sort()) {
    if (weekday(date) !== 0) continue;
    let substitute = addDays(date, 1);
    while (holidays.has(substitute)) substitute = addDays(substitute, 1);
    holidays.set(substitute, "振替休日");
  }

  holidayCache.set(year, holidays);
  return holidays;
}

export function holidayName(text) {
  return holidaysOf(Number(text.slice(0, 4))).get(text) ?? null;
}

// 土日祝で色分けするための種類
export function dayKind(text) {
  if (holidayName(text) || weekday(text) === 0) return "holiday";
  if (weekday(text) === 6) return "saturday";
  return "weekday";
}
