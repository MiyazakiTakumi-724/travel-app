import { notFound, redirect } from "next/navigation";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getActor } from "@/lib/actor";
import SiteHeader from "@/components/SiteHeader";
import { joinProject } from "./actions";
import JoinNicknameForm from "./JoinNicknameForm";
import InviteChoice from "./InviteChoice";

// 招待リンク（/invite/〇〇）。〇〇はプロジェクトIDではなく、作り直せる招待用の鍵
export default async function InvitePage({ params }) {
  const { token } = await params;

  const project = await prisma.project.findUnique({ where: { inviteToken: token } });
  if (!project) notFound();

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
          <InviteChoice inviteToken={token} projectTitle={project.title} signInAction={signInWithGoogle} />
        </main>
      </div>
    );
  }

  if (!session.user.nickname) {
    return <JoinNicknameForm inviteToken={token} projectTitle={project.title} />;
  }

  await joinProject(token);
}
