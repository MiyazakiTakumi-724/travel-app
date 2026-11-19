import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { guestCookieName } from "@/lib/guestCode";
import { claimGuestParticipant } from "@/lib/guestSession";

// ゲストから Google アカウントへの引き継ぎ。Googleでログインしたあとに戻ってくる
export async function GET(request, { params }) {
  const { id } = await params;
  const back = (query = "") => NextResponse.redirect(new URL(`/projects/${id}${query}`, request.url));

  const session = await auth();
  if (!session?.user?.id) return back();

  const result = await claimGuestParticipant({
    projectId: id,
    userId: session.user.id,
    code: request.cookies.get(guestCookieName(id))?.value,
  });
  if (result === "none") return back();
  if (result === "conflict") return back("?claim=conflict");

  const response = back("?claim=done");
  response.cookies.delete(guestCookieName(id));
  return response;
}
