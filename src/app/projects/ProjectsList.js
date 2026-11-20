"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createProject, deleteAccount, logout } from "./actions";
import SiteHeader, { GuideLink } from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Modal, { ModalActions } from "@/components/Modal";
import ProjectFormFields from "@/components/ProjectFormFields";
import { PlusIcon } from "@/components/icons";
import { primaryButtonClass, textButtonClass } from "@/components/ui";
import { formatTripPeriod } from "@/lib/format";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import { runServerAction } from "@/lib/runServerAction";

const addTripButtonClass =
  "flex flex-col items-center justify-center gap-2.5 rounded-lg border-2 border-dashed border-line-dashed font-bold text-primary transition-colors hover:bg-paper focus-visible:outline-2 focus-visible:outline-primary";

// 旅行ごとにきっぷの形で表示する。上段がタイトルと目的地、下段が期間と、人数（ゲストのときはニックネーム）
function ProjectCard({ project, note }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="group flex flex-col text-ink drop-shadow-[0_12px_16px_rgb(21_128_196/0.12)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
      <div className="ticket-top px-7 pt-6 pb-4.5">
        <h2 className="truncate heading text-[22px] transition-colors group-hover:text-primary">{project.title}</h2>
        <p className="mt-1 truncate font-medium text-ink-sub">{project.destination || "目的地未定"}</p>
      </div>
      <div className="ticket-bottom flex justify-between gap-4 px-7 pt-3.5 pb-5 text-sm text-ink-sub">
        <span className="font-bold text-ink">{formatTripPeriod(project)}</span>
        <span className="shrink-0">{note}</span>
      </div>
    </Link>
  );
}

