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
