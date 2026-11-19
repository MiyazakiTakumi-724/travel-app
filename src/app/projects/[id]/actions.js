"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { isValidAmount, isWithinLength, LIMITS } from "@/lib/limits";

import { filterParticipantIds, INVALID_INPUT, OWNER_ONLY } from "@/lib/access";
import { requireOwner, requireParticipant } from "@/lib/actor";
import { parseProjectForm } from "@/lib/projectInput";
import { confirmIfAllAgreed, resetAnswers } from "@/lib/scheduleServer";
import { newInviteToken } from "@/lib/invite";
import { clearGuestCookie } from "@/lib/guestSession";
import { isRestorableId, parseRestoredDate } from "@/lib/restore";

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

// 幹事がメンバーを外す。支払い記録が残っている人は、記録が消えたり精算額が変わったりしないよう外せない
export async function removeParticipant(projectId, participantId) {
  const { error: actorError } = await requireOwner(projectId);
  if (actorError === OWNER_ONLY) return { error: "メンバーを外せるのは幹事だけです" };
  if (actorError) return actorError;

  const participant = await prisma.participant.findFirst({
    where: { id: participantId, projectId },
    include: { _count: { select: { payments: true } } },
  });
  if (!participant) return { error: "メンバーが見つかりません" };
  if (participant.isOwner) return { error: "幹事は外せません。本人が「幹事をやめる」を押すと外せるようになります" };
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

// 幹事が、ほかのメンバーを幹事にする。幹事は、編集・削除・仮決定・メンバーを外す・コードの再発行ができる。
// 幹事が複数いれば、1人が復帰用コードをなくしても、ほかの幹事が発行し直せる
export async function makeOrganizer(projectId, participantId) {
  const { error: actorError } = await requireOwner(projectId);
  if (actorError) return actorError;

  const target = await prisma.participant.findFirst({ where: { id: participantId, projectId } });
  if (!target || target.retired) return { error: "メンバーが見つかりません" };

  await prisma.participant.update({ where: { id: target.id }, data: { isOwner: true } });
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

// 自分が幹事をやめる（ほかに幹事がいるときだけ。幹事がいなくなるとプロジェクトを動かせなくなるため）
export async function stepDownOrganizer(projectId) {
  const { participant: me, error: actorError } = await requireOwner(projectId);
  if (actorError) return actorError;

  const otherOrganizers = await prisma.participant.count({
    where: { projectId, isOwner: true, retired: false, id: { not: me.id } },
  });
  if (otherOrganizers === 0) {
    return { error: "ほかに幹事がいないため、やめられません。先にほかのメンバーを幹事にしてください" };
  }

  await prisma.participant.update({ where: { id: me.id }, data: { isOwner: false } });
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

// 自分でプロジェクトを抜ける。支払いの記録がある人は、精算の金額が変わらないよう抜けられない
export async function leaveProject(projectId) {
  const { participant: me, isGuest, error: actorError } = await requireParticipant(projectId);
  if (actorError) return actorError;

  const paymentError = { error: "あなたの支払い記録があるため抜けられません。先に支払いを編集するか削除してください" };
  if ((await prisma.payment.count({ where: { payerId: me.id } })) > 0) return paymentError;

  const others = (await prisma.participant.findMany({ where: { projectId, retired: false } })).filter((p) => p.id !== me.id);
  if (others.length === 0) {
    return { error: "メンバーがあなただけなので抜けられません。使わなければ、プロジェクトを削除してください" };
  }
  if (me.isOwner && !others.some((p) => p.isOwner)) {
    return { error: "ほかに幹事がいないため抜けられません。先にほかのメンバーを幹事にしてください" };
  }

  try {
    await prisma.participant.delete({ where: { id: me.id } });
  } catch (error) {
    // 確認のあとに支払いが記録された場合は、DBの制約で削除が止まる
    if (error?.code === "P2003") return paymentError;
    throw error;
  }
  // 抜けた人以外が全員 ○ なら、仮決定の日程をそのまま確定する
  await confirmIfAllAgreed(projectId);
  if (isGuest) await clearGuestCookie(projectId);

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
  const { isGuest, error: actorError } = await requireOwner(projectId);
  if (actorError) return actorError;

  await prisma.project.delete({ where: { id: projectId } });
  // ゲストとして使っていたなら、このブラウザのログイン状態も消す
  if (isGuest) await clearGuestCookie(projectId);

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

// 削除を「元に戻す」ときに、同じIDと作成日時のまま作り直す（一覧の並び順も元どおりになる）
export async function restorePayment(projectId, payment) {
  const { error: actorError } = await requireParticipant(projectId);
  if (actorError) return actorError;

  const amount = Number(payment?.amount);
  const memo = payment?.memo ?? "";
  const createdAt = parseRestoredDate(payment?.createdAt);
  if (
    !isRestorableId(payment?.id) ||
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
