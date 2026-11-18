import { beforeEach, describe, expect, it, vi } from "vitest";

// ログイン状態・DB・キャッシュ更新をテスト用の偽物に差し替える
const session = { current: null };
vi.mock("@/auth", () => ({ auth: async () => session.current }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

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
      unavailableDay: table("unavailableDays"),
      scheduleCandidate: table("candidates"),
      scheduleVote: table("votes"),
    },
  };
});

const {
  addCandidate,
  decideSchedule,
  deleteCandidate,
  reopenSchedule,
  setScheduleRange,
  setUnavailable,
  voteCandidate,
} = await import("./scheduleActions");

const loginAs = (userId) => {
  session.current = userId ? { user: { id: userId } } : null;
};

beforeEach(() => {
  db.projects = [
    { id: "trip", ownerId: "owner", days: 3, rangeStart: "2026-11-01", rangeEnd: "2026-11-30", startDate: "", endDate: "" },
    { id: "other", ownerId: "outsider", days: 2, rangeStart: null, rangeEnd: null, startDate: "", endDate: "" },
  ];
  db.participants = [
    { id: "pOwner", projectId: "trip", userId: "owner" },
    { id: "pMember", projectId: "trip", userId: "member" },
    { id: "pOther", projectId: "other", userId: "outsider" },
  ];
  db.unavailableDays = [];
  db.candidates = [{ id: "c1", projectId: "trip", startDate: "2026-11-14" }];
  db.votes = [];
  loginAs("member");
});

describe("setScheduleRange", () => {
  beforeEach(() => loginAs("owner"));

  it("作成者は期間を決められる", async () => {
    expect(await setScheduleRange("trip", "2026-12-01", "2026-12-31")).toEqual({ ok: true });
    expect(db.projects[0]).toMatchObject({ rangeStart: "2026-12-01", rangeEnd: "2026-12-31" });
  });

  it("3か月を超える期間・逆向きの期間・旅行の日数より短い期間は受け付けない", async () => {
    expect((await setScheduleRange("trip", "2026-11-01", "2027-03-01")).error).toContain("92日以内");
    expect((await setScheduleRange("trip", "2026-11-10", "2026-11-01")).error).toContain("後にして");
    expect((await setScheduleRange("trip", "2026-11-01", "2026-11-02")).error).toContain("旅行の日数より短く");
    expect((await setScheduleRange("trip", "2026-11-01", "2026-13-01")).error).toBeDefined();
  });

  it("作成者以外は決められない", async () => {
    loginAs("member");
    expect(await setScheduleRange("trip", "2026-12-01", "2026-12-31")).toEqual({ error: "この操作ができるのは作成者だけです" });
  });
});

describe("setUnavailable", () => {
  it("自分の行けない日を付けて、外せる", async () => {
    expect(await setUnavailable("trip", "2026-11-03", true)).toEqual({ ok: true });
    expect(await setUnavailable("trip", "2026-11-03", true)).toEqual({ ok: true }); // 二重に付けても1件
    expect(db.unavailableDays).toEqual([expect.objectContaining({ participantId: "pMember", date: "2026-11-03" })]);

    await setUnavailable("trip", "2026-11-03", false);
    expect(db.unavailableDays).toEqual([]);
  });

  it("期間の外の日や、メンバーでない人は付けられない", async () => {
    expect((await setUnavailable("trip", "2026-12-01", true)).error).toBeDefined();
    loginAs("outsider");
    expect(await setUnavailable("trip", "2026-11-03", true)).toEqual({ error: "このプロジェクトのメンバーではありません" });
    expect(db.unavailableDays).toEqual([]);
  });
});

describe("候補と投票", () => {
  it("作成者は候補を追加・削除できる（同じ開始日は1つだけ）", async () => {
    loginAs("owner");
    await addCandidate("trip", "2026-11-21");
    await addCandidate("trip", "2026-11-21");
    expect(db.candidates.map((c) => c.startDate)).toEqual(["2026-11-14", "2026-11-21"]);

    await deleteCandidate("trip", "c1");
    expect(db.candidates.map((c) => c.startDate)).toEqual(["2026-11-21"]);
  });

  it("作成者以外は候補を追加できない", async () => {
    expect((await addCandidate("trip", "2026-11-21")).error).toBe("この操作ができるのは作成者だけです");
  });

  it("メンバーは○△×で投票でき、もう一度投票すると上書きになる", async () => {
    expect(await voteCandidate("trip", "c1", "yes")).toEqual({ ok: true });
    await voteCandidate("trip", "c1", "maybe");
    expect(db.votes).toEqual([expect.objectContaining({ candidateId: "c1", participantId: "pMember", answer: "maybe" })]);
  });

  it("おかしな答えや、ほかのプロジェクトの候補には投票できない", async () => {
    expect((await voteCandidate("trip", "c1", "great")).error).toBeDefined();
    db.candidates.push({ id: "cx", projectId: "other", startDate: "2026-11-01" });
    expect((await voteCandidate("trip", "cx", "yes")).error).toContain("候補が見つかりません");
    expect(db.votes).toEqual([]);
  });
});

describe("日程の確定と取り消し", () => {
  it("作成者が候補を選ぶと、旅行の日数から終了日まで決まる", async () => {
    loginAs("owner");
    expect(await decideSchedule("trip", "c1")).toEqual({ ok: true });
    expect(db.projects[0]).toMatchObject({ startDate: "2026-11-14", endDate: "2026-11-16" });

    expect(await reopenSchedule("trip")).toEqual({ ok: true });
    expect(db.projects[0]).toMatchObject({ startDate: "", endDate: "", days: 3 });
  });

  it("作成者以外は確定できない", async () => {
    expect((await decideSchedule("trip", "c1")).error).toBe("この操作ができるのは作成者だけです");
    expect(db.projects[0].startDate).toBe("");
  });

  it("日数のない古いプロジェクトは、決まっていた日程から日数を出して日程調整に戻す", async () => {
    loginAs("owner");
    Object.assign(db.projects[0], { days: null, startDate: "2026-08-10", endDate: "2026-08-13" });
    await reopenSchedule("trip");
    expect(db.projects[0]).toMatchObject({ startDate: "", days: 4 });
  });
});
