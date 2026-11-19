"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { isWithinLength, LIMITS } from "@/lib/limits";
import { parseProjectForm } from "@/lib/projectInput";

export async function setNickname(formData) {
  const session = await auth();
  if (!session?.user?.id) return;

  const nickname = formData.get("nickname")?.toString().trim();
  if (!nickname || !isWithinLength(nickname, LIMITS.nickname)) return;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { nickname },
  });

  revalidatePath("/projects");
}

// 作成したら、そのプロジェクトのIDを返す（画面はそのプロジェクトへ移る）
export async function createProject(formData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "ログインし直してください" };

  const { data, error } = parseProjectForm(formData);
  if (error) return { error };

  const project = await prisma.project.create({
    data: {
      ...data,
      participants: {
        create: [{ name: session.user.nickname, userId: session.user.id, isOwner: true }],
      },
    },
  });

  revalidatePath("/projects");
  return { ok: true, id: project.id };
}
