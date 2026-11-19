import { auth } from "@/auth";
import { redirectToLogin } from "@/lib/loginRedirect";
import { prisma } from "@/lib/prisma";
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
      <ProjectsList projects={projects} />
      {!session.user.nickname && <NicknameOverlay />}
    </>
  );
}
