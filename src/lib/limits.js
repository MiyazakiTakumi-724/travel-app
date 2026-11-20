// 入力値の上限。サーバー側のチェックと、入力欄の maxLength / max の両方で使う
export const LIMITS = {
  amount: 10_000_000, // 1回の支払いは1,000万円まで
  title: 30,
  destination: 30,
  memo: 30,
  nickname: 10, // 表やレシートで読みやすい長さ（以前に登録した長い名前はそのまま使える）
  itinerary: 50, // 旅行の予定1件の文字数
};

// 金額として受け付けられるか（1円以上・上限以下の整数）
export function isValidAmount(amount) {
  return Number.isInteger(amount) && amount >= 1 && amount <= LIMITS.amount;
}

// 文字数が上限以内か（絵文字なども1文字として数える）
export function isWithinLength(text, max) {
  return [...(text ?? "")].length <= max;
}
