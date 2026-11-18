import { prisma } from "./prisma";

// Server Action が返すエラー。成功したときは { ok: true } を返す
export const LOGIN_REQUIRED = { error: "ログインし直してください" };
export const NOT_MEMBER = { error: "このプロジェクトのメンバーではありません" };
export const OWNER_ONLY = { error: "この操作ができるのは作成者だけです" };
export const INVALID_INPUT = { error: "入力内容を確認してください" };

export async function assertMember(projectId, userId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { participants: true },
  });
  if (!project) return false;
  return project.ownerId === userId || project.participants.some((p) => p.userId === userId);
}

export async function assertOwner(projectId, userId) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  return Boolean(project && project.ownerId === userId);
}

// 送られてきた参加者IDのうち、このプロジェクトの参加者のものだけを残す
export async function filterParticipantIds(projectId, ids) {
  const participants = await prisma.participant.findMany({
    where: { projectId, id: { in: ids } },
    select: { id: true },
  });
  const valid = new Set(participants.map((p) => p.id));
  return ids.filter((id) => valid.has(id));
}

// ログイン中の人の、このプロジェクトでの参加者（メンバーでなければ null）
export async function findMyParticipant(projectId, userId) {
  return prisma.participant.findFirst({ where: { projectId, userId } });
}
