"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { createProject } from "./actions";
import SiteHeader, { GuideLink } from "@/components/SiteHeader";
import Modal, { ModalActions } from "@/components/Modal";
import ProjectFormFields from "@/components/ProjectFormFields";
import { PlusIcon } from "@/components/icons";
import { primaryButtonClass } from "@/components/ui";
import { formatPeriod } from "@/lib/format";
import { useAutoRefresh } from "@/lib/useAutoRefresh";

export default function ProjectsList({ projects }) {

    // useStateの初期値設定
    const [isOpen, setisOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    // 招待された旅行や、ほかのメンバーが作った変更を自動で反映する
    useAutoRefresh({ paused: isPending });

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
                <GuideLink />
                <button
                    onClick={() => signOut({ redirectTo: "/" })}
                    className="min-h-11 px-1 text-sm font-medium text-ink-muted transition-colors hover:text-ink">
                    ログアウト
                </button>
            </SiteHeader>

            <main className="mx-auto flex w-full max-w-280 flex-1 flex-col gap-8 px-5 pt-8 pb-24 sm:px-6 sm:pt-12">
                <div className="flex flex-wrap items-end justify-between gap-5">
                    <div className="flex flex-col gap-1">
                        <h1 className="heading text-[clamp(30px,4vw,38px)] leading-tight">
                            マイプロジェクト
                        </h1>
                        <p className="text-sm text-ink-sub">参加しているプロジェクトの一覧です</p>
                    </div>
                    <button
                        onClick={() => setisOpen(true)}
                        className={`${primaryButtonClass} min-h-13 gap-2.5 px-6 text-base`}>
                        <PlusIcon />
                        新しいプロジェクトを作成
                    </button>
                </div>

                {/* プロジェクトが0の時は大きな作成ボタンを表示する */}
                {projects.length === 0 ? (
                    <button
                        onClick={() => setisOpen(true)}
                        className={`${addTripButtonClass} min-h-65 w-full text-lg`}>
                        <PlusIcon size={28} strokeWidth={2} />
                        最初のプロジェクトを作成
                        <span className="text-sm font-medium text-ink-sub">まだプロジェクトがありません</span>
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
                                <div className="ticket-top px-7 pt-6 pb-4.5">
                                    <h2 className="truncate heading text-[22px] transition-colors group-hover:text-primary">
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
                            className={`${addTripButtonClass} min-h-37.5 text-[15px]`}>
                            <PlusIcon size={28} strokeWidth={2} />
                            プロジェクトを追加
                        </button>
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-paper px-4.5 py-3.5 text-sm text-ink-sub">
                    <span>はじめての方へ：プロジェクトを作ったら、招待リンクをコピーして友達に送りましょう。</span>
                    <Link href="/guide" className="font-bold text-primary transition-colors hover:text-primary-hover sm:ml-auto">
                        使い方を見る →
                    </Link>
                </div>
            </main>

            {isOpen && (
                <Modal title="新しいプロジェクトを作成" onClose={() => setisOpen(false)}>
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
