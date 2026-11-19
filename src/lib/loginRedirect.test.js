import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
const { safeCallbackPath } = await import("./loginRedirect");

describe("safeCallbackPath", () => {
  it("このサイトの中のパスは、そのまま使う", () => {
    expect(safeCallbackPath("/projects")).toBe("/projects");
    expect(safeCallbackPath("/projects/abc?tab=settle")).toBe("/projects/abc?tab=settle");
  });

  it("外のサイトに飛ぶものは、マイプロジェクトにする", () => {
    for (const value of ["//example.com", "/\\example.com", "/\\/example.com", "/\t/example.com", "/\n/example.com", "https://example.com", "javascript:alert(1)"]) {
      expect(safeCallbackPath(value)).toBe("/projects");
    }
  });

  it("文字列でないとき・空のときは、マイプロジェクトにする", () => {
    expect(safeCallbackPath(undefined)).toBe("/projects");
    expect(safeCallbackPath(["/projects"])).toBe("/projects");
    expect(safeCallbackPath("")).toBe("/projects");
  });
});
