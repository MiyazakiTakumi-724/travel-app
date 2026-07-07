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
        <div className="p-20 bg-gray-100 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <button
                    onClick={() => setisOpen(!isOpen)}
                    className="bg-blue-600 text-white px-6 py-3 rounded-md font-bold shadow-md hover:shadow-lg text-left transition transform hover:-translate-y-1 block">
                    プロジェクト新規作成
                </button>
                <button
                    onClick={() => signOut({ redirectTo: "/" })}
                    className="text-gray-500 text-sm font-bold hover:text-gray-700">
                    ログアウト
                </button>
            </div>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* プロジェクトが0の時文字を表示する */}
                {projects.length === 0 ? (

                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400">
                        <p className="text-2xl font-bold mb-2">プロジェクト無し</p>
                        <p className="text-sm">上のボタンから新しいプロジェクトを作成してください</p>
                    </div>
                ) : (
                    // プロジェクトが1個以上ある時の表示
                    projects.map((project) => (
                        <Link
                            key={project.id}
                            href={`/projects/${project.id}`}
                            className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg text-left transition transform hover:-translate-y-1 block"
                        >
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">
                                {project.title}
                            </h2>
                            <p className="text-gray-600 font-medium">
                                目的地：{project.destination}
                            </p>
                            <p className="text-gray-600 font-medium">
                                出発日：{project.date}
                            </p>
                        </Link>
                    ))
                )}

                {isOpen && (
                    // オーバーレイ
                    <>
                        <div className="fixed inset-0 bg-black/50 z-40"
                            onClick={() => setisOpen(false)} />

                        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 p-8 bg-white border-4 border-blue-200 rounded-xl shadow-lg w-full max-w-lg">

                            <form action={handleCreateProject}>
                                <input
                                    // 新規プロジェクト入力フォーム
                                    type="text"
                                    name="title"
                                    required
                                    className="border-2 border-gray-300 p-2 rounded-md w-full mb-2"
                                    placeholder="タイトル"
                                />
                                <input
                                    type="text"
                                    name="destination"
                                    className="border-2 border-gray-300 p-2 rounded-md w-full mb-2"
                                    placeholder="目的地"
                                />
                                <input
                                    type="date"
                                    name="date"
                                    className="border-2 border-gray-300 p-2 rounded-md w-full mb-2"
                                    placeholder="期間"
                                />
                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={isPending}
                                        className="bg-blue-600 text-white px-6 py-3 rounded-md font-bold disabled:opacity-50">
                                        確定する
                                    </button>
                                </div>
                            </form>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
