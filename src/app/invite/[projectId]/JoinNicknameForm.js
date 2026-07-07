"use client";

import { setNicknameAndJoin } from "./actions";

export default function JoinNicknameForm({ projectId, projectTitle }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg shadow-gray-200/60 p-8">
        <p className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
          「{projectTitle}」に参加
        </p>
        <p className="text-sm text-gray-500 mb-5 leading-relaxed">
          他のメンバーに表示されるニックネームを設定してください
        </p>

        <form action={setNicknameAndJoin.bind(null, projectId)}>
          <input
            type="text"
            name="nickname"
            required
            maxLength={20}
            className="border border-gray-300 p-3 rounded-lg w-full mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="例：たろう"
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-bold text-sm shadow-sm transition hover:bg-blue-700"
          >
            参加する
          </button>
        </form>
      </div>
    </div>
  );
}
