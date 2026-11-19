"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth, signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { issueGuestCode, setGuestCookie, signInWithGuestCode } from "@/lib/guestSession";
import { isWithinLength, LIMITS } from "@/lib/limits";
import { requireParticipant } from "@/lib/actor";
import { parseProjectForm } from "@/lib/projectInput";

// ニックネームをチェックする（問題なければ null）
function checkNickname(nickname) {
  if (!nickname) return { error: "ニックネームを入力してください" };
  if (!isWithinLength(nickname, LIMITS.nickname)) return { error: `ニックネームは${LIMITS.nickname}文字以内で入力してください` };
  return null;
}

// 招待リンクから、ゲストとしてプロジェクトに参加する。成功したら、復帰用コードを見せる画面へ移動する。
// （Cookie を保存すると今の画面が描き直され、招待ページが参加済みの人をプロジェクトへ移してしまうため、
//   コードは戻り値ではなく、移動先の画面で Cookie から読んで見せる）
export async function joinAsGuest(projectId, formData) {
  const nickname = formData.get("nickname")?.toString().trim() ?? "";
  const nicknameError = checkNickname(nickname);
  if (nicknameError) return nicknameError;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return { error: "プロジェクトが見つかりません" };

  const participant = await prisma.participant.create({ data: { projectId, name: nickname } });
  const code = await issueGuestCode(participant.id);
  await setGuestCookie(projectId, code);
  redirect(`/projects/${projectId}/welcome`);
}

// ゲストのままプロジェクトを作る。作った人は作成者になる。成功したら、復帰用コードを見せる画面へ移動する
export async function createGuestProject(formData) {
  const nickname = formData.get("nickname")?.toString().trim() ?? "";
  const nicknameError = checkNickname(nickname);
  if (nicknameError) return nicknameError;

  const { data, error } = parseProjectForm(formData);
  if (error) return { error };

  const project = await prisma.project.create({
    data: { ...data, participants: { create: [{ name: nickname, isOwner: true }] } },
    include: { participants: true },
  });
  const code = await issueGuestCode(project.participants[0].id);
  await setGuestCookie(project.id, code);
  redirect(`/projects/${project.id}/welcome?created=1`);
}

// トップページで復帰用コードを入力して、ゲストとしてプロジェクトに戻る
export async function enterGuestCode(formData) {
  const result = await signInWithGuestCode(formData.get("code"));
  if (result.error) return result;
  redirect(`/projects/${result.projectId}`);
}

// 復帰用コードを発行し直す（前のコードは使えなくなる）。ゲスト本人か、作成者だけができる
export async function reissueGuestCode(projectId, participantId) {
  const { participant: me, error } = await requireParticipant(projectId);
  if (error) return error;

  const target = await prisma.participant.findFirst({ where: { id: participantId, projectId } });
  if (!target || target.userId) return { error: "ゲストのメンバーが見つかりません" };
  const isSelf = target.id === me.id;
  if (!isSelf && !me.isOwner) return { error: "コードを発行し直せるのは、本人か作成者だけです" };

  const code = await issueGuestCode(target.id);
  // 自分のコードなら、このブラウザの Cookie も新しいコードにする
  if (isSelf) await setGuestCookie(projectId, code);
  revalidatePath(`/projects/${projectId}`);
  return { ok: true, code, name: target.name };
}

// ゲストから Google アカウントに引き継ぐ。Googleでログインしたあと、引き継ぎのページに戻ってくる
export async function startGuestClaim(projectId) {
  const claimPath = `/projects/${projectId}/claim`;
  if ((await auth())?.user?.id) redirect(claimPath);
  await signIn("google", { redirectTo: claimPath });
}
