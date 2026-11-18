"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { splitAmount } from "@/lib/split";
import { isValidAmount, isWithinLength, LIMITS } from "@/lib/limits";

// 画面に出すエラーメッセージ。成功したときは { ok: true } を返す
const LOGIN_REQUIRED = { error: "ログインし直してください" };
const NOT_MEMBER = { error: "このプロジェクトのメンバーではありません" };
const OWNER_ONLY = { error: "この操作ができるのは作成者だけです" };
const INVALID_INPUT = { error: "入力内容を確認してください" };
const INVALID_AMOUNT = { error: "金額は1円〜1,000万円の整数で入力してください" };
const MEMO_TOO_LONG = { error: `支払い内容は${LIMITS.memo}文字以内で入力してください` };

// プロジェクトのタイトル・目的地の文字数をチェックする（問題なければ null）
function checkProjectText(title, destination) {
  if (!title) return { error: "タイトルを入力してください" };
  if (!isWithinLength(title, LIMITS.title)) return { error: `タイトルは${LIMITS.title}文字以内で入力してください` };
  if (!isWithinLength(destination, LIMITS.destination)) {
    return { error: `目的地は${LIMITS.destination}文字以内で入力してください` };
  }
  return null;
}

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
  if (!session?.user?.id) return LOGIN_REQUIRED;
  if (!(await assertOwner(projectId, session.user.id))) return OWNER_ONLY;

  const title = formData.get("title")?.toString().trim();
  const destination = formData.get("destination")?.toString().trim();
  const startDate = formData.get("startDate")?.toString().trim();
  const endDate = formData.get("endDate")?.toString().trim();

  const textError = checkProjectText(title, destination);
  if (textError) return textError;

  await prisma.project.update({
    where: { id: projectId },
    data: { title, destination, startDate, endDate },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  return { ok: true };
}

// 作成者がメンバーを外す。支払い記録が残っている人は、記録が消えたり精算額が変わったりしないよう外せない
export async function removeParticipant(projectId, participantId) {
  const session = await auth();
  if (!session?.user?.id) return LOGIN_REQUIRED;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.ownerId !== session.user.id) {
    return { error: "メンバーを外せるのは作成者だけです" };
  }

  const participant = await prisma.participant.findFirst({
    where: { id: participantId, projectId },
    include: { _count: { select: { payments: true } } },
  });
  if (!participant) return { error: "メンバーが見つかりません" };
  if (participant.userId === project.ownerId) return { error: "作成者は外せません" };
  if (participant._count.payments > 0) {
    return { error: `${participant.name}さんの支払い記録があるため外せません。先に支払いを編集するか削除してください` };
  }

  try {
    await prisma.participant.delete({ where: { id: participant.id } });
  } catch (error) {
    // 確認のあとに支払いが記録された場合は、DBの制約で削除が止まる
    if (error?.code === "P2003") {
      return { error: `${participant.name}さんの支払い記録があるため外せません` };
    }
    throw error;
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  return { ok: true };
}

export async function deleteProject(projectId) {
  const session = await auth();
  if (!session?.user?.id) return LOGIN_REQUIRED;
  if (!(await assertOwner(projectId, session.user.id))) return OWNER_ONLY;

  await prisma.project.delete({ where: { id: projectId } });

  revalidatePath("/projects");
  return { ok: true };
}

export async function addPayment(projectId, formData) {
  const session = await auth();
  if (!session?.user?.id) return LOGIN_REQUIRED;
  if (!(await assertMember(projectId, session.user.id))) return NOT_MEMBER;

  const requestedPayerIds = [
    ...new Set(formData.getAll("payerId").map((id) => id.toString()).filter(Boolean)),
  ];
  const payerIds = await filterParticipantIds(projectId, requestedPayerIds);
  const memo = formData.get("memo")?.toString().trim();
  const amount = Number(formData.get("amount"));

  if (payerIds.length === 0 || payerIds.length !== requestedPayerIds.length) return INVALID_INPUT;
  if (!isValidAmount(amount)) return INVALID_AMOUNT;
  if (!isWithinLength(memo, LIMITS.memo)) return MEMO_TOO_LONG;

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
  return { ok: true };
}

export async function toggleSettled(projectId, paymentId, isSettled) {
  const session = await auth();
  if (!session?.user?.id) return LOGIN_REQUIRED;
  if (!(await assertMember(projectId, session.user.id))) return NOT_MEMBER;

  await prisma.payment.updateMany({
    where: { id: paymentId, projectId },
    data: { isSettled },
  });

  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

export async function editPayment(projectId, paymentId, formData) {
  const session = await auth();
  if (!session?.user?.id) return LOGIN_REQUIRED;
  if (!(await assertMember(projectId, session.user.id))) return NOT_MEMBER;

  const payerId = formData.get("payerId")?.toString();
  const memo = formData.get("memo")?.toString().trim();
  const amount = Number(formData.get("amount"));

  if (!payerId) return INVALID_INPUT;
  if (!isValidAmount(amount)) return INVALID_AMOUNT;
  if (!isWithinLength(memo, LIMITS.memo)) return MEMO_TOO_LONG;
  if ((await filterParticipantIds(projectId, [payerId])).length === 0) return INVALID_INPUT;

  await prisma.payment.updateMany({
    where: { id: paymentId, projectId },
    data: { payerId, memo, amount },
  });

  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

// 削除を「元に戻す」ときに、同じIDと作成日時のまま作り直す（一覧の並び順も元どおりになる）
export async function restorePayment(projectId, payment) {
  const session = await auth();
  if (!session?.user?.id) return LOGIN_REQUIRED;
  if (!(await assertMember(projectId, session.user.id))) return NOT_MEMBER;

  const amount = Number(payment?.amount);
  if (!payment?.id || !isValidAmount(amount) || !isWithinLength(payment.memo, LIMITS.memo)) {
    return INVALID_INPUT;
  }
  if ((await filterParticipantIds(projectId, [payment.payerId])).length === 0) return INVALID_INPUT;

  const exists = await prisma.payment.findUnique({ where: { id: payment.id } });
  // すでにある（二重に押された）ときは、元に戻せている状態なので成功扱い
  if (exists) return { ok: true };

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
  return { ok: true };
}

export async function deletePayment(projectId, paymentId) {
  const session = await auth();
  if (!session?.user?.id) return LOGIN_REQUIRED;
  if (!(await assertMember(projectId, session.user.id))) return NOT_MEMBER;

  await prisma.payment.deleteMany({
    where: { id: paymentId, projectId },
  });

  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}
