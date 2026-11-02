"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { createProject } from "./actions";
import SiteHeader from "@/components/SiteHeader";
import Modal, { ModalActions } from "@/components/Modal";
import ProjectFormFields from "@/components/ProjectFormFields";
import { PlusIcon } from "@/components/icons";
import { primaryButtonClass } from "@/components/ui";
import { formatPeriod } from "@/lib/format";

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

    const addTripButtonClass =
        "flex flex-col items-center justify-center gap-2.5 rounded-lg border-2 border-dashed border-line-dashed font-bold text-primary transition-colors hover:bg-paper focus-visible:outline-2 focus-visible:outline-primary";

    return (
        <div className="flex min-h-screen flex-col">
            <SiteHeader logoHref="/projects">
                <button
                    onClick={() => signOut({ redirectTo: "/" })}
                    className="min-h-11 px-1 text-sm font-medium text-ink-muted transition-colors hover:text-ink">
                    ログアウト
                </button>
            </SiteHeader>

            <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-8 px-5 pt-8 pb-24 sm:px-6 sm:pt-12">
                <div className="flex flex-wrap items-end justify-between gap-5">
                    <h1 className="font-display text-[clamp(30px,4vw,40px)]">
                        マイプロジェクト
                    </h1>
                    <button
                        onClick={() => setisOpen(true)}
                        className={`${primaryButtonClass} min-h-[52px] gap-2.5 px-6 text-base`}>
                        <PlusIcon />
                        新しい旅行を作成
                    </button>
                </div>

                {/* プロジェクトが0の時は大きな作成ボタンを表示する */}
                {projects.length === 0 ? (
                    <button
                        onClick={() => setisOpen(true)}
                        className={`${addTripButtonClass} min-h-[260px] w-full text-lg`}>
                        <PlusIcon size={28} strokeWidth={2} />
                        最初の旅行を作成
                        <span className="text-sm font-medium text-ink-sub">まだ旅行がありません</span>
                    </button>
                ) : (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(320px,100%),1fr))] gap-6">
                        {/* 旅行ごとにきっぷの形で表示。上段がタイトルと目的地、下段が期間と人数 */}
                        {projects.map((project) => (
                            <Link
                                key={project.id}
                                href={`/projects/${project.id}`}
                                className="group flex flex-col text-ink drop-shadow-[0_12px_16px_rgb(21_128_196/0.12)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
                            >
                                <div className="ticket-top px-7 pt-6 pb-[18px]">
                                    <h2 className="truncate text-2xl font-black transition-colors group-hover:text-primary">
                                        {project.title}
                                    </h2>
                                    <p className="mt-1 truncate font-medium text-ink-sub">{project.destination || "目的地未定"}</p>
                                </div>
                                <div className="ticket-bottom flex justify-between gap-4 px-7 pt-3.5 pb-5 text-sm text-ink-sub">
                                    <span className="font-bold text-ink">{formatPeriod(project.startDate, project.endDate)}</span>
                                    <span><b className="text-ink">{project.participants.length}</b>人</span>
                                </div>
                            </Link>
                        ))}

                        <button
                            onClick={() => setisOpen(true)}
                            className={`${addTripButtonClass} min-h-[150px] text-[15px]`}>
                            <PlusIcon size={28} strokeWidth={2} />
                            旅行を追加
                        </button>
                    </div>
                )}
            </main>

            {isOpen && (
                <Modal title="新しい旅行を作成" onClose={() => setisOpen(false)}>
                    <form action={handleCreateProject} className="flex flex-col gap-5">
                        <ProjectFormFields />
                        <ModalActions
                            submitLabel="作成する"
                            onCancel={() => setisOpen(false)}
                            disabled={isPending}
                        />
                    </form>
                </Modal>
            )}
        </div>
    );
}
