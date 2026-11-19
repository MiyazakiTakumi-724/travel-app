"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { issueGuestCode, setGuestCookie, signInWithGuestCode } from "@/lib/guestSession";
import { isWithinLength, LIMITS } from "@/lib/limits";

// ニックネームをチェックする（問題なければ null）
function checkNickname(nickname) {
  if (!nickname) return { error: "ニックネームを入力してください" };
  if (!isWithinLength(nickname, LIMITS.nickname)) return { error: `ニックネームは${LIMITS.nickname}文字以内で入力してください` };
  return null;
}

// 招待リンクから、ゲストとしてプロジェクトに参加する。成功したら復帰用コードを返す
export async function joinAsGuest(projectId, formData) {
  const nickname = formData.get("nickname")?.toString().trim() ?? "";
  const nicknameError = checkNickname(nickname);
  if (nicknameError) return nicknameError;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return { error: "プロジェクトが見つかりません" };

  const participant = await prisma.participant.create({ data: { projectId, name: nickname } });
  const code = await issueGuestCode(participant.id);
  await setGuestCookie(projectId, code);
  return { ok: true, code, projectId };
}

// トップページで復帰用コードを入力して、ゲストとしてプロジェクトに戻る
export async function enterGuestCode(formData) {
  const result = await signInWithGuestCode(formData.get("code"));
  if (result.error) return result;
  redirect(`/projects/${result.projectId}`);
}
