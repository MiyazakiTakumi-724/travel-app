export const SAVE_FAILED = "保存できませんでした。通信状況を確認して、もう一度お試しください。";

// Server Action を呼び、成功なら { ok: true }、失敗なら { error } を返す。
// 通信が切れて例外になった場合や、何も返ってこなかった場合も失敗として扱う
export async function runServerAction(action) {
  try {
    const result = await action();
    if (result?.ok) return result;
    return { error: result?.error ?? SAVE_FAILED };
  } catch {
    return { error: SAVE_FAILED };
  }
}
