import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActor } from "@/lib/actor";
import { formatGuestCode, guestCookieName, normalizeGuestCode } from "@/lib/guestCode";
import SiteHeader from "@/components/SiteHeader";
import GuestCodePanel from "@/components/GuestCodePanel";

export const metadata = {
  title: "復帰用コード | 旅行清算アプリ",
};

// ゲストとして参加・作成した直後に、復帰用コードと専用リンクを見せる。
// コードはこのブラウザの Cookie から読む（本人のブラウザでしか見られない）
export default async function GuestWelcomePage({ params, searchParams }) {
  const { id } = await params;
  const { participant, isGuest } = await getActor(id);
  if (!participant || !isGuest) redirect(`/projects/${id}`);

  const code = normalizeGuestCode((await cookies()).get(guestCookieName(id))?.value);
  if (!code) redirect(`/projects/${id}`);

  const project = await prisma.project.findUnique({ where: { id }, select: { title: true } });
  const { created } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader logoHref="/" />
      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <GuestCodePanel
          code={formatGuestCode(code)}
          projectId={id}
          projectTitle={project.title}
          heading={created ? "プロジェクトを作りました" : "ゲストとして参加しました"}
        />
      </main>
    </div>
  );
}
