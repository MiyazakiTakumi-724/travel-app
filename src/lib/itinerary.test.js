import { describe, expect, it } from "vitest";
import { groupByDay, isValidTime } from "./itinerary";

describe("isValidTime", () => {
  it("HH:MM か空を受け付ける", () => {
    expect(isValidTime("09:00")).toBe(true);
    expect(isValidTime("23:59")).toBe(true);
    expect(isValidTime("")).toBe(true);
  });

  it("ありえない時刻や形式の違う文字列は受け付けない", () => {
    for (const time of ["24:00", "12:60", "9:00", "0900", "abc", undefined]) {
      expect(isValidTime(time)).toBe(false);
    }
  });
});

describe("groupByDay", () => {
  const items = [
    { id: "lunch", dayIndex: 1, time: "12:00", text: "昼食", createdAt: "2026-11-01T00:00:03Z" },
    { id: "memo", dayIndex: 1, time: "", text: "雨なら美術館", createdAt: "2026-11-01T00:00:01Z" },
    { id: "meet", dayIndex: 1, time: "09:00", text: "京都駅集合", createdAt: "2026-11-01T00:00:02Z" },
    { id: "memo2", dayIndex: 1, time: "", text: "お土産", createdAt: "2026-11-01T00:00:04Z" },
    { id: "back", dayIndex: 2, time: "17:00", text: "帰りの新幹線", createdAt: "2026-11-01T00:00:05Z" },
    { id: "old", dayIndex: 4, time: "", text: "日数を減らす前の予定", createdAt: "2026-11-01T00:00:06Z" },
  ];

  it("日ごとにまとめ、時刻の早い順・時刻なしは最後に追加した順で並べる", () => {
    const days = groupByDay(items, { days: 3, startDate: "2026-11-30" });

    expect(days.map((d) => [d.dayIndex, d.date, d.items.map((i) => i.id)])).toEqual([
      [1, "2026-11-30", ["meet", "lunch", "memo", "memo2"]],
      [2, "2026-12-01", ["back"]],
      [3, "2026-12-02", []],
    ]);
  });

  it("日程が決まっていなければ日付は付けない", () => {
    expect(groupByDay([], { days: 2, startDate: "" }).map((d) => d.date)).toEqual([null, null]);
  });
});
