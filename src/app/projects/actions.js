"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { isWithinLength, LIMITS } from "@/lib/limits";
import { parseProjectForm } from "@/lib/projectInput";
import { newInviteToken } from "@/lib/invite";
import { clearAllGuestCookies } from "@/lib/guestSession";
import { confirmIfAllAgreed } from "@/lib/scheduleServer";

export async function setNickname(formData) {
  const session = await auth();
  if (!session?.user?.id) return;

  const nickname = formData.get("nickname")?.toString().trim();
  if (!nickname || !isWithinLength(nickname, LIMITS.nickname)) return;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { nickname },
  });

  revalidatePath("/projects");
}

// 作成したら、そのプロジェクトのIDを返す（画面はそのプロジェクトへ移る）
export async function createProject(formData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "ログインし直してください" };

  const { data, error } = parseProjectForm(formData);
  if (error) return { error };

  const project = await prisma.project.create({
    data: {
      ...data,
      inviteToken: newInviteToken(),
      participants: {
        create: [{ name: session.user.nickname, userId: session.user.id, isOwner: true }],
      },
    },
  });

  revalidatePath("/projects");
  return { ok: true, id: project.id };
}

// ログアウトする。共用のパソコンでも安心なよう、このブラウザにあるゲストとしてのログイン状態も一緒に消す
export async function logout() {
  await clearAllGuestCookies();
  await signOut({ redirectTo: "/" });
}

// アカウントを削除する。
// ・Googleから受け取った情報（名前・メール・画像）とログインの情報を消す
// ・参加中のプロジェクトでは、支払いの記録がある分だけ、ニックネームと記録を「退会済み」として残す
//   （ほかのメンバーの精算が変わらないように）。記録がなければメンバーから外れる
// ・ほかに使っている人がいないプロジェクトは、まるごと消す
// ・幹事が自分だけだったプロジェクトは、いちばん前から参加しているメンバーを幹事にする
export async function deleteAccount() {
  const session = await auth();
  if (!session?.user?.id) return { error: "ログインし直してください" };
  const userId = session.user.id;

  const participations = await prisma.participant.findMany({
    where: { userId },
    include: {
      project: { include: { participants: { orderBy: { id: "asc" } } } },
      _count: { select: { payments: true } },
    },
  });

  const remainingProjectIds = [];
  await prisma.$transaction(async (tx) => {
    for (const me of participations) {
      const others = me.project.participants.filter((p) => p.id !== me.id && !p.retired);
      if (others.length === 0) {
        await tx.project.delete({ where: { id: me.projectId } });
        continue;
      }
      if (me.isOwner && !others.some((p) => p.isOwner)) {
        await tx.participant.update({ where: { id: others[0].id }, data: { isOwner: true } });
      }
      if (me._count.payments > 0) {
        await tx.participant.update({ where: { id: me.id }, data: { userId: null, isOwner: false, retired: true } });
      } else {
        await tx.participant.delete({ where: { id: me.id } });
      }
      remainingProjectIds.push(me.projectId);
    }
    // Googleのアカウントの情報とログインの情報（Account・Session）も、ユーザーと一緒に消える
    await tx.user.delete({ where: { id: userId } });
  });

  // 抜けた人以外が全員 ○ になった日程調整は、そのまま確定する
  for (const projectId of remainingProjectIds) await confirmIfAllAgreed(projectId);

  // ログインの Cookie も消す（セッションはユーザーと一緒に消えているので、Auth.js の signOut は使わない）
  const jar = await cookies();
  for (const name of ["authjs.session-token", "__Secure-authjs.session-token"]) jar.delete(name);
  await clearAllGuestCookies();

  revalidatePath("/projects");
  redirect("/?deleted=1");
}
