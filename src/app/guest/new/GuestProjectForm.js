"use client";
import { useState, useTransition } from "react";
import { createGuestProject } from "@/app/guestActions";
import GuestCodePanel from "@/components/GuestCodePanel";
import ProjectFormFields from "@/components/ProjectFormFields";
import { fieldLabelClass, primaryButtonClass, textFieldClass } from "@/components/ui";
import { LIMITS } from "@/lib/limits";
import { runServerAction } from "@/lib/runServerAction";

// ゲストのまま、ニックネームとプロジェクトの内容を入れて作る
export default function GuestProjectForm() {
  const [created, setCreated] = useState(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  if (created) {
    return (
      <GuestCodePanel
        code={created.code}
        projectId={created.projectId}
        projectTitle={created.projectTitle}
        heading="プロジェクトを作りました"
      />
    );
  }

  const submit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError("");
    startTransition(async () => {
      const result = await runServerAction(() => createGuestProject(formData));
      if (result.error) setError(result.error);
      else setCreated(result);
    });
  };

  return (
    <div className="w-full max-w-md">
      <h1 className="heading text-[clamp(26px,4vw,34px)] leading-tight">ゲストでプロジェクトを作成</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-sub">
        アカウントなしで作れます。作ったあとに出る「復帰用コード」で、ほかの端末からも戻れます。あとから Google アカウントに引き継ぐこともできます。
      </p>

      <form onSubmit={submit} className="mt-6 flex flex-col gap-5 rounded-2xl bg-paper p-5 sm:p-7">
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabelClass}>あなたのニックネーム</span>
          <input
            type="text"
            name="nickname"
            required
            maxLength={LIMITS.nickname}
            placeholder="例：たろう"
            className={textFieldClass}
          />
        </label>
        <ProjectFormFields />
        {error && (
          <p role="alert" className="rounded-lg bg-[#FCECE8] px-4 py-3 text-sm font-bold text-pay">
            {error}
          </p>
        )}
        <button type="submit" disabled={isPending} className={`${primaryButtonClass} min-h-13 text-base`}>
          作成する
        </button>
      </form>
    </div>
  );
}
