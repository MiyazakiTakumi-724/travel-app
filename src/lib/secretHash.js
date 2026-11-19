import { createHmac } from "node:crypto";

// サーバーだけが知る鍵（AUTH_SECRET）を使ったハッシュ（HMAC-SHA256）。用途ごとに鍵を分ける。
// 鍵を知らなければ総当たりもできないので、DB が漏れても復帰用コードや IP アドレスを割り出せない
export function keyedHash(purpose, value) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET が設定されていません");
  return createHmac("sha256", `${purpose}:${secret}`).update(String(value)).digest("hex");
}
