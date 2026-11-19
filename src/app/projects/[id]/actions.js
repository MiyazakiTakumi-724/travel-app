"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { isValidAmount, isWithinLength, LIMITS } from "@/lib/limits";

import { filterParticipantIds, INVALID_INPUT, OWNER_ONLY } from "@/lib/access";
import { requireOwner, requireParticipant } from "@/lib/actor";
import { parseProjectForm } from "@/lib/projectInput";
import { confirmIfAllAgreed, resetAnswers } from "@/lib/scheduleServer";
import { newInviteToken } from "@/lib/invite";

const INVALID_AMOUNT = { error: "金額は1円〜1,000万円の整数で入力してください" };
const MEMO_TOO_LONG = { error: `支払い内容は${LIMITS.memo}文字以内で入力してください` };

export async function editProject(projectId, formData) {
  const { error: actorError } = await requireOwner(projectId);
  if (actorError) return actorError;

  const { data, error } = parseProjectForm(formData);
  if (error) return { error };

  // 日程調整の条件が変わったら、仮決定と ○× をやり直す。期間が変わったら、行ける日の提出もやり直す
  const before = await prisma.project.findUnique({ where: { id: projectId } });
  const rangeChanged =
    data.rangeStart !== undefined && (data.rangeStart !== before.rangeStart || data.rangeEnd !== before.rangeEnd);
  if (rangeChanged || data.days !== before.days || data.startDate) {
    data.tentativeStart = null;
    await resetAnswers(projectId);
  }
  if (rangeChanged) {
    await prisma.participant.updateMany({ where: { projectId }, data: { availabilitySubmitted: false } });
  }

  await prisma.project.update({ where: { id: projectId }, data });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  return { ok: true };
}

// 作成者がメンバーを外す。支払い記録が残っている人は、記録が消えたり精算額が変わったりしないよう外せない
export async function removeParticipant(projectId, participantId) {
  const { error: actorError } = await requireOwner(projectId);
  if (actorError === OWNER_ONLY) return { error: "メンバーを外せるのは作成者だけです" };
  if (actorError) return actorError;

  const participant = await prisma.participant.findFirst({
    where: { id: participantId, projectId },
    include: { _count: { select: { payments: true } } },
  });
  if (!participant) return { error: "メンバーが見つかりません" };
  if (participant.isOwner) return { error: "作成者は外せません" };
  if (participant._count.payments > 0) {
    return { error: `${participant.name}さんの支払い記録があるため外せません。先に支払いを編集するか削除してください` };
  }

  try {
    await prisma.participant.delete({ where: { id: participant.id } });
    // 外した人以外が全員 ○ なら、仮決定の日程をそのまま確定する
    await confirmIfAllAgreed(projectId);
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

// 招待リンクを作り直す。前の招待リンクは使えなくなる（参加済みのメンバーはそのまま）
export async function resetInviteLink(projectId) {
  const { error: actorError } = await requireOwner(projectId);
  if (actorError) return actorError;

  await prisma.project.update({ where: { id: projectId }, data: { inviteToken: newInviteToken() } });
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

export async function deleteProject(projectId) {
  const { error: actorError } = await requireOwner(projectId);
  if (actorError) return actorError;

  await prisma.project.delete({ where: { id: projectId } });

  revalidatePath("/projects");
  return { ok: true };
}

export async function addPayment(projectId, formData) {
  const { error: actorError } = await requireParticipant(projectId);
  if (actorError) return actorError;

  // 支払者は1人だけ
  const payerIds = formData.getAll("payerId").map((id) => id.toString()).filter(Boolean);
  const memo = formData.get("memo")?.toString().trim();
  const amount = Number(formData.get("amount"));

  if (payerIds.length !== 1) return INVALID_INPUT;
  if ((await filterParticipantIds(projectId, payerIds)).length === 0) return INVALID_INPUT;
  if (!isValidAmount(amount)) return INVALID_AMOUNT;
  if (!isWithinLength(memo, LIMITS.memo)) return MEMO_TOO_LONG;

  await prisma.payment.create({ data: { payerId: payerIds[0], memo, amount, projectId } });

  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

export async function editPayment(projectId, paymentId, formData) {
  const { error: actorError } = await requireParticipant(projectId);
  if (actorError) return actorError;

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

// 「元に戻す」で送られてくる値は、ブラウザから来るのでそのまま信じない
const RESTORE_ID = /^[A-Za-z0-9_-]{1,64}$/;
function parseRestoredDate(value) {
  if (value === undefined || value === null) return undefined;
  const date = new Date(value);
  // おかしな日時や、未来の日時（並び順を操作できてしまう）は受け付けない
  if (Number.isNaN(date.getTime()) || date.getTime() > Date.now() + 60_000) return null;
  return date;
}

// 削除を「元に戻す」ときに、同じIDと作成日時のまま作り直す（一覧の並び順も元どおりになる）
export async function restorePayment(projectId, payment) {
  const { error: actorError } = await requireParticipant(projectId);
  if (actorError) return actorError;

  const amount = Number(payment?.amount);
  const memo = payment?.memo ?? "";
  const createdAt = parseRestoredDate(payment?.createdAt);
  if (
    typeof payment?.id !== "string" ||
    !RESTORE_ID.test(payment.id) ||
    typeof payment.payerId !== "string" ||
    typeof memo !== "string" ||
    !isValidAmount(amount) ||
    !isWithinLength(memo, LIMITS.memo) ||
    createdAt === null
  ) {
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
      memo,
      amount,
      createdAt,
      projectId,
    },
  });

  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

export async function deletePayment(projectId, paymentId) {
  const { error: actorError } = await requireParticipant(projectId);
  if (actorError) return actorError;

  await prisma.payment.deleteMany({
    where: { id: paymentId, projectId },
  });

  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}
