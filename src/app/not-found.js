import Link from "next/link";
import { auth } from "@/auth";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { primaryButtonClass } from "@/components/ui";

export const metadata = {
  title: "ページが見つかりません | 旅行清算アプリ",
};

// URL が間違っているときや、プロジェクトが削除された・メンバーから外されたときに表示する
export default async function NotFound() {
  // ログインしていなければマイプロジェクトは開けないので、行き先をトップにする
  const session = await auth();
  const home = session ? { href: "/projects", label: "マイプロジェクトへ" } : { href: "/", label: "トップページへ" };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader logoHref={home.href} />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-5 pb-24 text-center">
        <p className="amount text-6xl text-primary-light">404</p>
        <h1 className="heading text-2xl">ページが見つかりません</h1>
        <p className="leading-relaxed text-ink-sub">URLが間違っていないか、確かめてください。</p>
        <p className="text-sm leading-relaxed text-ink-muted">
          プロジェクトのページの場合は、プロジェクトが削除されたか、メンバーから外されている可能性があります。
        </p>
        <Link href={home.href} className={`${primaryButtonClass} mt-3 min-h-12 px-6`}>
          {home.label}
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
