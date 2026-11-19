import { redirect } from "next/navigation";

// ログインしていないときはトップ（ログイン画面）へ送り、ログインしたら元のページに戻れるようにする
export function redirectToLogin(path) {
  redirect(`/?callbackUrl=${encodeURIComponent(path)}`);
}

// ログインのあとに戻るページ。このサイトの中のパスだけを受け付け、外のサイトへは飛ばさない。
// 「/\example.com」や「/<タブ>/example.com」は、ブラウザが「//example.com」（外のサイト）と読むので、
// 文字の並びではなく URL として読んでから、同じサイトかを確かめる
export function safeCallbackPath(value, fallback = "/projects") {
  if (typeof value !== "string" || !value.startsWith("/")) return fallback;
  const base = "http://localhost";
  try {
    const url = new URL(value, base);
    if (url.origin !== base) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
