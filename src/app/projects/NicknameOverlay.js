"use client";

import { setNickname } from "./actions";

export default function NicknameOverlay() {
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" />

      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 p-6 sm:p-8 bg-white rounded-2xl shadow-xl w-[calc(100%-2rem)] max-w-sm">
        <p className="text-lg sm:text-xl font-bold text-gray-900 mb-1">ニックネームを設定してください</p>
        <p className="text-sm text-gray-500 mb-5 leading-relaxed">
          他のメンバーに表示される名前です
        </p>

        <form action={setNickname}>
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
            決定する
          </button>
        </form>
      </div>
    </>
  );
}
