"use client";
import { useState, useTransition } from "react";
import { LinkIcon } from "@/components/icons";
import { secondaryButtonClass, textButtonClass } from "@/components/ui";
import { useConfirm } from "@/components/ConfirmDialog";
import { resetInviteLink } from "./actions";
import { runServerAction } from "@/lib/runServerAction";
import { shareOrCopy } from "@/lib/share";
import { useCanShare, useOrigin } from "@/lib/useBrowser";

// 招待リンクの URL と、送る（スマホ）・コピー（PC）のボタン。
// URL は文字でも出すので、コピーできない環境でも長押しや選択で写せる。幹事には「作り直す」も出す
export default function InviteLinkBox({ project, isOwner = false, allowReset = false }) {
  const [isPending, startTransition] = useTransition();
  const [confirmDialog, confirm] = useConfirm();
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState(null);
  const shareable = useCanShare();
  const origin = useOrigin();
  const inviteUrl = origin ? `${origin}/invite/${project.inviteToken}` : "";

  const handleCopy = async () => {
    setMessage(null);
    const result = await shareOrCopy({
      title: `${project.title}の招待`,
      text: `旅行清算アプリの「${project.title}」に参加してください`,
      url: inviteUrl,
    });
    if (result === "copied") {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else if (result === "failed") {
      setMessage({ error: true, text: "コピーできませんでした。リンクの文字を長押しして写してください" });
    }
  };

  const handleReset = async () => {
    const ok = await confirm({
      title: "招待リンクを作り直しますか？",
      message: "今の招待リンクは使えなくなります（参加済みのメンバーはそのままです）。",
      confirmLabel: "作り直す",
    });
    if (!ok) return;
    setMessage(null);
    startTransition(async () => {
      const result = await runServerAction(() => resetInviteLink(project.id));
      setMessage(
        result.error
          ? { error: true, text: result.error }
          : { error: false, text: "新しい招待リンクにしました。参加してほしい人には、新しいリンクを送ってください" }
      );
    });
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2 rounded-lg border-[1.5px] border-line-dashed bg-paper py-1.5 pr-1.5 pl-3">
        <a
          href={inviteUrl || undefined}
          aria-label="招待リンク"
          className="min-w-0 flex-1 truncate text-sm text-primary underline select-all">
          {inviteUrl || "招待リンク"}
        </a>
        <button
          type="button"
          onClick={handleCopy}
          className={`${secondaryButtonClass} min-h-10 shrink-0 gap-1.5 px-3 text-sm whitespace-nowrap`}>
          <LinkIcon className="shrink-0" />
          <span aria-live="polite">{copied ? "コピーしました" : shareable ? "送る" : "コピー"}</span>
        </button>
      </div>
      {message && (
        <p role={message.error ? "alert" : "status"} className={`text-xs leading-relaxed font-bold ${message.error ? "text-pay" : "text-primary"}`}>
          {message.text}
        </p>
      )}
      {isOwner && allowReset && (
        <button type="button" onClick={handleReset} disabled={isPending} className={`${textButtonClass} self-center hover:text-ink`}>
          招待リンクを作り直す
        </button>
      )}
      {confirmDialog}
    </div>
  );
}
