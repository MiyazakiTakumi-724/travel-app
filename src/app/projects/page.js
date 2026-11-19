import { auth } from "@/auth";
import { redirectToLogin } from "@/lib/loginRedirect";
import { prisma } from "@/lib/prisma";
import { listBrowserGuestProjects } from "@/lib/guestSession";
import ProjectsList from "./ProjectsList";
import NicknameOverlay from "./NicknameOverlay";

export default async function ProjectsPage() {
  const session = await auth();

  if (!session) {
    redirectToLogin("/projects");
  }

  const projects = await prisma.project.findMany({
    where: { participants: { some: { userId: session.user.id } } },
    // カードには人数だけを出す（ゲストのコードのハッシュなどは読まない）
    include: { participants: { select: { id: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <ProjectsList
        projects={projects}
        // このブラウザでゲストとして参加しているプロジェクトも、別に並べる
        guestProjects={await listBrowserGuestProjects({ exceptProjectIds: projects.map((p) => p.id) })}
      />
      {!session.user.nickname && <NicknameOverlay />}
    </>
  );
}
