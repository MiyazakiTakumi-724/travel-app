"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { createProject } from "./actions";
import SiteHeader from "@/components/SiteHeader";
import Modal, { SubmitButton } from "@/components/Modal";
import ProjectFormFields from "@/components/ProjectFormFields";
import { PlusIcon } from "@/components/icons";
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

    return (
        <div className="flex min-h-screen flex-col">
            <SiteHeader logoHref="/projects">
                <button
                    onClick={() => signOut({ redirectTo: "/" })}
                    className="min-h-11 px-1 text-sm font-medium text-ink-muted transition-colors hover:text-ink">
                    ログアウト
                </button>
            </SiteHeader>

            <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-8 px-6 pt-10 pb-24 sm:pt-14">
                <h1 className="text-[32px] font-extrabold tracking-[-0.01em] sm:text-[40px]">旅行</h1>

                <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-6">
                    {projects.map((project) => {
                        const period = formatPeriod(project.startDate, project.endDate);
                        return (
                            <Link
                                key={project.id}
                                href={`/projects/${project.id}`}
                                className="flex min-h-[180px] flex-col border-t-4 border-primary bg-paper text-ink shadow-card transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
                            >
                                <div className="flex flex-1 flex-col gap-1 px-6 pt-6 pb-5">
                                    <h2 className="truncate text-[22px] font-extrabold">{project.title}</h2>
                                    {project.destination && (
                                        <p className="truncate text-sm text-ink-sub">{project.destination}</p>
                                    )}
                                </div>
                                <div className="mx-6 flex items-center justify-between gap-4 border-t border-dashed border-line-dashed py-4 font-mono text-sm">
                                    <span className="truncate">{period}</span>
                                    <span className="shrink-0 text-ink-muted">{project.participants.length}名</span>
                                </div>
                            </Link>
                        );
                    })}

                    {/* 末尾のタイルから新しい旅行を作成する（0件のときはこれだけが並ぶ） */}
                    <button
                        onClick={() => setisOpen(true)}
                        aria-label="新しい旅行を作成"
                        className="flex min-h-[180px] items-center justify-center border-[1.5px] border-dashed border-[#6FAFD0] text-primary transition-colors hover:bg-paper focus-visible:outline-2 focus-visible:outline-primary">
                        <PlusIcon size={32} strokeWidth={2} />
                    </button>
                </div>
            </main>

            {isOpen && (
                <Modal title="新しい旅行" onClose={() => setisOpen(false)}>
                    <form action={handleCreateProject} className="flex flex-col gap-4">
                        <ProjectFormFields />
                        <SubmitButton disabled={isPending}>作成</SubmitButton>
                    </form>
                </Modal>
            )}
        </div>
    );
}
