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
// ログイン状態（Googleでログインした人）。テストごとに入れ替える
const session = { current: null };
vi.mock("@/auth", () => ({ auth: async () => session.current, signIn: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
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
      project: {
        findUnique: async ({ where }) => db.projects.find((p) => p.id === where.id) ?? null,
        create: async ({ data }) => {
          const { participants, ...fields } = data;
          const project = { id: `project-${++seq}`, ...fields };
          db.projects.push(project);
          const created = participants.create.map((p) => {
            const row = { id: `participant-${++seq}`, userId: null, guestCodeHash: null, projectId: project.id, ...p };
            db.participants.push(row);
            return row;
          });
          return { ...project, participants: created };
        },
      },
      participant: {
        create: async ({ data }) => {
          const row = { id: `participant-${++seq}`, userId: null, guestCodeHash: null, ...data };
          db.participants.push(row);
          return row;
        },
        update: async ({ where, data }) => Object.assign(db.participants.find((p) => p.id === where.id), data),
        findUnique: async ({ where }) => db.participants.find((p) => matches(p, where)) ?? null,
        findFirst: async ({ where }) => db.participants.find((p) => matches(p, where)) ?? null,
      },
      user: {
        findUnique: async ({ where }) => db.users.find((u) => u.id === where.id) ?? null,
        update: async ({ where, data }) => Object.assign(db.users.find((u) => u.id === where.id), data),
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

const { createGuestProject, enterGuestCode, joinAsGuest, reissueGuestCode } = await import("./guestActions");
const { claimGuestParticipant, issueGuestCode } = await import("@/lib/guestSession");
const { formatGuestCode, guestCookieName, hashGuestCode, legacyHashGuestCode, normalizeGuestCode } = await import("@/lib/guestCode");

const form = (values) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.append(key, value);
  return data;
};

// 参加・作成に成功すると、復帰用コードの画面へ移動する。移動先と、Cookie に保存されたコードを返す
const followRedirect = async (promise) => {
  const err = await promise.then(
    () => null,
    (e) => e
  );
  expect(err?.message).toBe("NEXT_REDIRECT");
  const projectId = err.path.match(/^\/projects\/([^/]+)\/welcome/)[1];
  return { path: err.path, projectId, code: formatGuestCode(cookieJar.get(guestCookieName(projectId))) };
};
const joinGuest = (projectId, nickname) => followRedirect(joinAsGuest(projectId, form({ nickname })));
const createGuest = (values) => followRedirect(createGuestProject(form(values)));

beforeEach(() => {
  cookieJar.clear();
  requestHeaders.clear();
  requestHeaders.set("x-forwarded-for", "203.0.113.1");
  db.projects = [{ id: "trip", title: "沖縄旅行" }];
  db.participants = [];
  db.attempts = [];
  db.users = [];
  session.current = null;
});

describe("joinAsGuest", () => {
  it("ニックネームで参加すると、コードが発行され、ハッシュだけが保存され、Cookie も保存されて、コードの画面へ移動する", async () => {
    const result = await joinGuest("trip", " たろう ");

    expect(result.path).toBe("/projects/trip/welcome");
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
    code = (await joinGuest("trip", "たろう")).code;
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

  it("以前の形式（鍵なし）で保存されたコードでも戻れ、そのとき新しい形式に置き換わる", async () => {
    const guest = db.participants.find((p) => p.name === "たろう");
    guest.guestCodeHash = legacyHashGuestCode(normalizeGuestCode(code));

    await expect(enterGuestCode(form({ code }))).rejects.toMatchObject({ path: "/projects/trip" });
    expect(guest.guestCodeHash).toBe(hashGuestCode(normalizeGuestCode(code)));
  });

  it("IPアドレスはそのまま保存しない", async () => {
    await enterGuestCode(form({ code: "AAAAA-BBBBB" }));
    expect(JSON.stringify(db.attempts)).not.toContain("203.0.113.1");
  });
});

describe("createGuestProject", () => {
  it("ゲストのままプロジェクトを作ると、作った人が作成者になり、コードが発行される", async () => {
    const result = await createGuest({ nickname: "はなこ", title: "温泉旅行", destination: "箱根" });

    expect(result.path).toBe(`/projects/${result.projectId}/welcome?created=1`);
    const project = db.projects.find((p) => p.id === result.projectId);
    expect(project).toMatchObject({ title: "温泉旅行", destination: "箱根" });
    const owner = db.participants.find((p) => p.projectId === result.projectId);
    expect(owner).toMatchObject({ name: "はなこ", isOwner: true, userId: null });
    expect(owner.guestCodeHash).toBe(hashGuestCode(normalizeGuestCode(result.code)));
    expect(cookieJar.get(guestCookieName(result.projectId))).toBe(normalizeGuestCode(result.code));
  });

  it("ニックネームやタイトルがおかしいときは作らない", async () => {
    expect((await createGuestProject(form({ nickname: "", title: "温泉旅行" }))).error).toBe("ニックネームを入力してください");
    expect((await createGuestProject(form({ nickname: "はなこ", title: "あ".repeat(31) }))).error).toContain("30文字以内");
    expect(db.projects).toHaveLength(1);
  });

  it("同じ端末からは、1時間に10件までしか作れない（別の端末からは作れる）", async () => {
    for (let i = 0; i < 10; i++) await createGuest({ nickname: "はなこ", title: `旅行${i}` });
    expect((await createGuestProject(form({ nickname: "はなこ", title: "11件目" }))).error).toContain("しばらく作れません");
    expect(db.projects).toHaveLength(11);

    requestHeaders.set("x-forwarded-for", "198.51.100.7");
    await createGuest({ nickname: "はなこ", title: "別の端末" });
    expect(db.projects).toHaveLength(12);
  });
});

describe("reissueGuestCode", () => {
  let guest;
  let owner;
  beforeEach(async () => {
    const created = await createGuest({ nickname: "はなこ", title: "温泉旅行" });
    owner = db.participants.find((p) => p.projectId === created.projectId);
    const joined = await joinGuest(created.projectId, "たろう");
    guest = db.participants.find((p) => p.name === "たろう");
    guest.code = joined.code;
  });

  it("ゲスト本人は自分のコードを発行し直せ、前のコードは使えなくなる", async () => {
    const result = await reissueGuestCode(guest.projectId, guest.id);
    expect(result).toMatchObject({ ok: true, name: "たろう" });
    expect(result.code).not.toBe(guest.code);
    expect(guest.guestCodeHash).toBe(hashGuestCode(normalizeGuestCode(result.code)));
    expect((await enterGuestCode(form({ code: guest.code }))).error).toContain("コードが見つかりません");
  });

  it("作成者は、ほかのゲストのコードを発行し直せる", async () => {
    // 作成者として操作する（このブラウザの Cookie を、作成者のコードに切り替える）
    const ownerCode = await issueGuestCode(owner.id);
    cookieJar.set(guestCookieName(owner.projectId), normalizeGuestCode(ownerCode));
    expect((await reissueGuestCode(owner.projectId, guest.id)).ok).toBe(true);
  });

  it("作成者でないゲストは、ほかの人のコードを発行し直せない", async () => {
    expect((await reissueGuestCode(owner.projectId, owner.id)).error).toBeDefined();
  });
});

describe("claimGuestParticipant（Google アカウントへの引き継ぎ）", () => {
  let guest;
  let code;
  beforeEach(async () => {
    code = (await joinGuest("trip", "たろう")).code;
    guest = db.participants.find((p) => p.name === "たろう");
    db.users = [{ id: "u1", nickname: null }];
  });

  it("ゲストの参加者に Google のユーザーを結びつけ、コードを消す（ニックネームも引き継ぐ）", async () => {
    expect(await claimGuestParticipant({ projectId: "trip", userId: "u1", code })).toBe("done");
    expect(guest).toMatchObject({ userId: "u1", guestCodeHash: null });
    expect(db.users[0].nickname).toBe("たろう");
  });

  it("そのアカウントで、すでにこのプロジェクトに参加していたら引き継がない", async () => {
    db.participants.push({ id: "pU1", projectId: "trip", userId: "u1", name: "まさのり" });
    expect(await claimGuestParticipant({ projectId: "trip", userId: "u1", code })).toBe("conflict");
    expect(guest.userId).toBeNull();
  });

  it("コードがない・違うプロジェクトのコードのときは何もしない", async () => {
    expect(await claimGuestParticipant({ projectId: "trip", userId: "u1", code: undefined })).toBe("none");
    expect(await claimGuestParticipant({ projectId: "other", userId: "u1", code })).toBe("none");
    expect(guest.userId).toBeNull();
  });
});
