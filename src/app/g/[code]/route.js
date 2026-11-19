import { NextResponse } from "next/server";
import { GUEST_COOKIE_OPTIONS, guestCookieName } from "@/lib/guestCode";
import { verifyGuestCode } from "@/lib/guestSession";

// ゲスト専用のリンク（/g/コード）。開くと、このブラウザにゲストとしてのログイン状態を保存してプロジェクトを開く
export async function GET(request, { params }) {
  const { code } = await params;
  const result = await verifyGuestCode(code);
  if (!result.ok) return NextResponse.redirect(new URL("/?guest=invalid", request.url));

  const response = NextResponse.redirect(new URL(`/projects/${result.projectId}`, request.url));
  response.cookies.set(guestCookieName(result.projectId), result.code, GUEST_COOKIE_OPTIONS);
  return response;
}
