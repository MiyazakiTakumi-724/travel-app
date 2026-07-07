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
  const date = formData.get("date")?.toString().trim();
  const participantNames = formData
    .getAll("participants")
    .map((name) => name.toString().trim())
    .filter(Boolean);

  if (!title || participantNames.length === 0) return;

  await prisma.project.create({
    data: {
      title,
      destination,
      date,
      ownerId: session.user.id,
      participants: {
        create: participantNames.map((name) => ({ name })),
      },
    },
  });

  revalidatePath("/projects");
}
