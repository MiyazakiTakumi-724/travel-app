"use client";
import { useState } from "react";

export default function Projects() {

    // useStateの初期値設定
    const [isOpen, setisOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [destination, setDestination] = useState("");
    const [date, setDate] = useState("");

    return (
        <div className="p-20 bg-gray-100 min-h-screen">
            <button
                // プロジェクト新規作成ボタン
                onClick={() => setisOpen(!isOpen)}
                className="bg-blue-600 text-white px-6 py-3 rounded-md font-bold">
                プロジェクト新規作成
            </button>

            {isOpen && (

                // オーバーレイ
                <>
                    <div className="fixed inset-0 bg-black/50 z-40"
                        onClick={() => setisOpen(false)} />

                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 p-8 bg-white border-4 border-blue-200 rounded-xl shadow-lg w-full max-w-lg">

                        <input

                            // 新規プロジェクト入力フォーム
                            type="text"
                            className="border-2 border-gray-300 p-2 rounded-md w-full"
                            placeholder="タイトル"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                        <input
                            type="text"
                            className="border-2 border-gray-300 p-2 rounded-md w-full"
                            placeholder="目的地"
                            value={destination}
                            onChange={(e) => setDestination(e.target.value)}
                        />
                        <input
                            type="text"
                            className="border-2 border-gray-300 p-2 rounded-md w-full"
                            placeholder="期間"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                        <button
                            className="bg-blue-600 text-white px-6 py-3 rounded-md font-bold">
                            確定する
                        </button>
                    </div>
                </>
            )}
        </div>

    )
}
