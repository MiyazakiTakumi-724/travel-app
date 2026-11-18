import { describe, expect, it } from "vitest";
import { applyPaymentChange, initialMemoChoice, OTHER } from "./payments";
import { splitAmount } from "./split";
import { formatPeriod, formatSignedYen, formatTripPeriod, formatYen } from "./format";

describe("splitAmount", () => {
  it("割り切れるときは均等に分ける", () => {
    expect(splitAmount(9000, 2)).toEqual([4500, 4500]);
  });

  it("端数は先頭から1円ずつ乗せ、合計は元の金額と同じ", () => {
    const amounts = splitAmount(1000, 3);
    expect(amounts).toEqual([334, 333, 333]);
    expect(amounts.reduce((a, b) => a + b, 0)).toBe(1000);
  });

  it("1人なら全額", () => {
    expect(splitAmount(1234, 1)).toEqual([1234]);
  });
});

describe("initialMemoChoice", () => {
  it("候補にある内容はそのチップを選ぶ", () => {
    expect(initialMemoChoice("宿")).toBe("宿");
  });

  it("候補にない内容は「その他」にする", () => {
    expect(initialMemoChoice("レンタカー")).toBe(OTHER);
  });

  it("内容が空なら何も選ばない", () => {
    expect(initialMemoChoice("")).toBeNull();
    expect(initialMemoChoice(undefined)).toBeNull();
  });
});

describe("applyPaymentChange", () => {
  const payments = [
    { id: "a", amount: 100, createdAt: "2026-01-01T00:00:00Z" },
    { id: "b", amount: 200, createdAt: "2026-01-02T00:00:00Z" },
    { id: "c", amount: 300, createdAt: "2026-01-03T00:00:00Z" },
  ];

  it("add は末尾に足す", () => {
    const result = applyPaymentChange(payments, { type: "add", payments: [{ id: "d" }] });
    expect(result.map((p) => p.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("edit は対象だけ書き換える", () => {
    const result = applyPaymentChange(payments, { type: "edit", id: "b", changes: { amount: 999 } });
    expect(result.map((p) => p.amount)).toEqual([100, 999, 300]);
  });

  it("delete は対象を消す", () => {
    const result = applyPaymentChange(payments, { type: "delete", id: "b" });
    expect(result.map((p) => p.id)).toEqual(["a", "c"]);
  });

  it("restore は作成日時の位置に戻す", () => {
    const deleted = applyPaymentChange(payments, { type: "delete", id: "b" });
    const result = applyPaymentChange(deleted, { type: "restore", payment: payments[1] });
    expect(result.map((p) => p.id)).toEqual(["a", "b", "c"]);
  });

  it("元の配列は書き換えない", () => {
    applyPaymentChange(payments, { type: "delete", id: "a" });
    expect(payments).toHaveLength(3);
  });
});

describe("format", () => {
  it("金額を円表記にする", () => {
    expect(formatYen(1234567)).toBe("¥1,234,567");
    expect(formatSignedYen(500)).toBe("+¥500");
    expect(formatSignedYen(-500)).toBe("-¥500");
    expect(formatSignedYen(0)).toBe("¥0");
  });

  it("期間を表示する", () => {
    expect(formatPeriod("2026-12-29", "2026-12-30")).toBe("2026-12-29 〜 2026-12-30");
    expect(formatPeriod("2026-12-29", "")).toBe("2026-12-29 〜 未定");
    expect(formatPeriod("", "")).toBe("日程未定");
  });

  it("日程調整中のプロジェクトは日数を添える", () => {
    expect(formatTripPeriod({ startDate: "2026-12-29", endDate: "2026-12-30", days: 2 })).toBe("2026-12-29 〜 2026-12-30");
    expect(formatTripPeriod({ startDate: "", endDate: "", days: 3 })).toBe("日程調整中（2泊3日）");
    expect(formatTripPeriod({ startDate: "", endDate: "", days: null })).toBe("日程未定");
  });
});
