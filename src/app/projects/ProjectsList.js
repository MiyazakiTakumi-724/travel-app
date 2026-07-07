"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { createProject } from "./actions";

export default function ProjectsList({ projects }) {

    // useStateの初期値設定
    const [isOpen, setisOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    // プロジェクト作成時のデータ保管用関数
    const handleCreateProject = (formData) => {
        startTransition(async () => {
            await createProject(formData);
            setisOpen(false);
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-8 sm:py-10 lg:px-12">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between gap-4 mb-6 sm:mb-8">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                        マイプロジェクト
                    </h1>
                    <button
                        onClick={() => signOut({ redirectTo: "/" })}
                        className="text-gray-400 text-sm font-medium hover:text-gray-600 transition">
                        ログアウト
                    </button>
                </div>

                <button
                    onClick={() => setisOpen(!isOpen)}
                    className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-lg font-bold shadow-sm transition hover:bg-blue-700 hover:shadow-md active:scale-[0.99] mb-8 sm:mb-10">
                    ＋ プロジェクト新規作成
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">

                    {/* プロジェクトが0の時文字を表示する */}
                    {projects.length === 0 ? (

                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400">
                            <p className="text-xl sm:text-2xl font-bold mb-2 text-gray-500">プロジェクト無し</p>
                            <p className="text-sm">上のボタンから新しいプロジェクトを作成してください</p>
                        </div>
                    ) : (
                        // プロジェクトが1個以上ある時の表示
                        projects.map((project) => (
                            <Link
                                key={project.id}
                                href={`/projects/${project.id}`}
                                className="bg-white p-5 sm:p-6 rounded-xl border border-gray-100 shadow-sm text-left transition hover:shadow-md hover:-translate-y-0.5 block"
                            >
                                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 truncate">
                                    {project.title}
                                </h2>
                                <p className="text-sm text-gray-500 mb-1">
                                    目的地：{project.destination || "未定"}
                                </p>
                                <p className="text-sm text-gray-500">
                                    出発日：{project.date || "未定"}
                                </p>
                            </Link>
                        ))
                    )}

                    {isOpen && (
                        // オーバーレイ
                        <>
                            <div className="fixed inset-0 bg-black/50 z-40"
                                onClick={() => setisOpen(false)} />

                            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 p-6 sm:p-8 bg-white rounded-2xl shadow-xl w-[calc(100%-2rem)] max-w-md">
                                <h2 className="text-lg font-bold text-gray-900 mb-4">新規プロジェクト</h2>

                                <form action={handleCreateProject} className="flex flex-col gap-3">
                                    <input
                                        // 新規プロジェクト入力フォーム
                                        type="text"
                                        name="title"
                                        required
                                        className="border border-gray-300 p-3 rounded-lg w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="タイトル"
                                    />
                                    <input
                                        type="text"
                                        name="destination"
                                        className="border border-gray-300 p-3 rounded-lg w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="目的地"
                                    />
                                    <input
                                        type="date"
                                        name="date"
                                        className="border border-gray-300 p-3 rounded-lg w-full text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="期間"
                                    />
                                    <div className="flex justify-end gap-2 mt-2">
                                        <button
                                            type="button"
                                            onClick={() => setisOpen(false)}
                                            className="text-gray-500 px-4 py-2.5 rounded-lg font-bold text-sm hover:bg-gray-100 transition">
                                            キャンセル
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isPending}
                                            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold text-sm shadow-sm transition hover:bg-blue-700 disabled:opacity-50">
                                            確定する
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
