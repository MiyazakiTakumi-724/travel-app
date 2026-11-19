import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { generateGuestCode, hashGuestCode, legacyHashGuestCode, normalizeGuestCode } from "./guestCode";

describe("generateGuestCode", () => {
  it("5文字-5文字の形で、読み間違えやすい文字を使わない", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateGuestCode();
      expect(code).toMatch(/^[2-9A-HJKMNP-Z]{5}-[2-9A-HJKMNP-Z]{5}$/);
      expect(code).not.toMatch(/[01OIL]/);
    }
  });

  it("毎回ちがうコードになる", () => {
    const codes = new Set(Array.from({ length: 500 }, generateGuestCode));
    expect(codes.size).toBe(500);
  });
});

describe("normalizeGuestCode", () => {
  it("小文字・空白・ハイフンがあっても、同じコードとして読む", () => {
    expect(normalizeGuestCode("k7qm3-xrp4n")).toBe("K7QM3XRP4N");
    expect(normalizeGuestCode(" K7QM3 XRP4N ")).toBe("K7QM3XRP4N");
  });

  it("長さが違う・使わない文字が入っているときは null", () => {
    expect(normalizeGuestCode("K7QM3-XRP4")).toBeNull();
    expect(normalizeGuestCode("K7QM3-XRP40")).toBeNull(); // 0 は使わない
    expect(normalizeGuestCode("")).toBeNull();
    expect(normalizeGuestCode(undefined)).toBeNull();
  });
});

describe("hashGuestCode", () => {
  it("同じコードは同じハッシュになり、コードそのものは含まない", () => {
    const hash = hashGuestCode("K7QM3XRP4N");
    expect(hash).toBe(hashGuestCode("K7QM3XRP4N"));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain("K7QM3");
  });

  it("サーバーの鍵を使うので、鍵なしの SHA-256 とは違う値になり、鍵が変わると値も変わる", () => {
    const hash = hashGuestCode("K7QM3XRP4N");
    expect(hash).not.toBe(createHash("sha256").update("K7QM3XRP4N").digest("hex"));
    expect(legacyHashGuestCode("K7QM3XRP4N")).toBe(createHash("sha256").update("K7QM3XRP4N").digest("hex"));

    vi.stubEnv("AUTH_SECRET", "another-secret");
    expect(hashGuestCode("K7QM3XRP4N")).not.toBe(hash);
    vi.unstubAllEnvs();
  });

  it("鍵が設定されていなければ、ハッシュを作らずにエラーにする", () => {
    vi.stubEnv("AUTH_SECRET", "");
    expect(() => hashGuestCode("K7QM3XRP4N")).toThrow();
    vi.unstubAllEnvs();
  });
});
