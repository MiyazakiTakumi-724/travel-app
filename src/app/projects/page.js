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
    where: { ownerId: session.user.id },
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
