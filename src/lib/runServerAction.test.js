import { describe, expect, it } from "vitest";
import { runServerAction, SAVE_FAILED } from "./runServerAction";

describe("runServerAction", () => {
  it("成功したらそのまま返す", async () => {
    expect(await runServerAction(async () => ({ ok: true }))).toEqual({ ok: true });
  });

  it("サーバーが返したエラーメッセージを返す", async () => {
    expect(await runServerAction(async () => ({ error: "入力内容を確認してください" }))).toEqual({
      error: "入力内容を確認してください",
    });
  });

  it("通信エラーで例外になったら、保存できなかったと返す", async () => {
    expect(await runServerAction(async () => { throw new Error("network"); })).toEqual({ error: SAVE_FAILED });
  });

  it("何も返ってこなかったときも失敗として扱う", async () => {
    expect(await runServerAction(async () => undefined)).toEqual({ error: SAVE_FAILED });
  });
});
