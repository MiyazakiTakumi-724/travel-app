import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import PaymentsClient from "./PaymentsClient";

export default async function ProjectDetailPage({ params }) {
  const { id } = await params;
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      participants: true,
      payments: { orderBy: { createdAt: "asc" } },
    },
  });

  const isMember =
    project?.ownerId === session.user.id ||
    project?.participants.some((p) => p.userId === session.user.id);

  if (!project || !isMember) {
    notFound();
  }

  return <PaymentsClient project={project} />;
}
