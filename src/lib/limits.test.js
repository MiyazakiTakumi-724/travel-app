import { describe, expect, it } from "vitest";
import { isValidAmount, isWithinLength, LIMITS } from "./limits";

describe("isValidAmount", () => {
  it("1円〜1,000万円の整数を受け付ける", () => {
    expect(isValidAmount(1)).toBe(true);
    expect(isValidAmount(LIMITS.amount)).toBe(true);
  });

  it("0以下・上限超え・小数・数字でないものは受け付けない", () => {
    for (const amount of [0, -1, LIMITS.amount + 1, 1.5, NaN, Infinity]) {
      expect(isValidAmount(amount)).toBe(false);
    }
  });
});

describe("isWithinLength", () => {
  it("上限ちょうどまでは受け付ける", () => {
    expect(isWithinLength("あ".repeat(30), 30)).toBe(true);
    expect(isWithinLength("あ".repeat(31), 30)).toBe(false);
  });

  it("絵文字も1文字として数える", () => {
    expect(isWithinLength("🍣".repeat(3), 3)).toBe(true);
  });

  it("空や未入力は0文字として扱う", () => {
    expect(isWithinLength("", 5)).toBe(true);
    expect(isWithinLength(undefined, 5)).toBe(true);
  });
});
