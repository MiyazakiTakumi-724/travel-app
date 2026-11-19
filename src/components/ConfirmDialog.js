"use client";
import { useState } from "react";
import Modal from "./Modal";

// 確認のシート。ブラウザの window.confirm は、LINE などのアプリ内ブラウザや一部の環境で
// 表示されずに「キャンセル」扱いになることがあるので、アプリの中に自前で出す。
// 使い方：const [confirmDialog, confirm] = useConfirm();
//        if (!(await confirm({ title: "削除しますか？", confirmLabel: "削除する", danger: true }))) return;
//        画面のどこかに {confirmDialog} を置く
export function useConfirm() {
  const [request, setRequest] = useState(null);

  const confirm = (options) => new Promise((resolve) => setRequest({ ...options, resolve }));
  const close = (result) => {
    request?.resolve(result);
    setRequest(null);
  };

  const dialog = request ? (
    <Modal title={request.title} description={request.message} onClose={() => close(false)}>
      <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => close(false)}
          className="inline-flex min-h-12 items-center justify-center rounded-lg px-5 text-[15px] font-bold text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-primary">
          キャンセル
        </button>
        <button
          type="button"
          autoFocus
          onClick={() => close(true)}
          className={`inline-flex min-h-12 items-center justify-center rounded-lg px-6 text-[15px] font-bold text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink ${
            request.danger ? "bg-pay hover:opacity-90" : "bg-primary hover:bg-primary-hover"
          }`}>
          {request.confirmLabel ?? "OK"}
        </button>
      </div>
    </Modal>
  ) : null;

  return [dialog, confirm];
}
