import { describe, expect, it } from "vitest";
import { buildDisplayNames, calculateSettlements, summarizeSettlement } from "./settlement";

const people = (...names) => names.map((name, index) => ({ id: `p${index + 1}`, name }));
const pay = (payerId, amount) => ({ payerId, amount });
const sum = (map) => [...map.values()].reduce((a, b) => a + b, 0);

describe("calculateSettlements", () => {
  it("README の例（4人で ¥76,000）を3回の送金で精算する", () => {
    const participants = people("あきら", "ゆうき", "はなこ", "じろう");
    const payments = [pay("p1", 40000), pay("p2", 30000), pay("p3", 6000)];

    const { transfers, balances } = calculateSettlements(participants, payments);

    expect(Object.fromEntries(balances)).toEqual({ p1: 21000, p2: 11000, p3: -13000, p4: -19000 });
    expect(transfers).toEqual([
      { from: "p4", to: "p1", amount: 19000 },
      { from: "p3", to: "p1", amount: 2000 },
      { from: "p3", to: "p2", amount: 11000 },
    ]);
  });

  it("同じニックネームの参加者がいても、IDごとに別人として計算する", () => {
    const participants = [
      { id: "a", name: "たろう" },
      { id: "b", name: "たろう" },
      { id: "c", name: "はなこ" },
    ];

    const { transfers, balances } = calculateSettlements(participants, [pay("a", 9000)]);

    expect(sum(balances)).toBe(0);
    expect(transfers).toEqual([
      { from: "b", to: "a", amount: 3000 },
      { from: "c", to: "a", amount: 3000 },
    ]);
  });

  it("全員が同じ額を払っていれば送金はない", () => {
    const participants = people("あきら", "ゆうき", "はなこ");
    const payments = [pay("p1", 3000), pay("p2", 3000), pay("p3", 3000)];

    expect(calculateSettlements(participants, payments).transfers).toEqual([]);
  });

  it("割り切れない金額でも、送金額は整数で合計が支払額と合う", () => {
    const participants = people("あきら", "ゆうき", "はなこ");

    const { transfers } = calculateSettlements(participants, [pay("p1", 1000)]);

    expect(transfers.every((t) => Number.isInteger(t.amount))).toBe(true);
    expect(transfers.map((t) => t.amount)).toEqual([333, 333]);
  });

  it("支払いがない・参加者がいないときは空を返す", () => {
    expect(calculateSettlements(people("あきら"), []).transfers).toEqual([]);
    expect(calculateSettlements([], [pay("p1", 1000)])).toEqual({ transfers: [], balances: new Map() });
  });

  it("どの組み合わせでも、収支の合計は0になり、送金で全員の収支が0になる", () => {
    const participants = people("A", "B", "C", "D", "E");
    const payments = [pay("p1", 12345), pay("p2", 678), pay("p3", 9000), pay("p1", 4321), pay("p5", 150)];

    const { transfers, balances } = calculateSettlements(participants, payments);

    expect(sum(balances)).toBeCloseTo(0, 6);
    const after = new Map(balances);
    for (const { from, to, amount } of transfers) {
      after.set(from, after.get(from) + amount);
      after.set(to, after.get(to) - amount);
    }
    // 送金額は四捨五入しているので、残りは1人あたり1円未満
    for (const rest of after.values()) expect(Math.abs(rest)).toBeLessThan(1);
    // 送金回数は「人数 − 1」以下
    expect(transfers.length).toBeLessThanOrEqual(participants.length - 1);
  });
});

describe("buildDisplayNames", () => {
  it("同じ名前の2人目以降に番号を付ける", () => {
    const names = buildDisplayNames([
      { id: "a", name: "たろう" },
      { id: "b", name: "はなこ" },
      { id: "c", name: "たろう" },
      { id: "d", name: "たろう" },
    ]);

    expect(Object.fromEntries(names)).toEqual({
      a: "たろう",
      b: "はなこ",
      c: "たろう（2）",
      d: "たろう（3）",
    });
  });
});

describe("summarizeSettlement", () => {
  it("支払いの件数・合計と、メンバーごとの払った額・負担額・収支を出す", () => {
    const participants = people("まさのり", "田中 太郎", "はなこ");
    const payments = [
      pay("p1", 24000),
      pay("p2", 9000),
      pay("p1", 4500),
      pay("p3", 6300),
    ];

    const summary = summarizeSettlement(participants, payments);

    expect(summary).toMatchObject({ count: 4, total: 43800, share: 14600 });
    expect(summary.rows).toEqual([
      { id: "p1", paid: 28500, share: 14600, balance: 13900 },
      { id: "p2", paid: 9000, share: 14600, balance: -5600 },
      { id: "p3", paid: 6300, share: 14600, balance: -8300 },
    ]);
    expect(summary.transfers).toEqual([
      { from: "p3", to: "p1", amount: 8300 },
      { from: "p2", to: "p1", amount: 5600 },
    ]);
  });

  it("支払いがなければ、すべて0で送金もない", () => {
    expect(summarizeSettlement(people("あきら", "ゆうき"), [])).toMatchObject({
      count: 0,
      total: 0,
      share: 0,
      transfers: [],
    });
  });
});
