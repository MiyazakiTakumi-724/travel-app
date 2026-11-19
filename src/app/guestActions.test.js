import { beforeEach, describe, expect, it, vi } from "vitest";

// Cookie・リクエストのヘッダー・DB・画面の移動を、テスト用の偽物に差し替える
const cookieJar = new Map();
const requestHeaders = new Map();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name) => (cookieJar.has(name) ? { value: cookieJar.get(name) } : undefined),
    set: (name, value) => cookieJar.set(name, value),
    delete: (name) => cookieJar.delete(name),
  }),
  headers: async () => ({ get: (name) => requestHeaders.get(name) ?? null }),
}));
vi.mock("next/navigation", () => ({
  redirect: (path) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { path });
  },
}));

const db = {};
vi.mock("@/lib/prisma", () => {
  const matches = (row, where = {}) =>
    Object.entries(where).every(([key, cond]) =>
      cond && typeof cond === "object" && "gte" in cond ? row[key] >= cond.gte : cond && typeof cond === "object" && "lt" in cond ? row[key] < cond.lt : row[key] === cond
    );
  let seq = 0;
  return {
    prisma: {
      project: { findUnique: async ({ where }) => db.projects.find((p) => p.id === where.id) ?? null },
      participant: {
        create: async ({ data }) => {
          const row = { id: `participant-${++seq}`, userId: null, guestCodeHash: null, ...data };
          db.participants.push(row);
          return row;
        },
        update: async ({ where, data }) => Object.assign(db.participants.find((p) => p.id === where.id), data),
        findUnique: async ({ where }) => db.participants.find((p) => matches(p, where)) ?? null,
      },
      guestCodeAttempt: {
        count: async ({ where }) => db.attempts.filter((a) => matches(a, where)).length,
        create: async ({ data }) => db.attempts.push({ createdAt: new Date(), ...data }),
        deleteMany: async ({ where }) => {
          db.attempts = db.attempts.filter((a) => !matches(a, where));
        },
      },
    },
  };
});

const { enterGuestCode, joinAsGuest } = await import("./guestActions");
const { guestCookieName, hashGuestCode, normalizeGuestCode } = await import("@/lib/guestCode");

const form = (values) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.append(key, value);
  return data;
};

beforeEach(() => {
  cookieJar.clear();
  requestHeaders.clear();
  requestHeaders.set("x-forwarded-for", "203.0.113.1");
  db.projects = [{ id: "trip", title: "沖縄旅行" }];
  db.participants = [];
  db.attempts = [];
});

describe("joinAsGuest", () => {
  it("ニックネームで参加すると、コードが発行され、ハッシュだけが保存され、Cookie も保存される", async () => {
    const result = await joinAsGuest("trip", form({ nickname: " たろう " }));

    expect(result).toMatchObject({ ok: true, projectId: "trip" });
    expect(result.code).toMatch(/^[2-9A-Z]{5}-[2-9A-Z]{5}$/);
    const [guest] = db.participants;
    expect(guest).toMatchObject({ name: "たろう", projectId: "trip", userId: null });
    expect(guest.guestCodeHash).toBe(hashGuestCode(normalizeGuestCode(result.code)));
    expect(JSON.stringify(db.participants)).not.toContain(result.code);
    expect(cookieJar.get(guestCookieName("trip"))).toBe(normalizeGuestCode(result.code));
  });

  it("ニックネームが空・長すぎる、プロジェクトがないときは参加できない", async () => {
    expect((await joinAsGuest("trip", form({ nickname: "  " }))).error).toBe("ニックネームを入力してください");
    expect((await joinAsGuest("trip", form({ nickname: "あ".repeat(21) }))).error).toContain("20文字以内");
    expect((await joinAsGuest("none", form({ nickname: "たろう" }))).error).toBe("プロジェクトが見つかりません");
    expect(db.participants).toEqual([]);
  });
});

describe("enterGuestCode", () => {
  let code;
  beforeEach(async () => {
    code = (await joinAsGuest("trip", form({ nickname: "たろう" }))).code;
    cookieJar.clear();
  });

  it("正しいコードなら Cookie を保存してプロジェクトへ移動する（小文字・ハイフンなしでもよい）", async () => {
    await expect(enterGuestCode(form({ code: code.toLowerCase().replace("-", "") }))).rejects.toMatchObject({ path: "/projects/trip" });
    expect(cookieJar.get(guestCookieName("trip"))).toBe(normalizeGuestCode(code));
  });

  it("違うコードでは戻れない", async () => {
    expect((await enterGuestCode(form({ code: "AAAAA-BBBBB" }))).error).toContain("コードが見つかりません");
    expect(cookieJar.size).toBe(0);
  });

  it("同じ端末から10回間違えると、正しいコードでもしばらく受け付けない（別の端末からは使える）", async () => {
    for (let i = 0; i < 10; i++) await enterGuestCode(form({ code: "AAAAA-BBBBB" }));
    expect((await enterGuestCode(form({ code }))).error).toContain("しばらく受け付けられません");

    requestHeaders.set("x-forwarded-for", "198.51.100.7");
    await expect(enterGuestCode(form({ code }))).rejects.toMatchObject({ path: "/projects/trip" });
  });

  it("IPアドレスはそのまま保存しない", async () => {
    await enterGuestCode(form({ code: "AAAAA-BBBBB" }));
    expect(JSON.stringify(db.attempts)).not.toContain("203.0.113.1");
  });
});
