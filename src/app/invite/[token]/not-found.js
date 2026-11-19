import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { primaryButtonClass } from "@/components/ui";

export const metadata = {
  title: "招待リンクが使えません | 旅行清算アプリ",
};

// 招待リンクが古い（幹事が作り直した）か、プロジェクトが削除されたときに表示する
export default function InviteNotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader logoHref="/" />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-5 pb-24 text-center">
        <h1 className="heading text-2xl">この招待リンクは使えません</h1>
        <p className="phrase leading-relaxed text-balance text-ink-sub">
          招待リンクが作り直されたか、プロジェクトが削除された可能性があります。幹事に、新しい招待リンクを送ってもらってください。
        </p>
        <Link href="/" className={`${primaryButtonClass} mt-3 min-h-12 px-6`}>
          トップページへ
        </Link>
      </main>
    </div>
  );
}
