"use client";
import { useState, useTransition } from "react";
import { createGuestProject } from "@/app/guestActions";
import ProjectFormFields from "@/components/ProjectFormFields";
import { fieldLabelClass, primaryButtonClass, RequiredMark, textFieldClass } from "@/components/ui";
import { LIMITS } from "@/lib/limits";

// ゲストのまま、ニックネームとプロジェクトの内容を入れて作る
export default function GuestProjectForm() {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const submit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError("");
    startTransition(async () => {
      // 作れたら、サーバーが復帰用コードの画面へ移動させる
      const result = await createGuestProject(formData);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <div className="w-full max-w-md">
      <h1 className="heading text-[clamp(26px,4vw,34px)] leading-tight">ゲストでプロジェクトを作成</h1>
      <p className="phrase mt-2 text-sm leading-relaxed text-ink-sub">
        アカウントなしで作れます。作ったあとに出る「復帰用コード」で、ほかの端末からも戻れます。あとからGoogleアカウントに引き継ぐこともできます。
      </p>

      <form onSubmit={submit} className="mt-6 flex flex-col gap-5 rounded-2xl bg-paper p-5 sm:p-7">
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabelClass}>
            あなたのニックネーム
            <RequiredMark />
          </span>
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
