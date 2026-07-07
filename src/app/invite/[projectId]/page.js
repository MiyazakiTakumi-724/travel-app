import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { joinProject } from "./actions";
import JoinNicknameForm from "./JoinNicknameForm";

export default async function InvitePage({ params }) {
  const { projectId } = await params;
  const session = await auth();

  if (!session) {
    redirect(`/?callbackUrl=${encodeURIComponent(`/invite/${projectId}`)}`);
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });

  if (!project) {
    notFound();
  }

  if (!session.user.nickname) {
    return <JoinNicknameForm projectId={projectId} projectTitle={project.title} />;
  }

  await joinProject(projectId);
}
