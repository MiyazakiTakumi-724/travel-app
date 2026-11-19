import { beforeEach, describe, expect, it, vi } from "vitest";

// ログイン状態・DB・キャッシュ更新をテスト用の偽物に差し替える
const session = { current: null };
vi.mock("@/auth", () => ({ auth: async () => session.current }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
// ゲストの Cookie（復帰用コード）。テストごとに入れ替える
const guestCookies = new Map();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name) => (guestCookies.has(name) ? { value: guestCookies.get(name) } : undefined) }),
}));

const db = {};
vi.mock("@/lib/prisma", () => {
  const matches = (row, where = {}) => Object.entries(where).every(([key, value]) => row[key] === value);
  // where: { 複合ユニーク名: { a, b } } の形を、ふつうの条件に直す
  const flatten = (where) => {
    const [key, value] = Object.entries(where)[0];
    return key.includes("_") && typeof value === "object" ? value : where;
  };
  let seq = 0;
  const table = (name) => ({
    findUnique: async ({ where }) => db[name].find((row) => matches(row, flatten(where))) ?? null,
    findFirst: async ({ where }) => db[name].find((row) => matches(row, where)) ?? null,
    update: async ({ where, data }) => Object.assign(db[name].find((row) => matches(row, where)), data),
    updateMany: async ({ where, data }) => db[name].filter((row) => matches(row, where)).forEach((row) => Object.assign(row, data)),
    upsert: async ({ where, create, update }) => {
      const found = db[name].find((row) => matches(row, flatten(where)));
      if (found) return Object.assign(found, update);
      const row = { id: `${name}-${++seq}`, ...create };
      db[name].push(row);
      return row;
    },
    deleteMany: async ({ where }) => {
      db[name] = db[name].filter((row) => !matches(row, where));
    },
    createMany: async ({ data }) => data.forEach((row) => db[name].push({ id: `${name}-${++seq}`, ...row })),
  });
  return {
    prisma: {
      project: {
        ...table("projects"),
        findUnique: async ({ where, include }) => {
          const project = db.projects.find((p) => p.id === where.id);
          if (!project) return null;
          return include?.participants
            ? { ...project, participants: db.participants.filter((p) => p.projectId === project.id) }
            : { ...project };
        },
      },
      participant: table("participants"),
      availableDay: table("availableDays"),
    },
  };
});

const {
  answerTentative,
  cancelTentative,
  proposeSchedule,
  reopenSchedule,
  replaceAvailability,
  setAvailable,
  submitAvailability,
  unsubmitAvailability,
} = await import("./scheduleActions");

const loginAs = (userId) => {
  session.current = userId ? { user: { id: userId } } : null;
};
const trip = () => db.projects[0];
const person = (id) => db.participants.find((p) => p.id === id);
const submitAll = () => db.participants.forEach((p) => (p.availabilitySubmitted = true));

beforeEach(() => {
  db.projects = [
    { id: "trip", days: 3, rangeStart: "2026-11-01", rangeEnd: "2026-11-30", startDate: "", endDate: "", tentativeStart: null },
  ];
  const member = (id, userId) => ({ id, projectId: "trip", userId, isOwner: id === "pOwner", availabilitySubmitted: false, tentativeAnswer: null });
  db.participants = [member("pOwner", "owner"), member("pMember", "member"), member("pThird", "third")];
  db.availableDays = [];
  loginAs("member");
});

describe("1. 行ける日を付けて提出する", () => {
  it("提出するまでは、自分の行ける日を付けたり外したりできる", async () => {
    expect(await setAvailable("trip", "2026-11-03", true)).toEqual({ ok: true });
    await setAvailable("trip", "2026-11-03", true); // 二重に付けても1件
    await setAvailable("trip", "2026-11-04", true);
    await setAvailable("trip", "2026-11-04", false);
    expect(db.availableDays.map((d) => [d.participantId, d.date])).toEqual([["pMember", "2026-11-03"]]);
  });

  it("期間の外の日や、メンバーでない人は付けられない", async () => {
    expect((await setAvailable("trip", "2026-12-01", true)).error).toBeDefined();
    loginAs("outsider");
    expect(await setAvailable("trip", "2026-11-03", true)).toEqual({ error: "このプロジェクトのメンバーではありません" });
    expect(db.availableDays).toEqual([]);
  });

  it("行ける日をまとめて置き換えられる（期間の外の日は入れない）", async () => {
    await setAvailable("trip", "2026-11-03", true);
    expect(await replaceAvailability("trip", ["2026-11-07", "2026-11-08", "2026-11-08", "2026-12-01", "bad"])).toEqual({ ok: true });
    expect(db.availableDays.map((d) => d.date)).toEqual(["2026-11-07", "2026-11-08"]);

    await replaceAvailability("trip", []);
    expect(db.availableDays).toEqual([]);
  });

  it("提出すると変えられなくなり、「修正する」で付け直せる", async () => {
    await submitAvailability("trip");
    expect(person("pMember").availabilitySubmitted).toBe(true);
    expect((await setAvailable("trip", "2026-11-03", true)).error).toContain("提出済み");
    expect((await replaceAvailability("trip", ["2026-11-03"])).error).toContain("提出済み");

    await unsubmitAvailability("trip");
    expect(await setAvailable("trip", "2026-11-03", true)).toEqual({ ok: true });
  });
});

