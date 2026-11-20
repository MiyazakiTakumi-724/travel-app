"use client";
import { useState } from "react";
import Link from "next/link";
import { CheckIcon, LinkIcon } from "./icons";
import { primaryButtonClass, secondaryButtonClass } from "./ui";
import { shareOrCopy } from "@/lib/share";
import { useCanShare, useOrigin } from "@/lib/useBrowser";

// 復帰用コードと、「コードをコピー」「リンクを自分に送る」のボタン、注意書き
export function GuestCodeDetails({ code, projectTitle }) {
  const [done, setDone] = useState("");
  // 共有メニューがある端末（スマホなど）は「自分あてに送る」、ない端末（多くのPC）は「リンクをコピー」
  const shareable = useCanShare();
  const origin = useOrigin();
  const personalUrl = origin ? `${origin}/g/${code}` : "";

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
      text: `「${projectTitle}」にゲストとして戻るための、自分用のリンクです（人には教えないでください）`,
      url: personalUrl,
    });
    if (result === "copied") flash("専用リンクをコピーしました");
    if (result === "failed") flash("コピーできませんでした。コードをメモしておいてください");
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-xs font-bold text-ink-muted">復帰用コード</p>
        <p className="mt-1 amount text-[34px] leading-tight tracking-wider text-primary">{code}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={copyCode} className={`${secondaryButtonClass} min-h-12 px-2 text-sm whitespace-nowrap`}>
          コードをコピー
        </button>
        <button type="button" onClick={sendLink} className={`${secondaryButtonClass} min-h-12 px-2 text-sm whitespace-nowrap`}>
          <LinkIcon className="shrink-0" />
          {shareable ? "自分あてに送る" : "リンクをコピー"}
        </button>
      </div>
      {done && (
        <p role="status" className="inline-flex items-center gap-1.5 text-sm font-bold text-primary">
          <CheckIcon />
          {done}
        </p>
      )}
      {personalUrl && (
        <p className="text-xs leading-relaxed text-ink-muted">
          専用リンク：<span className="break-all text-ink-sub select-all">{personalUrl}</span>
        </p>
      )}
      <p className="rounded-lg bg-[#FCECE8] px-3.5 py-2.5 text-xs leading-relaxed font-bold text-pay">
        このコードとリンクを知っている人は、そのゲストとして操作できます。本人以外には見せないでください。
      </p>
    </div>
  );
}

// ゲストとして参加・作成したあとに、復帰用コードと専用リンクを見せる
export default function GuestCodePanel({ code, projectId, projectTitle, heading = "ゲストとして参加しました", organizerHint = false }) {
  return (
    <div className="w-full max-w-sm drop-shadow-[0_16px_24px_rgb(21_128_196/0.15)]">
      <div className="ticket-top px-7 pt-7 pb-6">
        <p className="text-sm font-bold text-ink-sub">{heading}</p>
        <h1 className="mt-1 wrap-break-word heading text-2xl leading-snug">「{projectTitle}」</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-sub">
          このブラウザなら、次からはトップページからコードなしで開けます。ほかのスマホやブラウザでは、下のコードか専用リンクで戻れます。
        </p>
        {organizerHint && (
          <p className="mt-3 rounded-lg bg-sky-ground px-3.5 py-2.5 text-sm leading-relaxed text-ink-sub">
            あなたはこのプロジェクトの幹事です。コードをなくしたときに備えて、メンバーが参加したら、ほかの人も幹事にしておくと安心です（幹事どうしでコードを発行し直せます）。
          </p>
        )}
      </div>
      <div className="ticket-bottom flex flex-col gap-4 px-7 pt-6 pb-7">
        <GuestCodeDetails code={code} projectTitle={projectTitle} />
        <Link href={`/projects/${projectId}`} className={`${primaryButtonClass} min-h-13 text-base`}>
          プロジェクトを開く
        </Link>
      </div>
    </div>
  );
}
