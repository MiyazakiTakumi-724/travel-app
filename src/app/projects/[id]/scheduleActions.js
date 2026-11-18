"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { assertOwner, findMyParticipant, INVALID_INPUT, LOGIN_REQUIRED, NOT_MEMBER, OWNER_ONLY } from "@/lib/access";
import { daysBetween, isValidDate } from "@/lib/dates";
import { ANSWERS, fitsInRange, schedulePhase } from "@/lib/schedule";
import { confirmIfAllAgreed, resetAnswers } from "@/lib/scheduleServer";

// 日程調整の流れ
// 1. メンバーが行ける日を付けて提出する（全員が提出するまで次に進めない）
// 2. 作成者が、提出された行ける日を見て日程を仮決定する
// 3. メンバーが仮決定の日程に ○× で答え、全員が ○ なら自動で確定する

const refresh = (projectId) => {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
};

const loadProject = (projectId) =>
  prisma.project.findUnique({ where: { id: projectId }, include: { participants: true } });

// ログイン中の人の、このプロジェクトでの参加者を取り出す
async function requireMe(projectId) {
  const session = await auth();
  if (!session?.user?.id) return { error: LOGIN_REQUIRED };
  const me = await findMyParticipant(projectId, session.user.id);
  if (!me) return { error: NOT_MEMBER };
  return { me, project: await loadProject(projectId) };
}

async function requireOwner(projectId) {
  const session = await auth();
  if (!session?.user?.id) return { error: LOGIN_REQUIRED };
  if (!(await assertOwner(projectId, session.user.id))) return { error: OWNER_ONLY };
  return { me: await findMyParticipant(projectId, session.user.id), project: await loadProject(projectId) };
}

const inRange = (project, date) =>
  isValidDate(date) && daysBetween(project.rangeStart, date) >= 0 && daysBetween(date, project.rangeEnd) >= 0;

// 自分の「行ける日」を付けたり外したりする（提出するまでは何度でも変えられる）
export async function setAvailable(projectId, date, available) {
  const { me, project, error } = await requireMe(projectId);
  if (error) return error;

  if (schedulePhase(project, project.participants) === "notStarted" || !inRange(project, date)) return INVALID_INPUT;
  if (me.availabilitySubmitted) return { error: "提出済みです。変えるときは「修正する」を押してください" };

  if (available) {
    await prisma.availableDay.upsert({
      where: { participantId_date: { participantId: me.id, date } },
      create: { participantId: me.id, date },
      update: {},
    });
  } else {
    await prisma.availableDay.deleteMany({ where: { participantId: me.id, date } });
  }
  refresh(projectId);
  return { ok: true };
}

// 行ける日を提出する
export async function submitAvailability(projectId) {
  const { me, project, error } = await requireMe(projectId);
  if (error) return error;
  if (schedulePhase(project, project.participants) === "notStarted") return INVALID_INPUT;

  await prisma.participant.update({ where: { id: me.id }, data: { availabilitySubmitted: true } });
  refresh(projectId);
  return { ok: true };
}

// 提出を取り消して、行ける日を付け直す（作成者が仮決定する前だけ）
export async function unsubmitAvailability(projectId) {
  const { me, project, error } = await requireMe(projectId);
  if (error) return error;

  const phase = schedulePhase(project, project.participants);
  if (phase === "voting" || phase === "decided") {
    return { error: "日程が仮決定されたので、行ける日は変えられません" };
  }

  await prisma.participant.update({ where: { id: me.id }, data: { availabilitySubmitted: false } });
  refresh(projectId);
  return { ok: true };
}

// 作成者が日程を仮決定する（全員が提出したあとだけ）。作成者自身は ○ と答えたことにする
export async function proposeSchedule(projectId, startDate) {
  const { me, project, error } = await requireOwner(projectId);
  if (error) return error;

  const phase = schedulePhase(project, project.participants);
  if (phase === "collecting") return { error: "まだ行ける日を提出していないメンバーがいます" };
  if (phase !== "choosing") return INVALID_INPUT;
  if (!isValidDate(startDate) || !fitsInRange(startDate, project)) return { error: "期間の中の日程を選んでください" };

  await resetAnswers(projectId);
  await prisma.project.update({ where: { id: projectId }, data: { tentativeStart: startDate } });
  if (me) await prisma.participant.update({ where: { id: me.id }, data: { tentativeAnswer: "yes" } });
  // メンバーが作成者だけなら、そのまま確定する
  await confirmIfAllAgreed(projectId);

  refresh(projectId);
  return { ok: true };
}

// 仮決定の日程に ○（yes）・×（no）で答える。全員が ○ になったら自動で確定する
export async function answerTentative(projectId, answer) {
  const { me, project, error } = await requireMe(projectId);
  if (error) return error;

  if (!ANSWERS.some((a) => a.id === answer)) return INVALID_INPUT;
  if (schedulePhase(project, project.participants) !== "voting") {
    return { error: "仮決定の日程がありません。画面を読み込み直してください" };
  }

  await prisma.participant.update({ where: { id: me.id }, data: { tentativeAnswer: answer } });
  const confirmed = await confirmIfAllAgreed(projectId);

  refresh(projectId);
  return { ok: true, confirmed };
}

// 作成者が仮決定を取り消して、日程を選び直す（行ける日の提出はそのまま）
export async function cancelTentative(projectId) {
  const { error } = await requireOwner(projectId);
  if (error) return error;

  await resetAnswers(projectId);
  await prisma.project.update({ where: { id: projectId }, data: { tentativeStart: null } });
  refresh(projectId);
  return { ok: true };
}

// 作成者が、確定した日程を取り消して選び直す（行ける日の提出はそのまま）
export async function reopenSchedule(projectId) {
  const { project, error } = await requireOwner(projectId);
  if (error) return error;
  if (!project.days || !project.rangeStart || !project.rangeEnd) {
    return { error: "編集で「これから決める」を選び、旅行の日数と期間を入れてください" };
  }

  await resetAnswers(projectId);
  await prisma.project.update({
    where: { id: projectId },
    data: { startDate: "", endDate: "", tentativeStart: null },
  });
  refresh(projectId);
  return { ok: true };
}
