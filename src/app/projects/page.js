"use client";
import { useState } from "react";
import Link from "next/link";

export default function Projects() {

    // useStateの初期値設定
    const [isOpen, setisOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [destination, setDestination] = useState("");
    const [date, setDate] = useState("");
    const [projects, setProjects] = useState([
        { id: 1, title: "スノボ合宿", destination: "舞子スノーリゾート", date: "3/2~3/5" }
    ]);

    // プロジェクト作成時のデータ保管用関数
    const AddProject = () => {
        const newProject = {
            id: Date.now(),
            title: title,
            destination: destination,
            date: date
        };

        setProjects([...projects, newProject])

        setisOpen(false);
        setTitle("");
        setDestination("");
        setDate("")
    };

    return (
        <div className="p-20 bg-gray-100 min-h-screen">
            <button
                onClick={() => setisOpen(!isOpen)}
                className="bg-blue-600 text-white px-6 py-3 rounded-md font-bold">
                プロジェクト新規作成
            </button>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">


                {projects.map((project) => (
                    //プロジェクトのページに遷移するボタン
                    <Link
                        key={project.id}
                        href={`/projects/${project.id}?title=${project.title}&destination=${project.destination}&date=${project.date}`}
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
                ))}

                {isOpen && (

                    // オーバーレイ
                    <>
                        <div className="fixed inset-0 bg-black/50 z-40"
                            onClick={() => setisOpen(false)} />

                        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 p-8 bg-white border-4 border-blue-200 rounded-xl shadow-lg w-full max-w-lg">

                            <input

                                // 新規プロジェクト入力フォーム
                                type="text"
                                className="border-2 border-gray-300 p-2 rounded-md w-full mb-2"
                                placeholder="タイトル"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                            <input
                                type="text"
                                className="border-2 border-gray-300 p-2 rounded-md w-full mb-2"
                                placeholder="目的地"
                                value={destination}
                                onChange={(e) => setDestination(e.target.value)}
                            />
                            <input
                                type="date"
                                className="border-2 border-gray-300 p-2 rounded-md w-full mb-2"
                                placeholder="期間"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                            <div className="flex justify-end">
                                <button
                                    onClick={AddProject}
                                    className="bg-blue-600 text-white px-6 py-3 rounded-md font-bold">
                                    確定する
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
