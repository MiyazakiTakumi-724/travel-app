"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function assertMember(projectId, userId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { participants: true },
  });
  if (!project) return false;
  return (
    project.ownerId === userId ||
    project.participants.some((p) => p.userId === userId)
  );
}

export async function addPayment(projectId, formData) {
  const session = await auth();
  if (!session?.user?.id) return;
  if (!(await assertMember(projectId, session.user.id))) return;

  const payer = formData.get("payer")?.toString().trim();
  const memo = formData.get("memo")?.toString().trim();
  const amount = Number(formData.get("amount"));

  if (!payer || !amount || amount <= 0) return;

  await prisma.payment.create({
    data: { payer, memo, amount, projectId },
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function toggleSettled(projectId, paymentId, isSettled) {
  const session = await auth();
  if (!session?.user?.id) return;
  if (!(await assertMember(projectId, session.user.id))) return;

  await prisma.payment.updateMany({
    where: { id: paymentId, projectId },
    data: { isSettled },
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function editPayment(projectId, paymentId, formData) {
  const session = await auth();
  if (!session?.user?.id) return;
  if (!(await assertMember(projectId, session.user.id))) return;

  const payer = formData.get("payer")?.toString().trim();
  const memo = formData.get("memo")?.toString().trim();
  const amount = Number(formData.get("amount"));

  if (!payer || !amount || amount <= 0) return;

  await prisma.payment.updateMany({
    where: { id: paymentId, projectId },
    data: { payer, memo, amount },
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function deletePayment(projectId, paymentId) {
  const session = await auth();
  if (!session?.user?.id) return;
  if (!(await assertMember(projectId, session.user.id))) return;

  await prisma.payment.deleteMany({
    where: { id: paymentId, projectId },
  });

  revalidatePath(`/projects/${projectId}`);
}
