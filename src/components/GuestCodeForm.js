"use client";
import { useState, useTransition } from "react";
import { enterGuestCode } from "@/app/guestActions";
import { secondaryButtonClass, textFieldClass } from "./ui";

// 復帰用コードを入力して、ゲストとしてプロジェクトに戻る
export default function GuestCodeForm({ initialError = "" }) {
  const [error, setError] = useState(initialError);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setError("");
        startTransition(async () => {
          // 正しいコードなら、サーバーがそのままプロジェクトへ移動させる
          const result = await enterGuestCode(formData);
          if (result?.error) setError(result.error);
        });
      }}
      className="flex flex-col gap-2">
      <label htmlFor="guest-code" className="text-sm font-bold text-ink-sub">
        復帰用コードで戻る
      </label>
      <div className="flex gap-2">
        <input
          id="guest-code"
          name="code"
          required
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={20}
          placeholder="例：K7QM3-XRP4N"
          className={`${textFieldClass} min-w-0 flex-1 amount tracking-wider uppercase placeholder:font-sans placeholder:normal-case placeholder:tracking-normal`}
        />
        <button type="submit" disabled={isPending} className={`${secondaryButtonClass} min-h-12 shrink-0 px-4 text-sm`}>
          戻る
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm font-bold text-pay">
          {error}
        </p>
      )}
    </form>
  );
}
