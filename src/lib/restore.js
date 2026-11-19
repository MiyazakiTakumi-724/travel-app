// 削除したものを「元に戻す」ときに、ブラウザから送られてくる値のチェック（そのまま信じない）

// ID は英数字と - _ だけ（cuid など）
export function isRestorableId(id) {
  return typeof id === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(id);
}

// 作成日時。なければ undefined（今の日時になる）。おかしな日時や、未来の日時（並び順を操作できてしまう）は null
export function parseRestoredDate(value) {
  if (value === undefined || value === null) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getTime() > Date.now() + 60_000) return null;
  return date;
}
