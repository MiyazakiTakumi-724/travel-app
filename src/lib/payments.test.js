import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyPaymentChange, filterPayments } from "./payments";
import { formatPeriod, formatSignedYen, formatTripPeriod, formatYen } from "./format";

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

  // 「今年」で表示が変わるので、日付を 2026年11月19日 に固定する
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-19T12:00:00+09:00"));
  });
  afterEach(() => vi.useRealTimers());

  it("期間を「12/29(火)〜12/30(水)」の形で表示し、今年でなければ年を付ける", () => {
    expect(formatPeriod("2026-12-29", "2026-12-30")).toBe("12/29(火)〜12/30(水)");
    expect(formatPeriod("2026-12-30", "2027-01-02")).toBe("12/30(水)〜2027/1/2(土)");
    expect(formatPeriod("2027-01-02", "2027-01-03")).toBe("2027/1/2(土)〜1/3(日)");
    expect(formatPeriod("2026-12-29", "")).toBe("12/29(火)〜未定");
    expect(formatPeriod("", "")).toBe("日程未定");
  });

  it("日程調整中のプロジェクトは日数を添える", () => {
    expect(formatTripPeriod({ startDate: "2026-12-29", endDate: "2026-12-30", days: 2 })).toBe("12/29(火)〜12/30(水)");
    expect(formatTripPeriod({ startDate: "", endDate: "", days: 3 })).toBe("日程調整中（2泊3日）");
    expect(formatTripPeriod({ startDate: "", endDate: "", days: null })).toBe("日程未定");
    expect(formatTripPeriod({ startDate: "", endDate: "", days: 3, tentativeStart: "2026-11-14" })).toBe("仮決定 11/14(土)〜11/16(月)");
  });
});

describe("filterPayments", () => {
  const payments = [
    { id: "a", payerId: "p1" },
    { id: "b", payerId: "p2" },
    { id: "c", payerId: "p1" },
  ];
  const ids = (list) => list.map((p) => p.id);

  it("条件がなければ全部", () => {
    expect(ids(filterPayments(payments))).toEqual(["a", "b", "c"]);
  });

  it("支払った人で絞り込める（複数人も選べる）", () => {
    expect(ids(filterPayments(payments, { payerIds: ["p1"] }))).toEqual(["a", "c"]);
    expect(ids(filterPayments(payments, { payerIds: ["p1", "p2"] }))).toEqual(["a", "b", "c"]);
    expect(ids(filterPayments(payments, { payerIds: ["p3"] }))).toEqual([]);
    expect(ids(filterPayments(payments, { payerIds: [] }))).toEqual(["a", "b", "c"]);
  });
});
