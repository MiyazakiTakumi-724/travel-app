"use client";

import { setNicknameAndJoin } from "./actions";

export default function JoinNicknameForm({ projectId, projectTitle }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-6">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8">
        <p className="text-xl font-bold mb-1">「{projectTitle}」に参加</p>
        <p className="text-sm text-gray-500 mb-4">
          他のメンバーに表示されるニックネームを設定してください
        </p>

        <form action={setNicknameAndJoin.bind(null, projectId)}>
          <input
            type="text"
            name="nickname"
            required
            maxLength={20}
            className="border-2 border-gray-300 p-2 rounded-md w-full mb-4"
            placeholder="例：たろう"
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-md font-bold"
          >
            参加する
          </button>
        </form>
      </div>
    </div>
  );
}
