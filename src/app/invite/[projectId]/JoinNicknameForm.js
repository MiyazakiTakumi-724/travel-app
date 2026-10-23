"use client";

import { setNicknameAndJoin } from "./actions";
import SiteHeader from "@/components/SiteHeader";
import { primaryButtonClass, textFieldClass } from "@/components/ui";

export default function JoinNicknameForm({ projectId, projectTitle }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <form
          action={setNicknameAndJoin.bind(null, projectId)}
          className="flex w-full max-w-sm flex-col gap-5 border-t-4 border-primary bg-paper p-8 shadow-card"
        >
          <h1 className="break-words text-2xl font-extrabold">{projectTitle}</h1>
          <input
            type="text"
            name="nickname"
            required
            maxLength={20}
            aria-label="ニックネーム"
            autoFocus
            className={`${textFieldClass} text-lg font-bold`}
            placeholder="ニックネーム"
          />
          <button type="submit" className={`${primaryButtonClass} min-h-[54px] text-base`}>
            参加する
          </button>
        </form>
      </main>
    </div>
  );
}
