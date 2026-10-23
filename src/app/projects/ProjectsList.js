"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { createProject } from "./actions";
import SiteHeader from "@/components/SiteHeader";
import Modal, { SubmitButton } from "@/components/Modal";
import ProjectFormFields from "@/components/ProjectFormFields";
import { PlusIcon } from "@/components/icons";
import { cardClass } from "@/components/ui";
import { calculateSettlements } from "@/lib/settlement";
import { balanceColorClass, formatPeriod, formatSignedYen } from "@/lib/format";

// 一覧のカードに出す「自分の収支」
function myBalanceIn(project, currentUserId) {
    const me = project.participants.find((p) => p.userId === currentUserId);
    if (!me) return 0;
    const { balances } = calculateSettlements(project.participants, project.payments);
    return Math.round(balances.get(me.name) ?? 0);
}

export default function ProjectsList({ projects, currentUserId }) {

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
        <div className="min-h-screen bg-gray-50">
            <SiteHeader logoHref="/projects">
                <button
                    onClick={() => signOut({ redirectTo: "/" })}
                    className="min-h-11 px-1 text-sm text-gray-500 transition hover:text-gray-700">
                    ログアウト
                </button>
            </SiteHeader>

            <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
                <h1 className="mb-6 text-2xl font-bold text-gray-900">旅行</h1>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {projects.map((project) => {
                        const balance = myBalanceIn(project, currentUserId);
                        const meta = [
                            formatPeriod(project.startDate, project.endDate),
                            `${project.participants.length}名`,
                        ].filter(Boolean).join("　");
                        return (
                            <Link
                                key={project.id}
                                href={`/projects/${project.id}`}
                                className={`${cardClass} flex min-h-40 flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600`}
                            >
                                <h2 className="truncate text-lg font-bold text-gray-900">{project.title}</h2>
                                {project.destination && (
                                    <p className="truncate text-sm text-gray-500">{project.destination}</p>
                                )}
                                <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                                    <span className="truncate text-sm tabular-nums text-gray-500">{meta}</span>
                                    <span className={`shrink-0 text-xl font-bold tabular-nums ${balanceColorClass(balance)}`}>
                                        {formatSignedYen(balance)}
                                    </span>
                                </div>
                            </Link>
                        );
                    })}

                    <button
                        onClick={() => setisOpen(true)}
                        aria-label="新しい旅行を作成"
                        className="flex min-h-40 items-center justify-center rounded-xl border-2 border-dashed border-gray-300 text-gray-400 transition hover:border-blue-400 hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-blue-600">
                        <PlusIcon size={32} />
                    </button>
                </div>
            </main>

            {isOpen && (
                <Modal title="新しい旅行" onClose={() => setisOpen(false)}>
                    <form action={handleCreateProject} className="flex flex-col gap-3">
                        <ProjectFormFields />
                        <SubmitButton disabled={isPending}>作成</SubmitButton>
                    </form>
                </Modal>
            )}
        </div>
    );
}
