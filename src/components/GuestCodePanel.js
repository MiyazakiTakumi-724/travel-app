"use client";
import { useState } from "react";
import Link from "next/link";
import { CheckIcon, LinkIcon } from "./icons";
import { primaryButtonClass, secondaryButtonClass } from "./ui";
import { shareOrCopy } from "@/lib/share";

// ゲストとして参加・作成したあとに、復帰用コードと専用リンクを見せる
export default function GuestCodePanel({ code, projectId, projectTitle, heading = "ゲストとして参加しました" }) {
  const [done, setDone] = useState("");

  const flash = (message) => {
    setDone(message);
    setTimeout(() => setDone(""), 2500);
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      flash("コードをコピーしました");
    } catch {
      flash("コピーできませんでした。メモしておいてください");
    }
  };

  const sendLink = async () => {
    const result = await shareOrCopy({
      title: `${projectTitle}（ゲスト用）`,
      text: `「${projectTitle}」にゲストとして戻るためのリンクです（人には教えないでください）`,
      url: `${window.location.origin}/g/${code}`,
    });
    if (result === "copied") flash("専用リンクをコピーしました");
    if (result === "failed") flash("コピーできませんでした。コードをメモしておいてください");
  };

  return (
    <div className="w-full max-w-sm drop-shadow-[0_16px_24px_rgb(21_128_196/0.15)]">
      <div className="ticket-top px-7 pt-7 pb-6">
        <p className="text-sm font-bold text-ink-sub">{heading}</p>
        <h1 className="mt-1 wrap-break-word heading text-2xl leading-snug">「{projectTitle}」</h1>
        <p className="mt-4 text-xs font-bold text-ink-muted">あなたの復帰用コード</p>
        <p className="mt-1 amount text-[34px] leading-tight tracking-wider text-primary" aria-live="polite">
          {code}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-sub">
          このブラウザでは、次からはコードなしで開けます。別のスマホやブラウザで開くときは、トップページでこのコードを入力するか、専用リンクを開いてください。
        </p>
      </div>
      <div className="ticket-bottom flex flex-col gap-3 px-7 pt-6 pb-7">
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={copyCode} className={`${secondaryButtonClass} min-h-12 px-3 text-sm`}>
            コードをコピー
          </button>
          <button type="button" onClick={sendLink} className={`${secondaryButtonClass} min-h-12 px-3 text-sm`}>
            <LinkIcon />
            リンクを自分に送る
          </button>
        </div>
        {done && (
          <p role="status" className="inline-flex items-center gap-1.5 text-sm font-bold text-primary">
            <CheckIcon />
            {done}
          </p>
        )}
        <p className="rounded-lg bg-[#FCECE8] px-3.5 py-2.5 text-xs leading-relaxed font-bold text-pay">
          このコードとリンクを知っている人は、あなたとして操作できます。人には見せないでください。
        </p>
        <Link href={`/projects/${projectId}`} className={`${primaryButtonClass} min-h-13 text-base`}>
          プロジェクトを開く
        </Link>
      </div>
    </div>
  );
}
