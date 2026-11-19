import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirectToLogin } from "@/lib/loginRedirect";
import PaymentsClient from "./PaymentsClient";

export default async function ProjectDetailPage({ params, searchParams }) {
  const { id } = await params;
  const session = await auth();

  if (!session) {
    // 開いていたタブ（?tab=）も含めて、ログイン後に同じ画面へ戻す
    const { tab } = await searchParams;
    redirectToLogin(`/projects/${id}${typeof tab === "string" ? `?tab=${encodeURIComponent(tab)}` : ""}`);
  }

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      participants: {
        orderBy: { id: "asc" },
        include: { availableDays: { select: { date: true } } },
      },
      payments: { orderBy: { createdAt: "asc" } },
      itineraryItems: { orderBy: { createdAt: "asc" } },
    },
  });

  const isMember =
    project?.ownerId === session.user.id ||
    project?.participants.some((p) => p.userId === session.user.id);

  if (!project || !isMember) {
    notFound();
  }

  const currentParticipant = project.participants.find(
    (p) => p.userId === session.user.id
  );

  return (
    <PaymentsClient
      project={project}
      currentParticipantId={currentParticipant?.id}
      isOwner={project.ownerId === session.user.id}
    />
  );
}