describe("2. 作成者が仮決定する", () => {
  beforeEach(() => loginAs("owner"));

  it("提出していないメンバーがいるうちは、仮決定できない", async () => {
    person("pOwner").availabilitySubmitted = true;
    person("pMember").availabilitySubmitted = true;
    expect((await proposeSchedule("trip", "2026-11-14")).error).toBe("まだ行ける日を提出していないメンバーがいます");
    expect(trip().tentativeStart).toBeNull();
  });

  it("全員が提出したら仮決定でき、作成者は ○ と答えたことになる", async () => {
    submitAll();
    expect(await proposeSchedule("trip", "2026-11-14")).toEqual({ ok: true });
    expect(trip().tentativeStart).toBe("2026-11-14");
    expect(db.participants.map((p) => p.tentativeAnswer)).toEqual(["yes", null, null]);
  });

  it("期間からはみ出す日程は仮決定できない", async () => {
    submitAll();
    expect((await proposeSchedule("trip", "2026-11-29")).error).toBe("期間の中の日程を選んでください");
  });

  it("作成者以外は仮決定できない", async () => {
    submitAll();
    loginAs("member");
    expect((await proposeSchedule("trip", "2026-11-14")).error).toBe("この操作ができるのは作成者だけです");
  });

  it("仮決定したあとは、行ける日の提出を取り消せない", async () => {
    submitAll();
    await proposeSchedule("trip", "2026-11-14");
    loginAs("member");
    expect((await unsubmitAvailability("trip")).error).toContain("仮決定");
  });
});

describe("3. ○× で答えて、全員 ○ なら確定する", () => {
  beforeEach(async () => {
    submitAll();
    loginAs("owner");
    await proposeSchedule("trip", "2026-11-14");
  });

  it("全員が ○ になった時点で、自動で日程が確定する", async () => {
    loginAs("member");
    expect(await answerTentative("trip", "yes")).toEqual({ ok: true, confirmed: false });
    expect(trip().startDate).toBe("");

    loginAs("third");
    expect(await answerTentative("trip", "yes")).toEqual({ ok: true, confirmed: true });
    expect(trip()).toMatchObject({ startDate: "2026-11-14", endDate: "2026-11-16", tentativeStart: null });
  });

  it("× の人がいると確定しない。作成者は仮決定を取り消して選び直せる", async () => {
    loginAs("member");
    await answerTentative("trip", "no");
    loginAs("third");
    await answerTentative("trip", "yes");
    expect(trip().startDate).toBe("");

    loginAs("owner");
    await cancelTentative("trip");
    expect(trip().tentativeStart).toBeNull();
    expect(db.participants.every((p) => p.tentativeAnswer === null)).toBe(true);
    // 行ける日の提出はそのまま
    expect(db.participants.every((p) => p.availabilitySubmitted)).toBe(true);

    // 選び直すと、前の答えは消えている
    await proposeSchedule("trip", "2026-11-21");
    expect(db.participants.map((p) => p.tentativeAnswer)).toEqual(["yes", null, null]);
  });

  it("答えは ○ と × だけ。仮決定がないときは答えられない", async () => {
    loginAs("member");
    expect((await answerTentative("trip", "maybe")).error).toBeDefined();
    loginAs("owner");
    await cancelTentative("trip");
    loginAs("member");
    expect((await answerTentative("trip", "yes")).error).toContain("仮決定の日程がありません");
  });

  it("確定したあと、作成者は日程を選び直せる（行ける日の提出は残る）", async () => {
    for (const user of ["member", "third"]) {
      loginAs(user);
      await answerTentative("trip", "yes");
    }
    loginAs("owner");
    expect(await reopenSchedule("trip")).toEqual({ ok: true });
    expect(trip()).toMatchObject({ startDate: "", endDate: "", tentativeStart: null });
    expect(db.participants.every((p) => p.availabilitySubmitted && p.tentativeAnswer === null)).toBe(true);
  });
});

describe("メンバーが作成者だけのとき", () => {
  it("仮決定した時点で確定する", async () => {
    db.participants = [{ id: "pOwner", projectId: "trip", userId: "owner", isOwner: true, availabilitySubmitted: true, tentativeAnswer: null }];
    loginAs("owner");
    await proposeSchedule("trip", "2026-11-14");
    expect(trip()).toMatchObject({ startDate: "2026-11-14", endDate: "2026-11-16" });
  });
});
