"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function setNickname(formData) {
  const session = await auth();
  if (!session?.user?.id) return;

  const nickname = formData.get("nickname")?.toString().trim();
  if (!nickname) return;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { nickname },
  });

  revalidatePath("/projects");
}

export async function createProject(formData) {
  const session = await auth();
  if (!session?.user?.id) return;

  const title = formData.get("title")?.toString().trim();
  const destination = formData.get("destination")?.toString().trim();
  const startDate = formData.get("startDate")?.toString().trim();
  const endDate = formData.get("endDate")?.toString().trim();

  if (!title) return;

  await prisma.project.create({
    data: {
      title,
      destination,
      startDate,
      endDate,
      ownerId: session.user.id,
      participants: {
        create: [{ name: session.user.nickname, userId: session.user.id }],
      },
    },
  });

  revalidatePath("/projects");
}
