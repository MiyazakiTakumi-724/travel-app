import { beforeEach, describe, expect, it, vi } from "vitest";

// ログイン状態・Cookie・画面の移動・DB を、テスト用の偽物に差し替える
const session = { current: null };
vi.mock("@/auth", () => ({ auth: async () => session.current, signOut: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (path) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { path });
  },
}));
const cookieJar = new Map();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name) => (cookieJar.has(name) ? { value: cookieJar.get(name) } : undefined),
    getAll: () => [...cookieJar].map(([name, value]) => ({ name, value })),
    delete: (name) => cookieJar.delete(name),
  }),
}));

const db = {};
vi.mock("@/lib/prisma", () => {
  const byProject = (projectId) => db.participants.filter((p) => p.projectId === projectId);
  const prisma = {
    project: {
      findUnique: async ({ where }) => {
        const project = db.projects.find((p) => p.id === where.id);
        return project ? { ...project, participants: byProject(project.id) } : null;
      },
      update: async ({ where, data }) => Object.assign(db.projects.find((p) => p.id === where.id), data),
      // プロジェクトを消すと、参加者と支払いも一緒に消える（DB の onDelete: Cascade と同じ）
      delete: async ({ where }) => {
        db.projects = db.projects.filter((p) => p.id !== where.id);
        db.participants = db.participants.filter((p) => p.projectId !== where.id);
        db.payments = db.payments.filter((p) => p.projectId !== where.id);
      },
    },
    participant: {
      findMany: async ({ where }) =>
        db.participants
          .filter((p) => p.userId === where.userId)
          .map((p) => ({
            ...p,
            project: { ...db.projects.find((project) => project.id === p.projectId), participants: byProject(p.projectId) },
            _count: { payments: db.payments.filter((payment) => payment.payerId === p.id).length },
          })),
      update: async ({ where, data }) => Object.assign(db.participants.find((p) => p.id === where.id), data),
      delete: async ({ where }) => {
        db.participants = db.participants.filter((p) => p.id !== where.id);
      },
    },
    user: {
      delete: async ({ where }) => {
        db.users = db.users.filter((u) => u.id !== where.id);
      },
    },
    $transaction: async (run) => run(prisma),
  };
  return { prisma };
});

const { deleteAccount } = await import("./actions");

const member = (id, projectId, fields = {}) => ({
  id,
  name: id,
  projectId,
  userId: null,
  isOwner: false,
  retired: false,
  guestCodeHash: `hash-${id}`,
  availabilitySubmitted: false,
  tentativeAnswer: null,
  ...fields,
});

beforeEach(() => {
  cookieJar.clear();
  db.users = [{ id: "u1" }, { id: "u2" }];
  db.projects = [
    { id: "alone", title: "ひとり旅", startDate: "", endDate: "" },
    { id: "trip", title: "沖縄旅行", startDate: "", endDate: "" },
    { id: "camp", title: "キャンプ", startDate: "", endDate: "" },
  ];
  db.participants = [
    // ひとりだけのプロジェクト
    member("a1", "alone", { userId: "u1", isOwner: true, guestCodeHash: null }),
    // 幹事が自分だけで、支払いの記録があるプロジェクト
    member("t1", "trip", { userId: "u1", isOwner: true, guestCodeHash: null }),
    member("t2", "trip"),
    member("t3", "trip"),
    // 幹事ではなく、支払いの記録もないプロジェクト
    member("c1", "camp", { userId: "u2", isOwner: true, guestCodeHash: null }),
    member("c2", "camp", { userId: "u1", guestCodeHash: null }),
  ];
  db.payments = [{ id: "pay1", payerId: "t1", amount: 9000, projectId: "trip" }];
  session.current = { user: { id: "u1" } };
  cookieJar.set("authjs.session-token", "token");
  cookieJar.set("guest_other", "K7QM3XRP4N");
});

const deleteAndFollow = async () => {
  const error = await deleteAccount().then(
    () => null,
    (e) => e
  );
  expect(error?.path).toBe("/?deleted=1");
};

describe("deleteAccount（アカウントの削除）", () => {
  it("ほかに使っている人がいないプロジェクトは、まるごと消す", async () => {
    await deleteAndFollow();
    expect(db.projects.map((p) => p.id)).not.toContain("alone");
  });

  it("支払いの記録があれば、ニックネームと記録を「退会済み」として残し、幹事はほかのメンバーに引き継ぐ", async () => {
    await deleteAndFollow();
    expect(db.participants.find((p) => p.id === "t1")).toMatchObject({ userId: null, isOwner: false, retired: true });
    expect(db.payments).toHaveLength(1);
    // いちばん前から参加しているメンバーが幹事になる
    expect(db.participants.find((p) => p.id === "t2").isOwner).toBe(true);
    expect(db.participants.find((p) => p.id === "t3").isOwner).toBe(false);
  });

  it("支払いの記録がなければ、メンバーから外れる（ほかの人の幹事はそのまま）", async () => {
    await deleteAndFollow();
    expect(db.participants.map((p) => p.id)).not.toContain("c2");
    expect(db.participants.find((p) => p.id === "c1").isOwner).toBe(true);
  });

  it("ユーザーを消し、ログインとゲストの Cookie も消す", async () => {
    await deleteAndFollow();
    expect(db.users.map((u) => u.id)).toEqual(["u2"]);
    expect(cookieJar.size).toBe(0);
  });

  it("ログインしていなければ何もしない", async () => {
    session.current = null;
    expect(await deleteAccount()).toEqual({ error: "ログインし直してください" });
    expect(db.users).toHaveLength(2);
  });
});
