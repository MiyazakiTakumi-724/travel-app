import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { primaryButtonClass } from "@/components/ui";

export const metadata = {
  title: "ページが見つかりません | 旅行清算アプリ",
};

// URL が間違っているときや、プロジェクトが削除された・メンバーから外されたときに表示する
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader logoHref="/" />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-5 pb-24 text-center">
        <p className="amount text-6xl text-primary-light">404</p>
        <h1 className="heading text-2xl">ページが見つかりません</h1>
        <p className="leading-relaxed text-ink-sub">
          URLが間違っているか、プロジェクトが削除された・メンバーから外された可能性があります。
        </p>
        <Link href="/projects" className={`${primaryButtonClass} mt-3 min-h-12 px-6`}>
          マイプロジェクトへ
        </Link>
      </main>
    </div>
  );
}
