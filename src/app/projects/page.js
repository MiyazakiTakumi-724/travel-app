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
    where: {
      OR: [
        { ownerId: session.user.id },
        { participants: { some: { userId: session.user.id } } },
      ],
    },
    include: { participants: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <ProjectsList projects={projects} />
      {!session.user.nickname && <NicknameOverlay />}
    </>
  );
}
