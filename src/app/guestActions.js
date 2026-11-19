"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth, signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CLAIM_COOKIE_OPTIONS, claimCookieName } from "@/lib/guestCode";
import { isRateLimited, issueGuestCode, recordRateLimit, setGuestCookie, signInWithGuestCode } from "@/lib/guestSession";
import { isWithinLength, LIMITS } from "@/lib/limits";
import { requireParticipant } from "@/lib/actor";
import { parseProjectForm } from "@/lib/projectInput";
import { newInviteToken } from "@/lib/invite";

// ニックネームをチェックする（問題なければ null）
function checkNickname(nickname) {
  if (!nickname) return { error: "ニックネームを入力してください" };
  if (!isWithinLength(nickname, LIMITS.nickname)) return { error: `ニックネームは${LIMITS.nickname}文字以内で入力してください` };
  return null;
}

// 招待リンクから、ゲストとしてプロジェクトに参加する。成功したら、復帰用コードを見せる画面へ移動する。
// （Cookie を保存すると今の画面が描き直され、招待ページが参加済みの人をプロジェクトへ移してしまうため、
//   コードは戻り値ではなく、移動先の画面で Cookie から読んで見せる）
export async function joinAsGuest(inviteToken, formData) {
  const nickname = formData.get("nickname")?.toString().trim() ?? "";
  const nicknameError = checkNickname(nickname);
  if (nicknameError) return nicknameError;

  // プロジェクトIDではなく、招待リンクの鍵で探す（IDを知っているだけでは参加できない）
  const project = await prisma.project.findUnique({ where: { inviteToken: String(inviteToken) } });
  if (!project) return { error: "招待リンクが見つかりません。新しいリンクをもらってください" };

  const participant = await prisma.participant.create({ data: { projectId: project.id, name: nickname } });
  const code = await issueGuestCode(participant.id);
  await setGuestCookie(project.id, code);
  redirect(`/projects/${project.id}/welcome?joined=1`);
}

// ゲストのままプロジェクトを作る。作った人は作成者になる。成功したら、復帰用コードを見せる画面へ移動する
export async function createGuestProject(formData) {
  const nickname = formData.get("nickname")?.toString().trim() ?? "";
  const nicknameError = checkNickname(nickname);
  if (nicknameError) return nicknameError;

  const { data, error } = parseProjectForm(formData);
  if (error) return { error };

  // だれでも作れるので、同じ端末から短い時間にたくさん作れないようにする
  if (await isRateLimited("guest-create")) {
    return { error: "短い時間にたくさんのプロジェクトが作られたため、しばらく作れません。1時間ほど待ってからお試しください" };
  }
  await recordRateLimit("guest-create");

  const project = await prisma.project.create({
    data: { ...data, inviteToken: newInviteToken(), participants: { create: [{ name: nickname, isOwner: true }] } },
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
  // 本人がこのボタンを押した印。引き継ぎのページは、この印があるときだけ引き継ぐ
  (await cookies()).set(claimCookieName(projectId), "1", CLAIM_COOKIE_OPTIONS);
  if ((await auth())?.user?.id) redirect(claimPath);
  await signIn("google", { redirectTo: claimPath });
}
