import { createHash, randomInt } from "node:crypto";

// ゲストの復帰用コード。読み間違えやすい文字（0/O・1/I/L）を除いた31文字から10文字を選ぶ（約50ビット）
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const LENGTH = 10;

// 「K7QM3-XRP4N」のように、5文字ずつハイフンで区切って見せる
export function generateGuestCode() {
  const chars = Array.from({ length: LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `${chars.slice(0, 5)}-${chars.slice(5)}`;
}

// 入力されたコードを、比べられる形にそろえる（小文字・空白・ハイフンを許す）。形が違えば null
export function normalizeGuestCode(input) {
  const chars = String(input ?? "")
    .toUpperCase()
    .replace(/[\s-]/g, "");
  if (chars.length !== LENGTH || [...chars].some((c) => !ALPHABET.includes(c))) return null;
  return chars;
}

// DB にはコードそのものではなく、元に戻せないハッシュだけを保存する
export function hashGuestCode(normalized) {
  return createHash("sha256").update(normalized).digest("hex");
}

// ゲストのログイン状態を保つ Cookie の名前（プロジェクトごと）
export function guestCookieName(projectId) {
  return `guest_${projectId}`;
}

export const GUEST_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 400, // ブラウザが許す最長（約400日）
};
