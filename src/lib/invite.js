import { randomBytes } from "node:crypto";

// 招待リンクの鍵（/invite/〇〇）。暗号用の乱数で作るので、推測して参加することはできない（144ビット）
export function newInviteToken() {
  return randomBytes(18).toString("base64url");
}
