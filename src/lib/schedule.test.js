import { describe, expect, it } from "vitest";
import { availableCount, bestCandidateId, findBestWindows, isValidDays, tallyVotes, tripEndDate } from "./schedule";

const participants = [
  { id: "a", unavailableDays: ["2026-11-02"] },
  { id: "b", unavailableDays: ["2026-11-05", "2026-11-06"] },
  { id: "c", unavailableDays: [] },
];

describe("findBestWindows", () => {
  it("期間内の開始日ごとに行けない人を数え、少ない順・日付順に並べる", () => {
    const windows = findBestWindows({ rangeStart: "2026-11-01", rangeEnd: "2026-11-07", days: 2, participants });

    // 開始日は 11/1〜11/6 の6通り（11/7 開始だと期間からはみ出す）
    expect(windows).toHaveLength(6);
    expect(windows.map((w) => [w.startDate, w.absentIds])).toEqual([
      ["2026-11-03", []],
      ["2026-11-01", ["a"]],
      ["2026-11-02", ["a"]],
      ["2026-11-04", ["b"]],
      ["2026-11-05", ["b"]],
      ["2026-11-06", ["b"]],
    ]);
    expect(windows[0].endDate).toBe("2026-11-04");
  });

  it("期間が旅行の日数より短い・未設定のときは空", () => {
    expect(findBestWindows({ rangeStart: "2026-11-01", rangeEnd: "2026-11-02", days: 3, participants })).toEqual([]);
    expect(findBestWindows({ rangeStart: null, rangeEnd: null, days: 3, participants })).toEqual([]);
  });

  it("日帰りなら期間の全日が候補になる", () => {
    const windows = findBestWindows({ rangeStart: "2026-11-01", rangeEnd: "2026-11-03", days: 1, participants });
    expect(windows.map((w) => w.startDate)).toEqual(["2026-11-01", "2026-11-03", "2026-11-02"]);
  });
});

describe("そのほか", () => {
  it("日数のチェックと終了日の計算", () => {
    expect(isValidDays(1)).toBe(true);
    expect(isValidDays(14)).toBe(true);
    expect(isValidDays(0)).toBe(false);
    expect(isValidDays(15)).toBe(false);
    expect(isValidDays(2.5)).toBe(false);
    expect(tripEndDate("2026-11-30", 3)).toBe("2026-12-02");
  });

  it("その日に行ける人数を数える", () => {
    expect(availableCount("2026-11-05", participants)).toBe(2);
    expect(availableCount("2026-11-04", participants)).toBe(3);
  });
});

describe("投票の集計", () => {
  const ids = ["a", "b", "c"];
  const candidates = [
    { id: "x", startDate: "2026-11-03", votes: [{ participantId: "a", answer: "yes" }, { participantId: "b", answer: "maybe" }] },
    { id: "y", startDate: "2026-11-01", votes: [{ participantId: "a", answer: "yes" }, { participantId: "c", answer: "yes" }, { participantId: "b", answer: "no" }] },
  ];

  it("○△×ごとの人と、まだ投票していない人を出す", () => {
    expect(tallyVotes(candidates[0], ids)).toEqual({
      byAnswer: { yes: ["a"], maybe: ["b"], no: [] },
      score: 3,
      notVoted: ["c"],
    });
  });

  it("メンバーから外れた人の投票は数えない", () => {
    expect(tallyVotes(candidates[1], ["a", "c"]).byAnswer.no).toEqual([]);
  });

  it("○=2点・△=1点でいちばん点数が高い候補を選ぶ", () => {
    expect(bestCandidateId(candidates, ids)).toBe("y");
  });

  it("誰も投票していなければ null", () => {
    expect(bestCandidateId([{ id: "z", startDate: "2026-11-01", votes: [] }], ids)).toBeNull();
  });
});
