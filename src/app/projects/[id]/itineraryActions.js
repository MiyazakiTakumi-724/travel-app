"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { assertMember, INVALID_INPUT, LOGIN_REQUIRED, NOT_MEMBER } from "@/lib/access";
import { isValidTime } from "@/lib/itinerary";
import { isWithinLength, LIMITS } from "@/lib/limits";
import { daysBetween } from "@/lib/dates";

// 旅行の予定（日ごとのメモ）。メンバーなら誰でも追加・編集・削除できる

async function requireMember(projectId) {
  const session = await auth();
  if (!session?.user?.id) return { error: LOGIN_REQUIRED };
  if (!(await assertMember(projectId, session.user.id))) return { error: NOT_MEMBER };
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

export async function deleteItineraryItem(projectId, itemId) {
  const { error } = await requireMember(projectId);
  if (error) return error;

  await prisma.itineraryItem.deleteMany({ where: { id: itemId, projectId } });
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}
