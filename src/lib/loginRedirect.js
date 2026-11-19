import { redirect } from "next/navigation";

// ログインしていないときはトップ（ログイン画面）へ送り、ログインしたら元のページに戻れるようにする
export function redirectToLogin(path) {
  redirect(`/?callbackUrl=${encodeURIComponent(path)}`);
}
