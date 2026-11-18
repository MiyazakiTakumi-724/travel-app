import { prisma } from "./prisma";
import { tallyAnswers, tripEndDate } from "./schedule";

// 仮決定の日程に全員が ○ と答えていたら、日程を確定する。確定したら true を返す。
// ○× の回答のときと、メンバーを外したとき（残りの全員が ○ になることがある）に呼ぶ
export async function confirmIfAllAgreed(projectId) {
  const project = await prisma.project.findUnique({ where: { id: projectId }, include: { participants: true } });
  if (!project?.tentativeStart || !project.days) return false;
  if (!tallyAnswers(project.participants).allAgreed) return false;

  await prisma.project.update({
    where: { id: projectId },
    data: {
      startDate: project.tentativeStart,
      endDate: tripEndDate(project.tentativeStart, project.days),
      tentativeStart: null,
    },
  });
  return true;
}

// 仮決定をやり直すときに、全員の ○× の答えを消す
export async function resetAnswers(projectId) {
  await prisma.participant.updateMany({ where: { projectId }, data: { tentativeAnswer: null } });
}
