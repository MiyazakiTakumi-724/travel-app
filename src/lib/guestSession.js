import { cookies, headers } from "next/headers";
import { prisma } from "./prisma";
import { keyedHash } from "./secretHash";
import {
  generateGuestCode,
  GUEST_COOKIE_OPTIONS,
  guestCookieName,
  hashGuestCode,
  legacyHashGuestCode,
  normalizeGuestCode,
} from "./guestCode";

// 回数の制限。同じ端末（IPアドレス）から、決まった時間のあいだに何回までできるか
const RATE_LIMITS = {
  // 復帰用コードの入力ミス：15分に10回まで
  "guest-code": { windowMs: 15 * 60 * 1000, max: 10 },
  // ゲストでのプロジェクト作成：1時間に10件まで
  "guest-create": { windowMs: 60 * 60 * 1000, max: 10 },
};
// 記録はいちばん長い制限の時間だけ残し、それより古いものは消す
const KEEP_RECORDS_MS = Math.max(...Object.values(RATE_LIMITS).map((limit) => limit.windowMs));

// IPアドレスはそのまま保存せず、サーバーの鍵を使ったハッシュにして回数を数える
async function rateLimitKey(kind) {
  const forwarded = (await headers()).get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0].trim() || "unknown";
  return keyedHash("rate-limit", `${kind}:${ip}`);
}

// 制限を超えていれば true
export async function isRateLimited(kind) {
  const { windowMs, max } = RATE_LIMITS[kind];
  const key = await rateLimitKey(kind);
  const since = new Date(Date.now() - windowMs);
  return (await prisma.guestCodeAttempt.count({ where: { key, createdAt: { gte: since } } })) >= max;
}

// 1回分を記録する（古い記録はついでに消す）
export async function recordRateLimit(kind) {
  await prisma.guestCodeAttempt.create({ data: { key: await rateLimitKey(kind) } });
  await prisma.guestCodeAttempt.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - KEEP_RECORDS_MS) } } });
}

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

// 復帰用コード（そろえた形）から参加者を探す。
// 以前の形式（鍵なしのハッシュ）で保存されていたら、見つけたときに新しい形式へ置き換える
export async function findParticipantByGuestCode(normalized) {
  if (!normalized) return null;
  const hash = hashGuestCode(normalized);
  const participant = await prisma.participant.findUnique({ where: { guestCodeHash: hash } });
  if (participant) return participant;

  const legacy = await prisma.participant.findUnique({ where: { guestCodeHash: legacyHashGuestCode(normalized) } });
  if (!legacy) return null;
  return prisma.participant.update({ where: { id: legacy.id }, data: { guestCodeHash: hash } });
}

// このブラウザに、そのプロジェクトのゲストとしてのログイン状態を保存する
export async function setGuestCookie(projectId, code) {
  (await cookies()).set(guestCookieName(projectId), normalizeGuestCode(code), GUEST_COOKIE_OPTIONS);
}

export async function clearGuestCookie(projectId) {
  (await cookies()).delete(guestCookieName(projectId));
}

// このブラウザにある、ゲストのログイン状態をすべて消す（ログアウト・アカウント削除のとき）
export async function clearAllGuestCookies() {
  const jar = await cookies();
  for (const cookie of jar.getAll()) {
    if (cookie.name.startsWith(guestCookieName(""))) jar.delete(cookie.name);
  }
}

// このブラウザでゲストとして参加しているプロジェクト（トップページなどから開けるようにする）。
// Cookie に入っている復帰用コードを1つずつ確かめ、使えるものだけを返す（新しく作った順）
export async function listBrowserGuestProjects({ exceptProjectIds = [] } = {}) {
  const prefix = guestCookieName("");
  const found = [];
  for (const cookie of (await cookies()).getAll()) {
    if (!cookie.name.startsWith(prefix) || found.length >= 20) continue;
    const projectId = cookie.name.slice(prefix.length);
    if (exceptProjectIds.includes(projectId)) continue;
    const participant = await findParticipantByGuestCode(normalizeGuestCode(cookie.value));
    if (participant?.projectId === projectId) found.push(participant);
  }
  if (found.length === 0) return [];

  const projects = await prisma.project.findMany({
    where: { id: { in: found.map((p) => p.projectId) } },
    select: { id: true, title: true, destination: true, startDate: true, endDate: true, days: true, tentativeStart: true },
    orderBy: { createdAt: "desc" },
  });
  return projects.map((project) => ({ ...project, nickname: found.find((p) => p.projectId === project.id).name }));
}

// 復帰用コードを確かめる。正しければプロジェクトのIDと、Cookie に入れる値を返す（Cookie はまだ保存しない）
export async function verifyGuestCode(rawCode) {
  if (await isRateLimited("guest-code")) {
    return { error: "コードの入力を何度も間違えたため、しばらく受け付けられません。15分ほど待ってからお試しください" };
  }

  const code = normalizeGuestCode(rawCode);
  const participant = await findParticipantByGuestCode(code);
  if (!participant) {
    await recordRateLimit("guest-code");
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
  const guest = await findParticipantByGuestCode(normalizeGuestCode(code));
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
