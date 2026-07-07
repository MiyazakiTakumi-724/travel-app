"use client";

import { setNickname } from "./actions";

export default function NicknameOverlay() {
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" />

      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 p-8 bg-white border-4 border-blue-200 rounded-xl shadow-lg w-full max-w-sm">
        <p className="text-xl font-bold mb-1">ニックネームを設定してください</p>
        <p className="text-sm text-gray-500 mb-4">
          他のメンバーに表示される名前です
        </p>

        <form action={setNickname}>
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
            決定する
          </button>
        </form>
      </div>
    </>
  );
}
