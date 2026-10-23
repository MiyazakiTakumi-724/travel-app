"use client";

import { setNicknameAndJoin } from "./actions";
import SiteHeader from "@/components/SiteHeader";
import { cardClass, primaryButtonClass, textFieldClass } from "@/components/ui";

export default function JoinNicknameForm({ projectId, projectTitle, memberNames = [] }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <SiteHeader />

      <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-10">
        <form
          action={setNicknameAndJoin.bind(null, projectId)}
          className={`${cardClass} flex w-full max-w-sm flex-col p-7`}
        >
          <h1 className="break-words text-2xl font-bold text-gray-900">{projectTitle}</h1>
          {memberNames.length > 0 && (
            <p className="mt-1 text-sm text-gray-500">{memberNames.join("・")} が参加中</p>
          )}
          <input
            type="text"
            name="nickname"
            required
            maxLength={20}
            autoFocus
            aria-label="ニックネーム"
            placeholder="ニックネーム"
            className={`${textFieldClass} mt-6`}
          />
          <button type="submit" className={`${primaryButtonClass} mt-4 min-h-12 w-full`}>
            参加する
          </button>
        </form>
      </main>
    </div>
  );
}
