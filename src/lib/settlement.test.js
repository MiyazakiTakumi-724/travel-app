import { describe, expect, it } from "vitest";
import { buildDisplayNames, calculateSettlements } from "./settlement";

const people = (...names) => names.map((name, index) => ({ id: `p${index + 1}`, name }));
const pay = (payerId, amount, isSettled = false) => ({ payerId, amount, isSettled });
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

  it("精算済みの支払いは計算に入れない", () => {
    const participants = people("あきら", "ゆうき");
    const payments = [pay("p1", 1000), pay("p2", 5000, true)];

    const { transfers } = calculateSettlements(participants, payments);

    expect(transfers).toEqual([{ from: "p2", to: "p1", amount: 500 }]);
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
