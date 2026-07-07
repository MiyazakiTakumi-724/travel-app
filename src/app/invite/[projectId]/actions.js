"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function ensureParticipant(projectId, userId, name) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return;

  if (project.ownerId === userId) return;

  const existing = await prisma.participant.findFirst({
    where: { projectId, userId },
  });

  if (!existing) {
    await prisma.participant.create({
      data: { projectId, userId, name },
    });
  }
}

export async function joinProject(projectId) {
  const session = await auth();
  if (!session?.user?.id) return;

  await ensureParticipant(projectId, session.user.id, session.user.nickname);

  redirect(`/projects/${projectId}`);
}

export async function setNicknameAndJoin(projectId, formData) {
  const session = await auth();
  if (!session?.user?.id) return;

  const nickname = formData.get("nickname")?.toString().trim();
  if (!nickname) return;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { nickname },
  });

  await ensureParticipant(projectId, session.user.id, nickname);

  redirect(`/projects/${projectId}`);
}
