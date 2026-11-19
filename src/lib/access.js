import { prisma } from "./prisma";

// Server Action が返すエラー。成功したときは { ok: true } を返す
export const LOGIN_REQUIRED = { error: "ログインし直してください" };
export const NOT_MEMBER = { error: "このプロジェクトのメンバーではありません" };
export const OWNER_ONLY = { error: "この操作ができるのは幹事だけです" };
export const INVALID_INPUT = { error: "入力内容を確認してください" };

// 送られてきた参加者IDのうち、このプロジェクトの参加者のものだけを残す
export async function filterParticipantIds(projectId, ids) {
  const participants = await prisma.participant.findMany({
    where: { projectId, id: { in: ids } },
    select: { id: true },
  });
  const valid = new Set(participants.map((p) => p.id));
  return ids.filter((id) => valid.has(id));
}
