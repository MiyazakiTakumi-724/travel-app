// スマホでは共有メニュー（LINE・メッセージなど）を開き、使えない端末（多くのPC）ではクリップボードにコピーする。
// 結果は "shared"（共有した）・"copied"（コピーした）・"cancelled"（共有メニューを閉じた）・"failed" のどれか
export async function shareOrCopy({ title, text, url }) {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return "shared";
    } catch (error) {
      if (error?.name === "AbortError") return "cancelled";
      // 共有に失敗したときは、コピーに切り替える
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
}

export function canShare() {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}
