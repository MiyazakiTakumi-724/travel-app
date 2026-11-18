import { afterEach, describe, expect, it, vi } from "vitest";
import { canShare, shareOrCopy } from "./share";

const data = { title: "招待", text: "参加してください", url: "https://example.com/invite/1" };
const setNavigator = (value) => vi.stubGlobal("navigator", value);

afterEach(() => vi.unstubAllGlobals());

describe("shareOrCopy", () => {
  it("共有メニューが使える端末では、共有メニューを開く", async () => {
    const share = vi.fn().mockResolvedValue();
    setNavigator({ share, clipboard: { writeText: vi.fn() } });

    expect(await shareOrCopy(data)).toBe("shared");
    expect(share).toHaveBeenCalledWith(data);
    expect(canShare()).toBe(true);
  });

  it("共有メニューを閉じたときは、コピーもしない", async () => {
    const writeText = vi.fn();
    setNavigator({ share: vi.fn().mockRejectedValue(Object.assign(new Error(), { name: "AbortError" })), clipboard: { writeText } });

    expect(await shareOrCopy(data)).toBe("cancelled");
    expect(writeText).not.toHaveBeenCalled();
  });

  it("共有メニューが使えない端末では、URLをコピーする", async () => {
    const writeText = vi.fn().mockResolvedValue();
    setNavigator({ clipboard: { writeText } });

    expect(await shareOrCopy(data)).toBe("copied");
    expect(writeText).toHaveBeenCalledWith(data.url);
    expect(canShare()).toBe(false);
  });

  it("共有に失敗したらコピーに切り替え、コピーもできなければ failed", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    setNavigator({ share: vi.fn().mockRejectedValue(new Error("NotAllowed")), clipboard: { writeText } });

    expect(await shareOrCopy(data)).toBe("failed");
    expect(writeText).toHaveBeenCalled();
  });
});
