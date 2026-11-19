import { beforeEach, describe, expect, it, vi } from "vitest";

// ログイン状態・DB・キャッシュ更新をテスト用の偽物に差し替える
const session = { current: null };
vi.mock("@/auth", () => ({ auth: async () => session.current }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
// ゲストの Cookie（復帰用コード）。テストごとに入れ替える
const guestCookies = new Map();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name) => (guestCookies.has(name) ? { value: guestCookies.get(name) } : undefined),
    delete: (name) => guestCookies.delete(name),
  }),
}));

// サーバー処理が使う分だけを、メモリ上で真似する小さなDB
const db = { projects: [], participants: [], payments: [] };
vi.mock("@/lib/prisma", () => {
  const matches = (row, where = {}) =>
    Object.entries(where).every(([key, cond]) => {
      if (cond && typeof cond === "object" && "in" in cond) return cond.in.includes(row[key]);
      if (cond && typeof cond === "object" && "not" in cond) return row[key] !== cond.not;
      return row[key] === cond;
    });
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
        findUnique: async ({ where }) => db.participants.find((p) => matches(p, where)) ?? null,
        findMany: async ({ where }) => db.participants.filter((p) => matches(p, where)),
        count: async ({ where }) => db.participants.filter((p) => matches(p, where)).length,
        update: async ({ where, data }) => Object.assign(db.participants.find((p) => p.id === where.id), data),
        findFirst: async ({ where, include }) => {
          const participant = db.participants.find((p) => matches(p, where));
          if (!participant) return null;
          return include?._count
            ? { ...participant, _count: { payments: db.payments.filter((p) => p.payerId === participant.id).length } }
            : { ...participant };
        },
        updateMany: async ({ where, data }) => {
          db.participants.filter((p) => matches(p, where)).forEach((p) => Object.assign(p, data));
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
        count: async ({ where }) => db.payments.filter((p) => matches(p, where)).length,
        create: async ({ data }) => db.payments.push({ ...data }),
        createMany: async ({ data }) => {
          data.forEach((row, index) => db.payments.push({ id: `new-${index}`, ...row }));
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
  deleteProject,
  leaveProject,
  makeOrganizer,
  removeParticipant,
  resetInviteLink,
  restorePayment,
  stepDownOrganizer,
} = await import("./actions");
const { hashGuestCode, guestCookieName } = await import("@/lib/guestCode");

const form = (entries) => {
  const data = new FormData();
  for (const [key, value] of entries) data.append(key, value);
  return data;
};
const loginAs = (userId) => {
  session.current = userId ? { user: { id: userId } } : null;
};

beforeEach(() => {
  // owner（幹事）・member（参加者）・outsider（無関係な人）の3人と、プロジェクト2つ
  db.projects = [
    { id: "trip", title: "沖縄旅行", inviteToken: "invite-trip" },
    { id: "other", title: "別の旅行", inviteToken: "invite-other" },
  ];
  db.participants = [
    { id: "pOwner", name: "まさのり", projectId: "trip", userId: "owner", isOwner: true },
    { id: "pMember", name: "はなこ", projectId: "trip", userId: "member" },
    { id: "pQuiet", name: "じろう", projectId: "trip", userId: "quiet" },
    { id: "pOther", name: "よそ", projectId: "other", userId: "outsider", isOwner: true },
  ].map((participant) => ({ isOwner: false, retired: false, ...participant }));
  db.payments = [{ id: "pay1", payerId: "pMember", memo: "宿", amount: 9000, projectId: "trip" }];
  loginAs("member");
});

describe("addPayment", () => {
  it("支払者1人の支払いを記録する", async () => {
    await addPayment("trip", form([["payerId", "pOwner"], ["memo", "夕食"], ["amount", "1001"]]));
    expect(db.payments.filter((p) => p.memo === "夕食")).toEqual([expect.objectContaining({ payerId: "pOwner", amount: 1001 })]);
  });

  it("支払者が2人以上・いない・ほかのプロジェクトの参加者のときは記録しない", async () => {
    await addPayment("trip", form([["payerId", "pOwner"], ["payerId", "pMember"], ["amount", "1000"]]));
    await addPayment("trip", form([["amount", "1000"]]));
    await addPayment("trip", form([["payerId", "pOther"], ["amount", "1000"]]));
    expect(db.payments).toHaveLength(1);
  });

  it("記録できたら ok を返す", async () => {
    expect(await addPayment("trip", form([["payerId", "pMember"], ["amount", "1000"]]))).toEqual({ ok: true });
  });

  it("メンバーでない人やログインしていない人は記録できず、理由を返す", async () => {
    loginAs("outsider");
    expect(await addPayment("trip", form([["payerId", "pMember"], ["amount", "1000"]]))).toEqual({
      error: "このプロジェクトのメンバーではありません",
    });
    loginAs(null);
    expect(await addPayment("trip", form([["payerId", "pMember"], ["amount", "1000"]]))).toEqual({
      error: "ログインし直してください",
    });
    expect(db.payments).toHaveLength(1);
  });

  it("金額が0以下・数字でないときは記録しない", async () => {
    expect((await addPayment("trip", form([["payerId", "pMember"], ["amount", "0"]]))).error).toBe(
      "金額は1円〜1,000万円の整数で入力してください"
    );
    await addPayment("trip", form([["payerId", "pMember"], ["amount", "-5"]]));
    await addPayment("trip", form([["payerId", "pMember"], ["amount", "abc"]]));
    expect(db.payments).toHaveLength(1);
  });
});

describe("入力値の上限", () => {
  it("1,000万円を超える金額や小数は記録しない", async () => {
    expect(await addPayment("trip", form([["payerId", "pMember"], ["amount", "10000001"]]))).toEqual({
      error: "金額は1円〜1,000万円の整数で入力してください",
    });
    expect((await addPayment("trip", form([["payerId", "pMember"], ["amount", "1.5"]]))).error).toBeDefined();
    expect(await addPayment("trip", form([["payerId", "pMember"], ["amount", "10000000"]]))).toEqual({ ok: true });
  });

  it("支払い内容が長すぎるときは記録しない", async () => {
    const memo = "あ".repeat(31);
    expect((await addPayment("trip", form([["payerId", "pMember"], ["memo", memo], ["amount", "100"]]))).error).toContain(
      "30文字以内"
    );
  });

  it("編集でも金額の上限をチェックする", async () => {
    expect((await editPayment("trip", "pay1", form([["payerId", "pMember"], ["amount", "99999999"]]))).error).toBeDefined();
    expect(db.payments[0].amount).toBe(9000);
  });

  it("タイトルが長すぎるプロジェクトは保存しない", async () => {
    loginAs("owner");
    expect((await editProject("trip", form([["title", "あ".repeat(31)]]))).error).toContain("30文字以内");
    expect(db.projects[0].title).toBe("沖縄旅行");
  });
});

describe("ゲスト（復帰用コードの Cookie）", () => {
  beforeEach(() => {
    loginAs(null);
    guestCookies.clear();
    db.participants.push({ id: "pGuest", name: "ゲスト", projectId: "trip", userId: null, guestCodeHash: hashGuestCode("K7QM3XRP4N") });
  });

  it("ログインしていなくても、コードの Cookie があればそのプロジェクトで操作できる", async () => {
    guestCookies.set(guestCookieName("trip"), "K7QM3-XRP4N");
    expect(await addPayment("trip", form([["payerId", "pGuest"], ["amount", "500"]]))).toEqual({ ok: true });
  });

  it("コードが違う・ほかのプロジェクトの Cookie では操作できない", async () => {
    guestCookies.set(guestCookieName("trip"), "AAAAA-BBBBB");
    expect(await addPayment("trip", form([["payerId", "pGuest"], ["amount", "500"]]))).toEqual({ error: "ログインし直してください" });
    guestCookies.clear();
    guestCookies.set(guestCookieName("other"), "K7QM3-XRP4N");
    expect((await addPayment("trip", form([["payerId", "pGuest"], ["amount", "500"]]))).error).toBeDefined();
    expect(db.payments).toHaveLength(1);
  });

  it("ゲストでも幹事なら、幹事だけの操作ができる", async () => {
    db.participants.find((p) => p.id === "pGuest").isOwner = true;
    guestCookies.set(guestCookieName("trip"), "K7QM3-XRP4N");
    await editProject("trip", form([["title", "宮古島旅行"]]));
    expect(db.projects[0].title).toBe("宮古島旅行");
  });
});

describe("editPayment / deletePayment", () => {
  it("メンバーは支払いを編集できる", async () => {
    await editPayment("trip", "pay1", form([["payerId", "pOwner"], ["memo", "宿代"], ["amount", "12000"]]));
    expect(db.payments[0]).toMatchObject({ payerId: "pOwner", memo: "宿代", amount: 12000 });
  });

  it("ほかのプロジェクトの参加者には付け替えられない", async () => {
    await editPayment("trip", "pay1", form([["payerId", "pOther"], ["amount", "12000"]]));
    expect(db.payments[0]).toMatchObject({ payerId: "pMember", amount: 9000 });
  });

  it("支払いを削除できる", async () => {
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

  it("おかしなID・内容・未来の作成日時は受け付けない", async () => {
    await deletePayment("trip", "pay1");
    const base = { id: "pay1", payerId: "pMember", memo: "宿", amount: 9000 };
    for (const payment of [
      { ...base, id: "../pay1" },
      { ...base, id: 123 },
      { ...base, memo: 123 },
      { ...base, createdAt: "not-a-date" },
      { ...base, createdAt: new Date(Date.now() + 86_400_000).toISOString() },
    ]) {
      expect(await restorePayment("trip", payment)).toEqual({ error: "入力内容を確認してください" });
    }
    expect(db.payments).toHaveLength(0);
  });
});

describe("resetInviteLink", () => {
  it("幹事は招待リンクを作り直せ、新しい鍵は推測できない長さの乱数になる", async () => {
    loginAs("owner");
    expect(await resetInviteLink("trip")).toEqual({ ok: true });
    expect(db.projects[0].inviteToken).not.toBe("invite-trip");
    expect(db.projects[0].inviteToken).toMatch(/^[A-Za-z0-9_-]{24}$/);
  });

  it("幹事でないメンバーは作り直せない", async () => {
    expect((await resetInviteLink("trip")).error).toBeDefined();
    expect(db.projects[0].inviteToken).toBe("invite-trip");
  });
});

describe("editProject", () => {
  it("幹事だけが編集できる", async () => {
    await editProject("trip", form([["title", "宮古島旅行"]]));
    expect(db.projects[0].title).toBe("沖縄旅行");

    loginAs("owner");
    await editProject("trip", form([["title", "宮古島旅行"]]));
    expect(db.projects[0].title).toBe("宮古島旅行");
  });
});

describe("日程調整との関係", () => {
  beforeEach(() => {
    loginAs("owner");
    Object.assign(db.projects[0], { days: 3, rangeStart: "2026-11-01", rangeEnd: "2026-11-30", tentativeStart: "2026-11-14", startDate: "", endDate: "" });
    db.participants.filter((p) => p.projectId === "trip").forEach((p) => Object.assign(p, { availabilitySubmitted: true, tentativeAnswer: "yes" }));
    db.participants.find((p) => p.id === "pQuiet").tentativeAnswer = null;
  });
  const undecided = (rangeEnd) =>
    form([["title", "沖縄旅行"], ["dateMode", "undecided"], ["days", "3"], ["rangeStart", "2026-11-01"], ["rangeEnd", rangeEnd]]);

  it("編集で期間を変えると、行ける日の提出と仮決定をやり直す", async () => {
    await editProject("trip", undecided("2026-12-15"));
    expect(db.projects[0].tentativeStart).toBeNull();
    const trip = db.participants.filter((p) => p.projectId === "trip");
    expect(trip.every((p) => !p.availabilitySubmitted && p.tentativeAnswer === null)).toBe(true);
  });

  it("期間も日数も変えなければ、日程調整はそのまま", async () => {
    await editProject("trip", undecided("2026-11-30"));
    expect(db.projects[0].tentativeStart).toBe("2026-11-14");
    expect(db.participants.find((p) => p.id === "pMember").availabilitySubmitted).toBe(true);
  });

  it("まだ答えていない人を外すと、残りの全員が ○ なので日程が確定する", async () => {
    expect(await removeParticipant("trip", "pQuiet")).toEqual({ ok: true });
    expect(db.projects[0]).toMatchObject({ startDate: "2026-11-14", endDate: "2026-11-16", tentativeStart: null });
  });
});

describe("removeParticipant", () => {
  beforeEach(() => loginAs("owner"));

  it("幹事は、支払い記録のないメンバーを外せる", async () => {
    expect(await removeParticipant("trip", "pQuiet")).toEqual({ ok: true });
    expect(db.participants.map((p) => p.id)).not.toContain("pQuiet");
  });

  it("支払い記録があるメンバーは外せない", async () => {
    const result = await removeParticipant("trip", "pMember");
    expect(result.error).toContain("支払い記録があるため外せません");
    expect(db.participants.map((p) => p.id)).toContain("pMember");
  });

  it("幹事は外せない", async () => {
    expect((await removeParticipant("trip", "pOwner")).error).toContain("幹事は外せません");
  });

  it("幹事以外は外せない", async () => {
    loginAs("member");
    expect((await removeParticipant("trip", "pQuiet")).error).toBe("メンバーを外せるのは幹事だけです");
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

describe("makeOrganizer・stepDownOrganizer（幹事を複数にする）", () => {
  it("幹事は、ほかのメンバーを幹事にできる", async () => {
    loginAs("owner");
    expect(await makeOrganizer("trip", "pMember")).toEqual({ ok: true });
    expect(db.participants.find((p) => p.id === "pMember").isOwner).toBe(true);
  });

  it("幹事でない人や、ほかのプロジェクトの参加者は幹事にできない", async () => {
    expect((await makeOrganizer("trip", "pQuiet")).error).toBe("この操作ができるのは幹事だけです");
    loginAs("owner");
    expect((await makeOrganizer("trip", "pOther")).error).toBe("メンバーが見つかりません");
    expect(db.participants.find((p) => p.id === "pQuiet").isOwner).toBe(false);
  });

  it("ほかに幹事がいなければ、幹事をやめられない", async () => {
    loginAs("owner");
    expect((await stepDownOrganizer("trip")).error).toContain("ほかに幹事がいない");
    expect(db.participants.find((p) => p.id === "pOwner").isOwner).toBe(true);
  });

  it("ほかに幹事がいれば、幹事をやめられる", async () => {
    loginAs("owner");
    await makeOrganizer("trip", "pMember");
    expect(await stepDownOrganizer("trip")).toEqual({ ok: true });
    expect(db.participants.find((p) => p.id === "pOwner").isOwner).toBe(false);
  });
});

describe("leaveProject（自分で抜ける）", () => {
  it("支払い記録のないメンバーは抜けられる", async () => {
    loginAs("quiet");
    expect(await leaveProject("trip")).toEqual({ ok: true });
    expect(db.participants.map((p) => p.id)).not.toContain("pQuiet");
  });

  it("支払い記録がある人は抜けられない", async () => {
    expect((await leaveProject("trip")).error).toContain("支払い記録があるため抜けられません");
    expect(db.participants.map((p) => p.id)).toContain("pMember");
  });

  it("ほかに幹事がいない幹事は抜けられず、ほかの人を幹事にすれば抜けられる", async () => {
    loginAs("owner");
    expect((await leaveProject("trip")).error).toContain("ほかに幹事がいない");
    await makeOrganizer("trip", "pQuiet");
    expect(await leaveProject("trip")).toEqual({ ok: true });
    expect(db.participants.map((p) => p.id)).not.toContain("pOwner");
  });

  it("メンバーが自分だけなら抜けられない（プロジェクトの削除をすすめる）", async () => {
    loginAs("outsider");
    expect((await leaveProject("other")).error).toContain("メンバーがあなただけ");
  });

  it("ゲストが抜けると、このブラウザのログイン状態も消える", async () => {
    db.participants.push({ id: "pGuest", name: "さくら", projectId: "trip", userId: null, isOwner: false, retired: false, guestCodeHash: hashGuestCode("K7QM3XRP4N") });
    guestCookies.set(guestCookieName("trip"), "K7QM3XRP4N");
    loginAs(null);

    expect(await leaveProject("trip")).toEqual({ ok: true });
    expect(db.participants.map((p) => p.id)).not.toContain("pGuest");
    expect(guestCookies.has(guestCookieName("trip"))).toBe(false);
  });
});

describe("deleteProject", () => {
  it("ゲストの幹事が削除すると、このブラウザのログイン状態も消える", async () => {
    db.participants.push({ id: "pGuestOwner", name: "さくら", projectId: "trip", userId: null, isOwner: true, retired: false, guestCodeHash: hashGuestCode("K7QM3XRP4N") });
    guestCookies.set(guestCookieName("trip"), "K7QM3XRP4N");
    loginAs(null);

    expect(await deleteProject("trip")).toEqual({ ok: true });
    expect(db.projects.map((p) => p.id)).not.toContain("trip");
    expect(guestCookies.has(guestCookieName("trip"))).toBe(false);
  });
});
