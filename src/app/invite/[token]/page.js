import { notFound, redirect } from "next/navigation";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getActor } from "@/lib/actor";
import SiteHeader from "@/components/SiteHeader";
import { joinProject } from "./actions";
import JoinNicknameForm from "./JoinNicknameForm";
import InviteChoice from "./InviteChoice";
import { formatTripPeriod } from "@/lib/format";
import { OG_IMAGE } from "@/lib/ogImage";

// 招待リンクの鍵から、プロジェクトと参加中のメンバー（名前と幹事かどうか）を読む
const loadInvite = (token) =>
  prisma.project.findUnique({
    where: { inviteToken: token },
    include: { participants: { where: { retired: false }, select: { name: true, isOwner: true }, orderBy: { id: "asc" } } },
  });

// 招待画面と、LINE などのリンクのプレビューに出す、旅行の内容
function inviteDetails(project) {
  return {
    destination: project.destination,
    period: formatTripPeriod(project),
    organizers: project.participants.filter((p) => p.isOwner).map((p) => p.name).join("、"),
    memberCount: project.participants.length,
  };
}

// リンクを LINE などで送ったときに、旅行の名前・目的地・日程がプレビューに出るようにする
export async function generateMetadata({ params }) {
  const { token } = await params;
  const project = await loadInvite(token);
  if (!project) return { title: "招待リンクが使えません | 旅行清算アプリ", robots: { index: false } };

  const details = inviteDetails(project);
  const title = `「${project.title}」に参加しよう`;
  const description = `${[details.destination, details.period].filter(Boolean).join("・")}。旅行清算アプリで、日程調整と支払いの記録・精算をみんなで共有します。`;
  return {
    title: `${title} | 旅行清算アプリ`,
    description,
    openGraph: { title, description, siteName: "旅行清算アプリ", type: "website", images: [OG_IMAGE] },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE.url] },
    // 招待リンクは検索に出さない
    robots: { index: false, follow: false },
  };
}

// 招待リンク（/invite/〇〇）。〇〇はプロジェクトIDではなく、作り直せる招待用の鍵
export default async function InvitePage({ params }) {
  const { token } = await params;

  const project = await loadInvite(token);
  if (!project) notFound();
  const details = inviteDetails(project);

  // すでに参加している（Googleでもゲストでも）なら、そのままプロジェクトを開く
  const { participant, session } = await getActor(project.id);
  if (participant) redirect(`/projects/${project.id}`);

  // ログインしていなければ、「Googleで参加」か「ゲストで参加」を選んでもらう
  if (!session?.user?.id) {
    async function signInWithGoogle() {
      "use server";
      await signIn("google", { redirectTo: `/invite/${token}` });
    }
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader logoHref="/" />
        <main className="flex flex-1 items-center justify-center px-5 py-12">
          <InviteChoice inviteToken={token} projectTitle={project.title} details={details} signInAction={signInWithGoogle} />
        </main>
      </div>
    );
  }

  if (!session.user.nickname) {
    return <JoinNicknameForm inviteToken={token} projectTitle={project.title} details={details} />;
  }

  await joinProject(token);
}
