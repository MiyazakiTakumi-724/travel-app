import { describe, expect, it } from "vitest";
import { parseProjectForm } from "./projectInput";

const form = (values) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.append(key, value);
  return data;
};

describe("parseProjectForm", () => {
  it("日程が決まっているときは、開始日・終了日と日数を保存する", () => {
    expect(parseProjectForm(form({ title: " 沖縄旅行 ", destination: "那覇", startDate: "2026-08-10", endDate: "2026-08-13" }))).toEqual({
      data: { title: "沖縄旅行", destination: "那覇", startDate: "2026-08-10", endDate: "2026-08-13", days: 4 },
    });
  });

  const undecided = { title: "沖縄旅行", dateMode: "undecided", days: "3", rangeStart: "2026-08-01", rangeEnd: "2026-08-31" };

  it("これから決めるときは、日数と期間を保存して日付は空にする", () => {
    expect(parseProjectForm(form({ ...undecided, startDate: "2026-08-10" }))).toEqual({
      data: { title: "沖縄旅行", destination: "", startDate: "", endDate: "", days: 3, rangeStart: "2026-08-01", rangeEnd: "2026-08-31" },
    });
  });

  it("これから決めるのに日数がおかしいときはエラー", () => {
    expect(parseProjectForm(form({ ...undecided, days: "0" })).error).toContain("1〜14日");
    expect(parseProjectForm(form({ ...undecided, days: "15" })).error).toBeDefined();
  });

  it("期間がない・逆向き・3か月を超える・旅行の日数より短いときはエラー", () => {
    expect(parseProjectForm(form({ ...undecided, rangeStart: "" })).error).toBe("日程を聞く期間を入力してください");
    expect(parseProjectForm(form({ ...undecided, rangeEnd: "2026-07-31" })).error).toContain("後に");
    expect(parseProjectForm(form({ ...undecided, rangeEnd: "2026-11-30" })).error).toContain("92日以内");
    expect(parseProjectForm(form({ ...undecided, rangeEnd: "2026-08-02" })).error).toContain("旅行の日数より短く");
  });

  it("終了日が開始日より前・ありえない日付はエラー", () => {
    expect(parseProjectForm(form({ title: "沖縄旅行", startDate: "2026-08-13", endDate: "2026-08-10" })).error).toContain("後に");
    expect(parseProjectForm(form({ title: "沖縄旅行", startDate: "2026-02-30" })).error).toBe("日付を確認してください");
  });

  it("日付を入れなくても作れる（日数は空）", () => {
    expect(parseProjectForm(form({ title: "沖縄旅行" })).data).toMatchObject({ startDate: "", endDate: "", days: null });
  });

  it("決まっている日程は1か月（31日）まで", () => {
    expect(parseProjectForm(form({ title: "長旅", startDate: "2026-12-01", endDate: "2026-12-31" })).data.endDate).toBe("2026-12-31");
    expect(parseProjectForm(form({ title: "長旅", startDate: "2026-12-01", endDate: "2027-01-01" })).error).toBe("旅行の期間は31日以内にしてください");
  });

  it("タイトルが空・長すぎるときはエラー", () => {
    expect(parseProjectForm(form({ title: "  " })).error).toBe("タイトルを入力してください");
    expect(parseProjectForm(form({ title: "あ".repeat(31) })).error).toContain("30文字以内");
  });
});
