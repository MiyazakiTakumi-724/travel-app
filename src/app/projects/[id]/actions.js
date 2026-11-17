"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { splitAmount } from "@/lib/split";

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

// 送られてきた支払者IDのうち、このプロジェクトの参加者のものだけを残す
async function filterParticipantIds(projectId, ids) {
  const participants = await prisma.participant.findMany({
    where: { projectId, id: { in: ids } },
    select: { id: true },
  });
  const valid = new Set(participants.map((p) => p.id));
  return ids.filter((id) => valid.has(id));
}

async function assertOwner(projectId, userId) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  return Boolean(project && project.ownerId === userId);
}

export async function editProject(projectId, formData) {
  const session = await auth();
  if (!session?.user?.id) return;
  if (!(await assertOwner(projectId, session.user.id))) return;

  const title = formData.get("title")?.toString().trim();
  const destination = formData.get("destination")?.toString().trim();
  const startDate = formData.get("startDate")?.toString().trim();
  const endDate = formData.get("endDate")?.toString().trim();

  if (!title) return;

  await prisma.project.update({
    where: { id: projectId },
    data: { title, destination, startDate, endDate },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
}

export async function deleteProject(projectId) {
  const session = await auth();
  if (!session?.user?.id) return;
  if (!(await assertOwner(projectId, session.user.id))) return;

  await prisma.project.delete({ where: { id: projectId } });

  revalidatePath("/projects");
}

export async function addPayment(projectId, formData) {
  const session = await auth();
  if (!session?.user?.id) return;
  if (!(await assertMember(projectId, session.user.id))) return;

  const requestedPayerIds = [
    ...new Set(formData.getAll("payerId").map((id) => id.toString()).filter(Boolean)),
  ];
  const payerIds = await filterParticipantIds(projectId, requestedPayerIds);
  const memo = formData.get("memo")?.toString().trim();
  const amount = Number(formData.get("amount"));

  if (payerIds.length === 0 || payerIds.length !== requestedPayerIds.length) return;
  if (!amount || amount <= 0) return;

  // 複数人が支払者の場合は金額を均等割りする
  const amounts = splitAmount(amount, payerIds.length);

  await prisma.payment.createMany({
    data: payerIds.map((payerId, index) => ({
      payerId,
      memo,
      amount: amounts[index],
      projectId,
    })),
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

  const payerId = formData.get("payerId")?.toString();
  const memo = formData.get("memo")?.toString().trim();
  const amount = Number(formData.get("amount"));

  if (!payerId || !amount || amount <= 0) return;
  if ((await filterParticipantIds(projectId, [payerId])).length === 0) return;

  await prisma.payment.updateMany({
    where: { id: paymentId, projectId },
    data: { payerId, memo, amount },
  });

  revalidatePath(`/projects/${projectId}`);
}

// 削除を「元に戻す」ときに、同じIDと作成日時のまま作り直す（一覧の並び順も元どおりになる）
export async function restorePayment(projectId, payment) {
  const session = await auth();
  if (!session?.user?.id) return;
  if (!(await assertMember(projectId, session.user.id))) return;

  const amount = Number(payment?.amount);
  if (!payment?.id || !amount || amount <= 0) return;
  if ((await filterParticipantIds(projectId, [payment.payerId])).length === 0) return;

  const exists = await prisma.payment.findUnique({ where: { id: payment.id } });
  if (exists) return;

  await prisma.payment.create({
    data: {
      id: payment.id,
      payerId: payment.payerId,
      memo: payment.memo ?? "",
      amount,
      isSettled: Boolean(payment.isSettled),
      createdAt: payment.createdAt ? new Date(payment.createdAt) : undefined,
      projectId,
    },
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
