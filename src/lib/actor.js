import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "./prisma";
import { guestCookieName, normalizeGuestCode } from "./guestCode";
import { findParticipantByGuestCode } from "./guestSession";
import { LOGIN_REQUIRED, NOT_MEMBER, OWNER_ONLY } from "./access";

// このプロジェクトで操作しているのは誰か（参加者）を調べる。
// Googleでログインしていればその人の参加者、していなければゲストの Cookie（復帰用コード）から探す
export async function getActor(projectId) {
  const session = await auth();
  if (session?.user?.id) {
    const participant = await prisma.participant.findFirst({ where: { projectId, userId: session.user.id } });
    if (participant) return { participant, session, isGuest: false };
  }

  const code = normalizeGuestCode((await cookies()).get(guestCookieName(projectId))?.value);
  const participant = await findParticipantByGuestCode(code);
  if (participant?.projectId === projectId) return { participant, session, isGuest: true };

  return { participant: null, session, isGuest: false };
}

// 参加者でなければエラーを返す（Server Action 用）
export async function requireParticipant(projectId) {
  const actor = await getActor(projectId);
  if (actor.participant) return actor;
  return { error: actor.session?.user?.id ? NOT_MEMBER : LOGIN_REQUIRED };
}

// 作成者でなければエラーを返す（Server Action 用）
export async function requireOwner(projectId) {
  const actor = await requireParticipant(projectId);
  if (actor.error) return actor;
  if (!actor.participant.isOwner) return { error: OWNER_ONLY };
  return actor;
}
