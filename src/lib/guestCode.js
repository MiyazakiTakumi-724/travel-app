import { createHash, randomInt } from "node:crypto";
import { keyedHash } from "./secretHash";

// ゲストの復帰用コード。読み間違えやすい文字（0/O・1/I/L）を除いた31文字から10文字を選ぶ（約50ビット）
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const LENGTH = 10;

// 「K7QM3-XRP4N」のように、5文字ずつハイフンで区切って見せる
export function generateGuestCode() {
  const chars = Array.from({ length: LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return formatGuestCode(chars);
}

// そろえた形（ハイフンなし）のコードを、見せる形にする
export function formatGuestCode(normalized) {
  return `${normalized.slice(0, 5)}-${normalized.slice(5)}`;
}

// 入力されたコードを、比べられる形にそろえる（小文字・空白・ハイフンを許す）。形が違えば null
export function normalizeGuestCode(input) {
  const chars = String(input ?? "")
    .toUpperCase()
    .replace(/[\s-]/g, "");
  if (chars.length !== LENGTH || [...chars].some((c) => !ALPHABET.includes(c))) return null;
  return chars;
}

// DB にはコードそのものではなく、サーバーの鍵を使ったハッシュだけを保存する
// （コードは約50ビットなので、鍵なしのハッシュだと DB が漏れたときに総当たりで割り出せてしまう）
export function hashGuestCode(normalized) {
  return keyedHash("guest-code", normalized);
}

// 以前の形式（鍵なしの SHA-256）。この形式で保存されたコードは、使われたときに新しい形式へ置き換える
export function legacyHashGuestCode(normalized) {
  return createHash("sha256").update(normalized).digest("hex");
}

// ゲストのログイン状態を保つ Cookie の名前（プロジェクトごと）
export function guestCookieName(projectId) {
  return `guest_${projectId}`;
}

// 「Googleでログインして引き継ぐ」を本人が押したことの印（引き継ぎのページは、この印があるときだけ動く）。
// ほかのサイトから引き継ぎのページを開かせて、勝手に引き継がせることを防ぐ
export function claimCookieName(projectId) {
  return `claim_${projectId}`;
}

export const CLAIM_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 10 * 60, // Googleでのログインが終わるまでの10分だけ
};

export const GUEST_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 400, // ブラウザが許す最長（約400日）
};
