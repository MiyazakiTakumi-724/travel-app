"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { INVALID_INPUT } from "@/lib/access";
import { requireParticipant } from "@/lib/actor";
import { isValidTime } from "@/lib/itinerary";
import { isWithinLength, LIMITS } from "@/lib/limits";
import { daysBetween } from "@/lib/dates";
import { isRestorableId, parseRestoredDate } from "@/lib/restore";

// 旅行の予定（日ごとのメモ）。メンバーなら誰でも追加・編集・削除できる

async function requireMember(projectId) {
  const { error } = await requireParticipant(projectId);
  if (error) return { error };
  return { project: await prisma.project.findUnique({ where: { id: projectId } }) };
}

// 時刻と内容をチェックする（問題なければ null）
function checkItem(time, text) {
  if (!isValidTime(time)) return { error: "時刻を確認してください" };
  if (!text) return { error: "予定を入力してください" };
  if (!isWithinLength(text, LIMITS.itinerary)) return { error: `予定は${LIMITS.itinerary}文字以内で入力してください` };
  return null;
}

const clean = (value) => value?.toString().trim() ?? "";

// 確定した日程の日数（日程が決まっていなければ 0）
const tripLength = (project) =>
  project.startDate && project.endDate ? daysBetween(project.startDate, project.endDate) + 1 : 0;

export async function addItineraryItem(projectId, dayIndex, time, text) {
  const { project, error } = await requireMember(projectId);
  if (error) return error;

  if (tripLength(project) === 0) return { error: "日程が決まってから予定を書き込めます" };
  if (!Number.isInteger(dayIndex) || dayIndex < 1 || dayIndex > tripLength(project)) return INVALID_INPUT;
  const itemError = checkItem(clean(time), clean(text));
  if (itemError) return itemError;

  await prisma.itineraryItem.create({ data: { projectId, dayIndex, time: clean(time), text: clean(text) } });
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

export async function updateItineraryItem(projectId, itemId, time, text) {
  const { error } = await requireMember(projectId);
  if (error) return error;

  const itemError = checkItem(clean(time), clean(text));
  if (itemError) return itemError;

  await prisma.itineraryItem.updateMany({
    where: { id: itemId, projectId },
    data: { time: clean(time), text: clean(text) },
  });
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

// 削除を「元に戻す」ときに、同じIDと作成日時のまま作り直す（同じ時刻の予定の並び順も元どおりになる）
export async function restoreItineraryItem(projectId, item) {
  const { project, error } = await requireMember(projectId);
  if (error) return error;

  const createdAt = parseRestoredDate(item?.createdAt);
  const dayIndex = item?.dayIndex;
  if (!isRestorableId(item?.id) || !Number.isInteger(dayIndex) || dayIndex < 1 || dayIndex > tripLength(project) || createdAt === null) {
    return INVALID_INPUT;
  }
  const itemError = checkItem(clean(item.time), clean(item.text));
  if (itemError) return itemError;

  // すでにある（二重に押された）ときは、元に戻せている状態なので成功扱い
  if (await prisma.itineraryItem.findUnique({ where: { id: item.id } })) return { ok: true };

  await prisma.itineraryItem.create({
    data: { id: item.id, projectId, dayIndex, time: clean(item.time), text: clean(item.text), createdAt },
  });
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

export async function deleteItineraryItem(projectId, itemId) {
  const { error } = await requireMember(projectId);
  if (error) return error;

  await prisma.itineraryItem.deleteMany({ where: { id: itemId, projectId } });
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}