// アカウントの削除の確認。消えるもの・残るものを先に見せる
function DeleteAccountModal({ onClose }) {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    setError("");
    startTransition(async () => {
      // 削除できたら、サーバーがトップページへ移動させる
      const result = await deleteAccount();
      if (result?.error) setError(result.error);
    });
  };

  return (
    <Modal title="アカウントを削除" onClose={onClose}>
      <div className="flex flex-col gap-4 text-sm leading-relaxed text-ink-sub">
        <ul className="flex list-disc flex-col gap-1.5 pl-5">
          <li>Googleから受け取った名前・メールアドレス・プロフィール画像と、ログインの情報を削除します。</li>
          <li>参加しているプロジェクトでは、あなたの支払いの記録がある場合だけ、ニックネームと記録を「退会済み」として残します（ほかのメンバーの精算の金額が変わらないようにするためです）。記録がなければ、メンバーから外れます。</li>
          <li>ほかにメンバーがいないプロジェクトは、まるごと削除します。</li>
          <li>あなたしか幹事がいないプロジェクトは、いちばん前から参加しているメンバーが幹事になります。</li>
        </ul>
        <p className="rounded-lg bg-[#FCECE8] px-3.5 py-2.5 font-bold text-pay">削除すると、元に戻せません。</p>
        {error && (
          <p role="alert" className="font-bold text-pay">
            {error}
          </p>
        )}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="hidden min-h-13.5 items-center px-4 text-sm font-bold text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-primary sm:inline-flex">
            キャンセル
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={isPending}
            className="inline-flex min-h-13.5 flex-1 items-center justify-center rounded-lg bg-pay px-5 text-base font-bold text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink disabled:opacity-60">
            アカウントを削除する
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function ProjectsList({ projects, guestProjects = [] }) {
  // 新しいプロジェクトを作るシートを開いているか
  const [isOpen, setIsOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // 招待された旅行や、ほかのメンバーが作った変更を自動で反映する
  useAutoRefresh({ paused: isPending });

  // 失敗したときは入力した内容が消えないよう、シートを開いたままメッセージを出す
  const [createError, setCreateError] = useState("");
  const handleCreateProject = (formData) => {
    setCreateError("");
    startTransition(async () => {
      const result = await runServerAction(() => createProject(formData));
      if (result.error) {
        setCreateError(result.error);
        return;
      }
      // 作ったプロジェクトを開く（日程がまだなら日程調整の画面から始まる）
      router.push(`/projects/${result.id}`);
    });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader logoHref="/projects">
        <GuideLink />
        {/* このブラウザにあるゲストとしてのログイン状態も一緒に消す。スマホでは、ヘッダーが窮屈にならないよう下に置く */}
        <form action={logout} className="max-sm:hidden">
          <button type="submit" className="min-h-11 px-1 text-sm font-bold text-ink-muted transition-colors hover:text-ink">
            ログアウト
          </button>
        </form>
      </SiteHeader>

      <main className="mx-auto flex w-full max-w-280 flex-1 flex-col gap-8 px-5 pt-8 pb-24 sm:px-6 sm:pt-12">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="flex flex-col gap-1">
            <h1 className="heading text-[clamp(30px,4vw,38px)] leading-tight">マイプロジェクト</h1>
            <p className="text-sm text-ink-sub">参加しているプロジェクトの一覧です</p>
          </div>
          <button onClick={() => setIsOpen(true)} className={`${primaryButtonClass} min-h-13 gap-2.5 px-6 text-base`}>
            <PlusIcon />
            新しいプロジェクトを作成
          </button>
        </div>

        {/* プロジェクトが0の時は大きな作成ボタンを表示する */}
        {projects.length === 0 ? (
          <button onClick={() => setIsOpen(true)} className={`${addTripButtonClass} min-h-65 w-full text-lg`}>
            <PlusIcon size={28} strokeWidth={2} />
            最初のプロジェクトを作成
            <span className="text-sm font-medium text-ink-sub">まだプロジェクトがありません</span>
          </button>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(320px,100%),1fr))] gap-6">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                note={
                  <>
                    <b className="text-ink">{project.participants.length}</b>人
                  </>
                }
              />
            ))}
            <button onClick={() => setIsOpen(true)} className={`${addTripButtonClass} min-h-37.5 text-[15px]`}>
              <PlusIcon size={28} strokeWidth={2} />
              プロジェクトを追加
            </button>
          </div>
        )}

        {/* このブラウザでゲストとして参加しているプロジェクト（Googleのアカウントでは参加していないもの） */}
        {guestProjects.length > 0 && (
          <section aria-labelledby="guest-projects" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 id="guest-projects" className="text-xl font-black">
                ゲストとして参加中
              </h2>
              <p className="text-sm leading-relaxed text-ink-sub">
                このブラウザでゲストとして参加しているプロジェクトです。開いて「メンバー」の画面から、Googleアカウントに引き継げます。
              </p>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(320px,100%),1fr))] gap-6">
              {guestProjects.map((project) => (
                <ProjectCard key={project.id} project={project} note={`ゲスト（${project.nickname}）`} />
              ))}
            </div>
          </section>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-paper px-4.5 py-3.5 text-sm text-ink-sub">
          <span>はじめての方へ：プロジェクトを作ったら、招待リンクを友達に送りましょう。</span>
          <Link href="/guide" className="font-bold text-primary transition-colors hover:text-primary-hover sm:ml-auto">
            使い方を見る →
          </Link>
        </div>

        <div className="flex flex-wrap justify-center gap-x-4 border-t border-line-soft pt-3">
          <form action={logout} className="sm:hidden">
            <button type="submit" className={`${textButtonClass} hover:text-ink`}>
              ログアウト
            </button>
          </form>
          <button type="button" onClick={() => setIsDeletingAccount(true)} className={`${textButtonClass} hover:text-pay`}>
            アカウントを削除
          </button>
        </div>
      </main>
      <SiteFooter />

      {isOpen && (
        <Modal title="新しいプロジェクトを作成" onClose={() => setIsOpen(false)}>
          <form action={handleCreateProject} className="flex flex-col gap-5">
            <ProjectFormFields />
            {createError && (
              <p role="alert" className="rounded-lg bg-[#FCECE8] px-4 py-3 text-sm font-bold text-pay">
                {createError}
              </p>
            )}
            <ModalActions submitLabel="作成する" onCancel={() => setIsOpen(false)} disabled={isPending} />
          </form>
        </Modal>
      )}

      {isDeletingAccount && <DeleteAccountModal onClose={() => setIsDeletingAccount(false)} />}
    </div>
  );
}
