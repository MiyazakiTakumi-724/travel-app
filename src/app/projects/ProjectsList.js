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
        "flex flex-col items-center justify-center gap-2.5 border-[1.5px] border-dashed border-[#6FAFD0] font-bold text-primary transition-colors hover:bg-paper focus-visible:outline-2 focus-visible:outline-primary";

    return (
        <div className="flex min-h-screen flex-col">
            <SiteHeader logoHref="/projects">
                <button
                    onClick={() => signOut({ redirectTo: "/" })}
                    className="min-h-11 px-1 text-sm font-medium text-ink-muted transition-colors hover:text-ink">
                    ログアウト
                </button>
            </SiteHeader>

            <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-10 px-6 pt-10 pb-24 sm:pt-14">
                <div className="flex flex-wrap items-end justify-between gap-5">
                    <h1 className="text-[32px] font-extrabold tracking-[-0.01em] sm:text-[40px]">
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
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-6">
                        {projects.map((project) => (
                            <Link
                                key={project.id}
                                href={`/projects/${project.id}`}
                                className="flex flex-col border-t-4 border-primary bg-paper text-ink shadow-card transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
                            >
                                <div className="px-6 pt-6 pb-[18px]">
                                    <h2 className="truncate text-[22px] font-extrabold">{project.title}</h2>
                                </div>
                                <div className="mx-6 border-t border-dashed border-line-dashed" />
                                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 px-6 pt-[18px] pb-[22px] text-sm">
                                    <dt className="text-ink-muted">目的地</dt>
                                    <dd className="min-w-0 truncate font-bold">{project.destination || "未定"}</dd>
                                    <dt className="text-ink-muted">期間</dt>
                                    <dd className="font-mono">{formatPeriod(project.startDate, project.endDate)}</dd>
                                    <dt className="text-ink-muted">メンバー</dt>
                                    <dd className="font-mono">{project.participants.length}名</dd>
                                </dl>
                            </Link>
                        ))}

                        <button
                            onClick={() => setisOpen(true)}
                            className={`${addTripButtonClass} min-h-[210px] text-[15px]`}>
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
