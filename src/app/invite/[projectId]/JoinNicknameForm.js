"use client";

import { setNicknameAndJoin } from "./actions";
import SiteHeader from "@/components/SiteHeader";
import { primaryButtonClass, textFieldClass } from "@/components/ui";

export default function JoinNicknameForm({ projectId, projectTitle }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm drop-shadow-[0_16px_24px_rgb(21_128_196/0.15)]">
          <div className="ticket-top px-7 pt-7 pb-6">
            <h1 className="break-words font-display text-2xl leading-snug">「{projectTitle}」に参加</h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-sub">
              他のメンバーに表示されるニックネームを設定してください
            </p>
          </div>

          <form
            action={setNicknameAndJoin.bind(null, projectId)}
            className="ticket-bottom flex flex-col gap-5 px-7 pt-6 pb-7"
          >
            <input
              type="text"
              name="nickname"
              required
              maxLength={20}
              aria-label="ニックネーム"
              autoFocus
              className={textFieldClass}
              placeholder="例：たろう"
            />
            <button type="submit" className={`${primaryButtonClass} min-h-[54px] text-base`}>
              参加する
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
