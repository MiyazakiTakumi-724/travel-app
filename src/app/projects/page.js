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
    // カードに「やること」と自分の収支を出すため、支払いも必要な項目だけ読む
    include: {
      participants: { orderBy: { id: "asc" } },
      payments: { select: { payerId: true, amount: true, isSettled: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <ProjectsList projects={projects} userId={session.user.id} />
      {!session.user.nickname && <NicknameOverlay />}
    </>
  );
}
