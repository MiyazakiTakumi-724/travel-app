// スマホでは共有メニュー（LINE・メッセージなど）を開き、使えない端末（多くのPC）ではクリップボードにコピーする。
// 結果は "shared"（共有した）・"copied"（コピーした）・"cancelled"（共有メニューを閉じた）・"failed" のどれか
export async function shareOrCopy({ title, text, url }) {
  if (canShare()) {
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

// 共有メニューを使うのは、指で操作する端末（スマホ・タブレット）だけ。
// PC のブラウザにも共有メニューはあるが、PC ではリンクをそのままコピーするほうが使いやすい
export function canShare() {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") return false;
  return typeof window !== "undefined" && Boolean(window.matchMedia?.("(pointer: coarse)").matches);
}
