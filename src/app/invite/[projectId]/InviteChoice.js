"use client";
import { useState, useTransition } from "react";
import { joinAsGuest } from "@/app/guestActions";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { primaryButtonClass, textFieldClass } from "@/components/ui";
import { LIMITS } from "@/lib/limits";

// ログインしていない人に、「Googleでログインして参加」と「ゲストとして参加」を選んでもらう
export default function InviteChoice({ projectId, projectTitle, signInAction }) {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const join = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError("");
    startTransition(async () => {
      // 参加できたら、サーバーが復帰用コードの画面へ移動させる
      const result = await joinAsGuest(projectId, formData);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <div className="w-full max-w-sm drop-shadow-[0_16px_24px_rgb(21_128_196/0.15)]">
      <div className="ticket-top px-7 pt-7 pb-6">
        <h1 className="wrap-break-word heading text-2xl leading-snug">「{projectTitle}」に参加</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-sub">Googleでログインするか、ゲストとして参加してください。</p>
        <div className="mt-5">
          <GoogleSignInButton action={signInAction} label="Googleでログインして参加" />
        </div>
        <p className="mt-2 text-xs leading-relaxed text-ink-muted">
          Googleで参加すると、マイプロジェクトからいつでも開けます。
        </p>
      </div>

      <form onSubmit={join} className="ticket-bottom flex flex-col gap-3 px-7 pt-6 pb-7">
        <p className="font-bold">ゲストとして参加</p>
        <p className="-mt-1 text-xs leading-relaxed text-ink-muted">
          アカウントなしで参加できます。あとから Google アカウントに引き継ぐこともできます。
        </p>
        <input
          type="text"
          name="nickname"
          required
          maxLength={LIMITS.nickname}
          aria-label="ニックネーム"
          className={textFieldClass}
          placeholder="ニックネーム（例：たろう）"
        />
        {error && (
          <p role="alert" className="text-sm font-bold text-pay">
            {error}
          </p>
        )}
        <button type="submit" disabled={isPending} className={`${primaryButtonClass} min-h-13 text-base`}>
          ゲストとして参加する
        </button>
      </form>
    </div>
  );
}
