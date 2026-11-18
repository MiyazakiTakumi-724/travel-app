"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  assertOwner,
  findMyParticipant,
  INVALID_INPUT,
  LOGIN_REQUIRED,
  NOT_MEMBER,
  OWNER_ONLY,
} from "@/lib/access";
import { daysBetween, isValidDate } from "@/lib/dates";
import { ANSWERS, isValidDays, MAX_RANGE_DAYS, tripEndDate } from "@/lib/schedule";

const refresh = (projectId) => {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
};

// ログイン中の人と、作成者かどうかを確かめる
async function requireOwner(projectId) {
  const session = await auth();
  if (!session?.user?.id) return { error: LOGIN_REQUIRED };
  if (!(await assertOwner(projectId, session.user.id))) return { error: OWNER_ONLY };
  return { project: await prisma.project.findUnique({ where: { id: projectId } }) };
}

// ログイン中の人の、このプロジェクトでの参加者を取り出す
async function requireMe(projectId) {
  const session = await auth();
  if (!session?.user?.id) return { error: LOGIN_REQUIRED };
  const me = await findMyParticipant(projectId, session.user.id);
  if (!me) return { error: NOT_MEMBER };
  return { me, project: await prisma.project.findUnique({ where: { id: projectId } }) };
}

// 作成者が、行けない日を聞く期間を決める（最大3か月）
export async function setScheduleRange(projectId, rangeStart, rangeEnd) {
  const { project, error } = await requireOwner(projectId);
  if (error) return error;

  if (!isValidDate(rangeStart) || !isValidDate(rangeEnd)) return { error: "期間の日付を確認してください" };
  const span = daysBetween(rangeStart, rangeEnd) + 1;
  if (span < 1) return { error: "終わりの日は始まりの日より後にしてください" };
  if (span > MAX_RANGE_DAYS) return { error: `期間は${MAX_RANGE_DAYS}日以内にしてください` };
  if (project.days && span < project.days) return { error: "期間が旅行の日数より短くなっています" };

  await prisma.project.update({ where: { id: projectId }, data: { rangeStart, rangeEnd } });
  refresh(projectId);
  return { ok: true };
}

// 自分の「行けない日」を付けたり外したりする
export async function setUnavailable(projectId, date, unavailable) {
  const { me, project, error } = await requireMe(projectId);
  if (error) return error;

  if (!isValidDate(date) || !project.rangeStart || !project.rangeEnd) return INVALID_INPUT;
  if (daysBetween(project.rangeStart, date) < 0 || daysBetween(date, project.rangeEnd) < 0) return INVALID_INPUT;

  if (unavailable) {
    await prisma.unavailableDay.upsert({
      where: { participantId_date: { participantId: me.id, date } },
      create: { participantId: me.id, date },
      update: {},
    });
  } else {
    await prisma.unavailableDay.deleteMany({ where: { participantId: me.id, date } });
  }
  refresh(projectId);
  return { ok: true };
}

// 作成者が、日程の候補を追加する（開始日。終了日は旅行の日数から決まる）
export async function addCandidate(projectId, startDate) {
  const { project, error } = await requireOwner(projectId);
  if (error) return error;

  if (!isValidDays(project.days)) return { error: "先に旅行の日数を決めてください" };
  if (!isValidDate(startDate)) return INVALID_INPUT;

  await prisma.scheduleCandidate.upsert({
    where: { projectId_startDate: { projectId, startDate } },
    create: { projectId, startDate },
    update: {},
  });
  refresh(projectId);
  return { ok: true };
}

export async function deleteCandidate(projectId, candidateId) {
  const { error } = await requireOwner(projectId);
  if (error) return error;

  await prisma.scheduleCandidate.deleteMany({ where: { id: candidateId, projectId } });
  refresh(projectId);
  return { ok: true };
}

// 候補に ○（yes）・△（maybe）・×（no）で投票する。同じ候補にもう一度投票すると上書きする
export async function voteCandidate(projectId, candidateId, answer) {
  const { me, error } = await requireMe(projectId);
  if (error) return error;

  if (!ANSWERS.some((a) => a.id === answer)) return INVALID_INPUT;
  const candidate = await prisma.scheduleCandidate.findFirst({ where: { id: candidateId, projectId } });
  if (!candidate) return { error: "候補が見つかりません。画面を読み込み直してください" };

  await prisma.scheduleVote.upsert({
    where: { candidateId_participantId: { candidateId, participantId: me.id } },
    create: { candidateId, participantId: me.id, answer },
    update: { answer },
  });
  refresh(projectId);
  return { ok: true };
}

// 作成者が、候補の中から日程を確定する
export async function decideSchedule(projectId, candidateId) {
  const { project, error } = await requireOwner(projectId);
  if (error) return error;

  const candidate = await prisma.scheduleCandidate.findFirst({ where: { id: candidateId, projectId } });
  if (!candidate) return { error: "候補が見つかりません。画面を読み込み直してください" };
  if (!isValidDays(project.days)) return { error: "先に旅行の日数を決めてください" };

  await prisma.project.update({
    where: { id: projectId },
    data: { startDate: candidate.startDate, endDate: tripEndDate(candidate.startDate, project.days) },
  });
  refresh(projectId);
  return { ok: true };
}

// 作成者が、確定した日程を取り消して日程調整に戻す（候補や投票は残る）
export async function reopenSchedule(projectId) {
  const { project, error } = await requireOwner(projectId);
  if (error) return error;

  // 日数が入っていない古いプロジェクトは、決まっていた日程から日数を出しておく
  let days = project.days;
  if (!isValidDays(days) && project.startDate && project.endDate) {
    const span = daysBetween(project.startDate, project.endDate) + 1;
    days = isValidDays(span) ? span : null;
  }
  if (!isValidDays(days)) return { error: "先に旅行の日数を決めてください（プロジェクトの編集から）" };

  await prisma.project.update({ where: { id: projectId }, data: { startDate: "", endDate: "", days } });
  refresh(projectId);
  return { ok: true };
}
