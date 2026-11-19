import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActor } from "@/lib/actor";
import { redirectToLogin } from "@/lib/loginRedirect";
import PaymentsClient from "./PaymentsClient";

export default async function ProjectDetailPage({ params, searchParams }) {
  const { id } = await params;
  // Googleでログインした人か、ゲスト（復帰用コードの Cookie）のどちらかで参加している人だけが見られる
  const { participant: me, session, isGuest } = await getActor(id);

  if (!me) {
    if (session?.user?.id) notFound();
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
  if (!project) notFound();

  // ゲストのコードのハッシュと、Google のユーザーIDはブラウザに送らない。代わりに「ゲストかどうか」だけを付ける
  const participants = project.participants.map(({ guestCodeHash, userId, ...participant }) => ({
    ...participant,
    isGuest: !userId && Boolean(guestCodeHash),
  }));

  return (
    <PaymentsClient
      project={{ ...project, participants }}
      currentParticipantId={me.id}
      isOwner={me.isOwner}
      isGuest={isGuest}
    />
  );
}
