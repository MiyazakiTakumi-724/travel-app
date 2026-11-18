import { beforeEach, describe, expect, it, vi } from "vitest";

// ログイン状態・DB・キャッシュ更新をテスト用の偽物に差し替える
const session = { current: null };
vi.mock("@/auth", () => ({ auth: async () => session.current }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// サーバー処理が使う分だけを、メモリ上で真似する小さなDB
const db = { projects: [], participants: [], payments: [] };
vi.mock("@/lib/prisma", () => {
  const matches = (row, where = {}) =>
    Object.entries(where).every(([key, cond]) =>
      cond && typeof cond === "object" && "in" in cond ? cond.in.includes(row[key]) : row[key] === cond
    );
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
        update: async ({ where, data }) => Object.assign(db.projects.find((p) => p.id === where.id), data),
        delete: async ({ where }) => {
          db.projects = db.projects.filter((p) => p.id !== where.id);
        },
      },
      participant: {
        findMany: async ({ where }) => db.participants.filter((p) => matches(p, where)),
        findFirst: async ({ where, include }) => {
          const participant = db.participants.find((p) => matches(p, where));
          if (!participant) return null;
          return include?._count
            ? { ...participant, _count: { payments: db.payments.filter((p) => p.payerId === participant.id).length } }
            : { ...participant };
        },
        delete: async ({ where }) => {
          // DB の制約（支払いが残っている参加者は消せない）を真似する
          if (db.payments.some((p) => p.payerId === where.id)) {
            throw Object.assign(new Error("Foreign key constraint violated"), { code: "P2003" });
          }
          db.participants = db.participants.filter((p) => p.id !== where.id);
        },
      },
      payment: {
        findUnique: async ({ where }) => db.payments.find((p) => p.id === where.id) ?? null,
        create: async ({ data }) => db.payments.push({ isSettled: false, ...data }),
        createMany: async ({ data }) => {
          data.forEach((row, index) => db.payments.push({ id: `new-${index}`, isSettled: false, ...row }));
        },
        updateMany: async ({ where, data }) => {
          db.payments.filter((p) => matches(p, where)).forEach((p) => Object.assign(p, data));
        },
        deleteMany: async ({ where }) => {
          db.payments = db.payments.filter((p) => !matches(p, where));
        },
      },
    },
  };
});

const {
  addPayment,
  deletePayment,
  editPayment,
  editProject,
  removeParticipant,
  restorePayment,
  toggleSettled,
} = await import("./actions");

const form = (entries) => {
  const data = new FormData();
  for (const [key, value] of entries) data.append(key, value);
  return data;
};
const loginAs = (userId) => {
  session.current = userId ? { user: { id: userId } } : null;
};

beforeEach(() => {
  // owner（作成者）・member（参加者）・outsider（無関係な人）の3人と、プロジェクト2つ
  db.projects = [
    { id: "trip", title: "沖縄旅行", ownerId: "owner" },
    { id: "other", title: "別の旅行", ownerId: "outsider" },
  ];
  db.participants = [
    { id: "pOwner", name: "まさのり", projectId: "trip", userId: "owner" },
    { id: "pMember", name: "はなこ", projectId: "trip", userId: "member" },
    { id: "pQuiet", name: "じろう", projectId: "trip", userId: "quiet" },
    { id: "pOther", name: "よそ", projectId: "other", userId: "outsider" },
  ];
  db.payments = [{ id: "pay1", payerId: "pMember", memo: "宿", amount: 9000, isSettled: false, projectId: "trip" }];
  loginAs("member");
});

describe("addPayment", () => {
  it("複数人の支払いは均等割りして記録する", async () => {
    await addPayment("trip", form([["payerId", "pOwner"], ["payerId", "pMember"], ["memo", "夕食"], ["amount", "1001"]]));

    const added = db.payments.filter((p) => p.memo === "夕食");
    expect(added.map((p) => [p.payerId, p.amount])).toEqual([["pOwner", 501], ["pMember", 500]]);
  });

  it("ほかのプロジェクトの参加者IDが混ざっていたら記録しない", async () => {
    await addPayment("trip", form([["payerId", "pMember"], ["payerId", "pOther"], ["amount", "1000"]]));
    expect(db.payments).toHaveLength(1);
  });

  it("メンバーでない人やログインしていない人は記録できない", async () => {
    loginAs("outsider");
    await addPayment("trip", form([["payerId", "pMember"], ["amount", "1000"]]));
    loginAs(null);
    await addPayment("trip", form([["payerId", "pMember"], ["amount", "1000"]]));
    expect(db.payments).toHaveLength(1);
  });

  it("金額が0以下・数字でないときは記録しない", async () => {
    await addPayment("trip", form([["payerId", "pMember"], ["amount", "0"]]));
    await addPayment("trip", form([["payerId", "pMember"], ["amount", "-5"]]));
    await addPayment("trip", form([["payerId", "pMember"], ["amount", "abc"]]));
    expect(db.payments).toHaveLength(1);
  });
});

