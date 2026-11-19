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
  let seq = 0;
  return {
    prisma: {
      project: {
        findUnique: async ({ where, include }) => {
          const project = db.projects.find((p) => p.id === where.id);
          if (!project) return null;
          return include?.participants
            ? { ...project, participants: db.participants.filter((p) => p.projectId === project.id) }
            : { ...project };
        },
      },
      participant: {
        findFirst: async ({ where }) => db.participants.find((row) => matches(row, where)) ?? null,
        findUnique: async ({ where }) => db.participants.find((row) => matches(row, where)) ?? null,
      },
      itineraryItem: {
        create: async ({ data }) => db.items.push({ id: `item-${++seq}`, ...data }),
        updateMany: async ({ where, data }) => db.items.filter((row) => matches(row, where)).forEach((row) => Object.assign(row, data)),
        deleteMany: async ({ where }) => {
          db.items = db.items.filter((row) => !matches(row, where));
        },
      },
    },
  };
});

const { addItineraryItem, deleteItineraryItem, updateItineraryItem } = await import("./itineraryActions");

const loginAs = (userId) => {
  session.current = userId ? { user: { id: userId } } : null;
};

beforeEach(() => {
  db.projects = [
    { id: "trip", days: 3, startDate: "2026-11-14", endDate: "2026-11-16" },
    { id: "other", days: 2, startDate: "2026-12-01", endDate: "2026-12-02" },
  ];
  db.participants = [
    { id: "pOwner", projectId: "trip", userId: "owner", isOwner: true },
    { id: "pMember", projectId: "trip", userId: "member" },
    { id: "pOther", projectId: "other", userId: "outsider", isOwner: true },
  ];
  db.items = [{ id: "x", projectId: "other", dayIndex: 1, time: "", text: "別の旅行の予定" }];
  loginAs("member");
});

describe("addItineraryItem", () => {
  it("メンバーは予定を追加できる（前後の空白は取り除く）", async () => {
    expect(await addItineraryItem("trip", 1, "09:00", "  京都駅集合 ")).toEqual({ ok: true });
    expect(await addItineraryItem("trip", 3, "", "お土産")).toEqual({ ok: true });
    expect(db.items.filter((i) => i.projectId === "trip").map((i) => [i.dayIndex, i.time, i.text])).toEqual([
      [1, "09:00", "京都駅集合"],
      [3, "", "お土産"],
    ]);
  });

  it("旅行の日数の外の日・おかしな時刻・空や長すぎる内容は追加しない", async () => {
    expect((await addItineraryItem("trip", 4, "", "4日目")).error).toBeDefined();
    expect((await addItineraryItem("trip", 0, "", "0日目")).error).toBeDefined();
    expect((await addItineraryItem("trip", 1, "25:00", "夜")).error).toBe("時刻を確認してください");
    expect((await addItineraryItem("trip", 1, "", "  ")).error).toBe("予定を入力してください");
    expect((await addItineraryItem("trip", 1, "", "あ".repeat(51))).error).toContain("50文字以内");
    expect(db.items).toHaveLength(1);
  });

  it("日程が決まっていないプロジェクトには追加できない", async () => {
    Object.assign(db.projects[0], { startDate: "", endDate: "" });
    expect((await addItineraryItem("trip", 1, "", "予定")).error).toBe("日程が決まってから予定を書き込めます");
  });

  it("15日以上の旅行（日数の欄が空）でも、日程から日数を数えて追加できる", async () => {
    Object.assign(db.projects[0], { days: null, startDate: "2026-08-01", endDate: "2026-08-20" });
    expect(await addItineraryItem("trip", 20, "", "最終日")).toEqual({ ok: true });
    expect((await addItineraryItem("trip", 21, "", "はみ出し")).error).toBeDefined();
  });

  it("メンバーでない人は追加できない", async () => {
    loginAs("outsider");
    expect(await addItineraryItem("trip", 1, "", "予定")).toEqual({ error: "このプロジェクトのメンバーではありません" });
  });
});

describe("updateItineraryItem / deleteItineraryItem", () => {
  beforeEach(() => db.items.push({ id: "meet", projectId: "trip", dayIndex: 1, time: "09:00", text: "京都駅集合" }));

  it("予定を編集・削除できる", async () => {
    await updateItineraryItem("trip", "meet", "09:30", "京都駅 中央口に集合");
    expect(db.items.find((i) => i.id === "meet")).toMatchObject({ time: "09:30", text: "京都駅 中央口に集合" });

    await deleteItineraryItem("trip", "meet");
    expect(db.items.map((i) => i.id)).toEqual(["x"]);
  });

  it("ほかのプロジェクトの予定は編集・削除できない", async () => {
    await updateItineraryItem("trip", "x", "", "書き換え");
    await deleteItineraryItem("trip", "x");
    expect(db.items.find((i) => i.id === "x")).toMatchObject({ text: "別の旅行の予定" });
  });
});
