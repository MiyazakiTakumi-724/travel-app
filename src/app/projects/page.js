import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ProjectsList from "./ProjectsList";
import NicknameOverlay from "./NicknameOverlay";

export default async function ProjectsPage() {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { ownerId: session.user.id },
        { participants: { some: { userId: session.user.id } } },
      ],
    },
    include: { participants: true, payments: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <ProjectsList projects={projects} currentUserId={session.user.id} />
      {!session.user.nickname && <NicknameOverlay />}
    </>
  );
}