describe("editPayment / toggleSettled / deletePayment", () => {
  it("メンバーは支払いを編集できる", async () => {
    await editPayment("trip", "pay1", form([["payerId", "pOwner"], ["memo", "宿代"], ["amount", "12000"]]));
    expect(db.payments[0]).toMatchObject({ payerId: "pOwner", memo: "宿代", amount: 12000 });
  });

  it("ほかのプロジェクトの参加者には付け替えられない", async () => {
    await editPayment("trip", "pay1", form([["payerId", "pOther"], ["amount", "12000"]]));
    expect(db.payments[0]).toMatchObject({ payerId: "pMember", amount: 9000 });
  });

  it("精算済みの切り替えと削除ができる", async () => {
    await toggleSettled("trip", "pay1", true);
    expect(db.payments[0].isSettled).toBe(true);
    await deletePayment("trip", "pay1");
    expect(db.payments).toHaveLength(0);
  });

  it("メンバーでない人は削除できない", async () => {
    loginAs("outsider");
    await deletePayment("trip", "pay1");
    expect(db.payments).toHaveLength(1);
  });
});

describe("restorePayment", () => {
  it("削除した支払いを同じIDで作り直す", async () => {
    const deleted = { ...db.payments[0] };
    await deletePayment("trip", "pay1");
    await restorePayment("trip", deleted);
    expect(db.payments).toEqual([expect.objectContaining({ id: "pay1", amount: 9000, payerId: "pMember" })]);
  });

  it("同じIDの支払いがまだあるときは二重に作らない", async () => {
    await restorePayment("trip", { ...db.payments[0] });
    expect(db.payments).toHaveLength(1);
  });
});

describe("editProject", () => {
  it("作成者だけが編集できる", async () => {
    await editProject("trip", form([["title", "宮古島旅行"]]));
    expect(db.projects[0].title).toBe("沖縄旅行");

    loginAs("owner");
    await editProject("trip", form([["title", "宮古島旅行"]]));
    expect(db.projects[0].title).toBe("宮古島旅行");
  });
});

describe("removeParticipant", () => {
  beforeEach(() => loginAs("owner"));

  it("作成者は、支払い記録のないメンバーを外せる", async () => {
    expect(await removeParticipant("trip", "pQuiet")).toEqual({ ok: true });
    expect(db.participants.map((p) => p.id)).not.toContain("pQuiet");
  });

  it("支払い記録があるメンバーは外せない", async () => {
    const result = await removeParticipant("trip", "pMember");
    expect(result.error).toContain("支払い記録があるため外せません");
    expect(db.participants.map((p) => p.id)).toContain("pMember");
  });

  it("作成者自身は外せない", async () => {
    expect((await removeParticipant("trip", "pOwner")).error).toBe("作成者は外せません");
  });

  it("作成者以外は外せない", async () => {
    loginAs("member");
    expect((await removeParticipant("trip", "pQuiet")).error).toBe("メンバーを外せるのは作成者だけです");
    expect(db.participants.map((p) => p.id)).toContain("pQuiet");
  });

  it("ほかのプロジェクトの参加者は外せない", async () => {
    expect((await removeParticipant("trip", "pOther")).error).toBe("メンバーが見つかりません");
  });

  it("確認の直後に支払いが記録されても、DBの制約で止めてエラーを返す", async () => {
    // _count では 0 件に見えるが、削除のときには支払いがある状況を作る
    const { prisma } = await import("@/lib/prisma");
    const original = prisma.participant.findFirst;
    prisma.participant.findFirst = async (args) => {
      const found = await original(args);
      db.payments.push({ id: "late", payerId: "pQuiet", amount: 100, projectId: "trip" });
      return { ...found, _count: { payments: 0 } };
    };
    try {
      expect((await removeParticipant("trip", "pQuiet")).error).toContain("支払い記録があるため外せません");
      expect(db.participants.map((p) => p.id)).toContain("pQuiet");
    } finally {
      prisma.participant.findFirst = original;
    }
  });
});
