import { describe, expect, it } from "vitest";
import {
  addDays,
  dayKind,
  daysBetween,
  eachDay,
  formatDateRange,
  formatDays,
  formatShortDate,
  holidaysOf,
  isValidDate,
} from "./dates";

describe("日付の計算", () => {
  it("月末・年末・うるう年をまたいで日を足せる", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("日数の差と、期間の日付一覧を出す", () => {
    expect(daysBetween("2026-11-01", "2026-11-30")).toBe(29);
    expect(eachDay("2026-11-29", "2026-12-02")).toEqual(["2026-11-29", "2026-11-30", "2026-12-01", "2026-12-02"]);
    expect(eachDay("2026-11-02", "2026-11-01")).toEqual([]);
  });

  it("ありえない日付や形式の違う文字列は受け付けない", () => {
    expect(isValidDate("2026-02-28")).toBe(true);
    expect(isValidDate("2026-02-30")).toBe(false);
    expect(isValidDate("2026/02/01")).toBe(false);
    expect(isValidDate("")).toBe(false);
  });

  it("表示用に整える", () => {
    expect(formatShortDate("2026-11-14")).toBe("11/14(土)");
    expect(formatDateRange("2026-11-14", "2026-11-16")).toBe("11/14(土)〜11/16(月)");
    expect(formatDateRange("2026-11-14", "2026-11-14")).toBe("11/14(土)");
    expect(formatDays(1)).toBe("日帰り");
    expect(formatDays(3)).toBe("2泊3日");
  });
});

describe("日本の祝日", () => {
  // 内閣府「国民の祝日について」で公表されている日付
  it("2026年（シルバーウィークの国民の休日、こどもの日の振替休日を含む）", () => {
    expect([...holidaysOf(2026).keys()].sort()).toEqual([
      "2026-01-01", "2026-01-12", "2026-02-11", "2026-02-23", "2026-03-20",
      "2026-04-29", "2026-05-03", "2026-05-04", "2026-05-05", "2026-05-06",
      "2026-07-20", "2026-08-11", "2026-09-21", "2026-09-22", "2026-09-23",
      "2026-10-12", "2026-11-03", "2026-11-23",
    ]);
    expect(holidaysOf(2026).get("2026-09-22")).toBe("国民の休日");
    expect(holidaysOf(2026).get("2026-05-06")).toBe("振替休日");
  });

  it("2025年（日曜の祝日の振替休日を含む）", () => {
    expect([...holidaysOf(2025).keys()].sort()).toEqual([
      "2025-01-01", "2025-01-13", "2025-02-11", "2025-02-23", "2025-02-24",
      "2025-03-20", "2025-04-29", "2025-05-03", "2025-05-04", "2025-05-05",
      "2025-05-06", "2025-07-21", "2025-08-11", "2025-09-15", "2025-09-23",
      "2025-10-13", "2025-11-03", "2025-11-23", "2025-11-24",
    ]);
  });

  it("土曜・日曜祝日・平日を見分ける", () => {
    expect(dayKind("2026-11-14")).toBe("saturday");
    expect(dayKind("2026-11-15")).toBe("holiday"); // 日曜
    expect(dayKind("2026-11-23")).toBe("holiday"); // 勤労感謝の日（月曜）
    expect(dayKind("2026-11-24")).toBe("weekday");
  });
});
