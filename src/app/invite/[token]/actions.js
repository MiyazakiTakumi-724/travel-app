"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isWithinLength, LIMITS } from "@/lib/limits";

// 招待リンクの鍵から、Googleでログインした人をメンバーにする（すでにメンバーなら何もしない）。
// プロジェクトのIDを返す（招待リンクが古い・間違っているときは null）
async function ensureParticipant(inviteToken, userId, name) {
  const project = await prisma.project.findUnique({ where: { inviteToken } });
  if (!project) return null;

  const existing = await prisma.participant.findFirst({
    where: { projectId: project.id, userId },
  });

  if (!existing) {
    try {
      await prisma.participant.create({
        data: { projectId: project.id, userId, name },
      });
    } catch (error) {
      // 同時に2回開いたときなどは、もう一方で参加できているので、そのまま進む
      if (error?.code !== "P2002") throw error;
    }
  }
  return project.id;
}

export async function joinProject(inviteToken) {
  const session = await auth();
  if (!session?.user?.id) return;

  const projectId = await ensureParticipant(inviteToken, session.user.id, session.user.nickname);
  if (projectId) redirect(`/projects/${projectId}`);
}

export async function setNicknameAndJoin(inviteToken, formData) {
  const session = await auth();
  if (!session?.user?.id) return;

  const nickname = formData.get("nickname")?.toString().trim();
  if (!nickname || !isWithinLength(nickname, LIMITS.nickname)) return;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { nickname },
  });

  const projectId = await ensureParticipant(inviteToken, session.user.id, nickname);
  redirect(projectId ? `/projects/${projectId}` : "/projects");
}
