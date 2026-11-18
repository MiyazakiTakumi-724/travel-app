"use client"; // エラー画面はクライアントコンポーネントにする必要がある
import { useEffect } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui";

// 画面の表示中に予期しないエラーが起きたときに表示する（通信が切れた・サーバーが一時的に落ちた など）
export default function Error({ error, retry }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader logoHref="/" />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-5 pb-24 text-center">
        <h1 className="heading text-2xl">うまく表示できませんでした</h1>
        <p className="leading-relaxed text-ink-sub">
          通信が不安定か、サーバーで問題が起きた可能性があります。少し待ってから、もう一度お試しください。
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-3">
          <button onClick={() => retry()} className={`${primaryButtonClass} min-h-12 px-6`}>
            もう一度読み込む
          </button>
          <Link href="/projects" className={`${secondaryButtonClass} min-h-12 px-6`}>
            マイプロジェクトへ
          </Link>
        </div>
      </main>
    </div>
  );
}
