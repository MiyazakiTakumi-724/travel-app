import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { claimCookieName, guestCookieName } from "@/lib/guestCode";
import { claimGuestParticipant } from "@/lib/guestSession";

// ゲストから Google アカウントへの引き継ぎ。Googleでログインしたあとに戻ってくる
export async function GET(request, { params }) {
  const { id } = await params;
  // 引き継ぎの印は1回きり。どの結果でも消す
  const back = (query = "") => {
    const response = NextResponse.redirect(new URL(`/projects/${id}${query}`, request.url));
    response.cookies.delete(claimCookieName(id));
    return response;
  };

  // 本人が「Googleでログインして引き継ぐ」を押していなければ（ほかのサイトから開かされたなど）、何もしない
  if (!request.cookies.get(claimCookieName(id))) return back();

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
