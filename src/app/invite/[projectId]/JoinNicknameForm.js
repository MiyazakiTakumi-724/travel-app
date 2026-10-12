"use client";

import { setNicknameAndJoin } from "./actions";
import SiteHeader from "@/components/SiteHeader";
import { primaryButtonClass, textFieldClass } from "@/components/ui";

export default function JoinNicknameForm({ projectId, projectTitle }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm border-t-4 border-primary bg-paper p-8 shadow-card">
          <span className="font-mono text-xs font-bold tracking-[0.14em] text-primary">INVITATION</span>
          <h1 className="mt-2 break-words text-xl font-extrabold">「{projectTitle}」に参加</h1>
          <p className="mt-2 mb-6 text-sm leading-relaxed text-ink-sub">
            他のメンバーに表示されるニックネームを設定してください
          </p>

          <form action={setNicknameAndJoin.bind(null, projectId)} className="flex flex-col gap-5">
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
