import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { prisma } from "./prisma";
import { generateGuestCode, GUEST_COOKIE_OPTIONS, guestCookieName, hashGuestCode, normalizeGuestCode } from "./guestCode";

// コードの入力ミスの制限：同じ端末（IPアドレス）から、15分のあいだに10回まで
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

// 参加者に新しい復帰用コードを発行し、ハッシュを保存してコードを返す（前のコードは使えなくなる）
export async function issueGuestCode(participantId) {
  // 50ビットあるので重なることはまずないが、重なったら作り直す
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateGuestCode();
    try {
      await prisma.participant.update({
        where: { id: participantId },
        data: { guestCodeHash: hashGuestCode(normalizeGuestCode(code)) },
      });
      return code;
    } catch (error) {
      if (error?.code !== "P2002") throw error;
    }
  }
  throw new Error("復帰用コードを発行できませんでした");
}

// このブラウザに、そのプロジェクトのゲストとしてのログイン状態を保存する
export async function setGuestCookie(projectId, code) {
  (await cookies()).set(guestCookieName(projectId), normalizeGuestCode(code), GUEST_COOKIE_OPTIONS);
}

export async function clearGuestCookie(projectId) {
  (await cookies()).delete(guestCookieName(projectId));
}

// IPアドレスはそのまま保存せず、ハッシュにして入力ミスの回数を数えるのに使う
async function attemptKey() {
  const forwarded = (await headers()).get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0].trim() || "unknown";
  return createHash("sha256").update(`guest-code:${ip}`).digest("hex");
}

// 復帰用コードを確かめる。正しければプロジェクトのIDと、Cookie に入れる値を返す（Cookie はまだ保存しない）
export async function verifyGuestCode(rawCode) {
  const key = await attemptKey();
  const since = new Date(Date.now() - ATTEMPT_WINDOW_MS);
  const recentFailures = await prisma.guestCodeAttempt.count({ where: { key, createdAt: { gte: since } } });
  if (recentFailures >= MAX_ATTEMPTS) {
    return { error: "コードの入力を何度も間違えたため、しばらく受け付けられません。15分ほど待ってからお試しください" };
  }

  const code = normalizeGuestCode(rawCode);
  const participant = code
    ? await prisma.participant.findUnique({ where: { guestCodeHash: hashGuestCode(code) } })
    : null;

  if (!participant) {
    await prisma.guestCodeAttempt.create({ data: { key } });
    // 古い記録は消しておく
    await prisma.guestCodeAttempt.deleteMany({ where: { createdAt: { lt: since } } });
    return { error: "コードが見つかりません。入力した文字を確かめてください" };
  }

  return { ok: true, projectId: participant.projectId, code };
}

// 復帰用コードでゲストとしてログインする（Server Action 用。Cookie も保存する）
export async function signInWithGuestCode(rawCode) {
  const result = await verifyGuestCode(rawCode);
  if (result.ok) await setGuestCookie(result.projectId, result.code);
  return result;
}

// ゲストとして参加していた分を、Googleでログインしたアカウントに引き継ぐ。
// 支払い・行ける日・回答などはそのままで、参加者に Google のユーザーを結びつけ、復帰用コードを消す。
// 結果は "done"（引き継いだ）・"conflict"（そのアカウントで、すでに参加している）・"none"（ゲストではない）
export async function claimGuestParticipant({ projectId, userId, code }) {
  const normalized = normalizeGuestCode(code);
  const guest = normalized ? await prisma.participant.findUnique({ where: { guestCodeHash: hashGuestCode(normalized) } }) : null;
  if (!guest || guest.projectId !== projectId || guest.userId) return "none";

  // 同じ Google アカウントで、すでにこのプロジェクトに参加していたら、2人をひとつにはまとめられない
  const already = await prisma.participant.findFirst({ where: { projectId, userId } });
  if (already) return "conflict";

  await prisma.participant.update({ where: { id: guest.id }, data: { userId, guestCodeHash: null } });
  // まだニックネームを決めていなければ、ゲストのときのニックネームを使う
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.nickname) await prisma.user.update({ where: { id: userId }, data: { nickname: guest.name } });
  return "done";
}
