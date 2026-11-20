"use client";

import { setNicknameAndJoin } from "./actions";
import SiteHeader from "@/components/SiteHeader";
import { primaryButtonClass, textFieldClass } from "@/components/ui";
import { LIMITS } from "@/lib/limits";
import InviteSummary from "./InviteSummary";

export default function JoinNicknameForm({ inviteToken, projectTitle, details }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm drop-shadow-[0_16px_24px_rgb(21_128_196/0.15)]">
          <div className="ticket-top px-7 pt-7 pb-6">
            <h1 className="wrap-break-word heading text-2xl leading-snug">「{projectTitle}」に参加</h1>
            <InviteSummary details={details} />
            <p className="mt-2 text-sm leading-relaxed text-ink-sub">
              ほかのメンバーに表示されるニックネームを決めてください。
            </p>
          </div>

          <form
            action={setNicknameAndJoin.bind(null, inviteToken)}
            className="ticket-bottom flex flex-col gap-5 px-7 pt-6 pb-7"
          >
            <input
              type="text"
              name="nickname"
              required
              maxLength={LIMITS.nickname}
              aria-label="ニックネーム"
              autoFocus
              className={textFieldClass}
              placeholder="例：たろう"
            />
            <button type="submit" className={`${primaryButtonClass} min-h-13.5 text-base`}>
              参加する
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
