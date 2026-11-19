"use client";
import { useState } from "react";
import Modal, { ModalActions } from "@/components/Modal";
import { CheckIcon } from "@/components/icons";
import { fieldLabelClass, textFieldClass } from "@/components/ui";
import { LIMITS } from "@/lib/limits";

// 支払いの記録・編集のシート。金額・内容・支払者（1人）を入れる
export default function PaymentFormModal({ title, participants, displayNames, defaultValues, defaultPayerId, onSubmit, onCancel, onDelete, isPending, submitLabel }) {
  // 新規のときは自分を支払者にしておく（自分で払った分を記録することが一番多いため）
  const [payer, setPayer] = useState(defaultValues?.payerId ?? defaultPayerId ?? participants[0]?.id ?? "");
  // 退会済みの人は、新しく支払者には選べない（編集している支払いの支払者だけは残す）
  const payers = participants.filter((p) => !p.retired || p.id === defaultValues?.payerId);

  return (
    <Modal title={title} onClose={onCancel}>
      {/* action だと送信全体がトランジションになり、閉じるのがサーバー処理の完了まで遅れるので onSubmit で受ける */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(new FormData(event.currentTarget));
        }}
        className="flex flex-col gap-5"
      >
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabelClass}>金額</span>
          <span className="flex items-center gap-2 border-b-2 border-ink pb-1.5 focus-within:border-primary">
            <span aria-hidden="true" className="amount text-[28px] text-primary">¥</span>
            <input
              type="number"
              name="amount"
              inputMode="numeric"
              defaultValue={defaultValues?.amount}
              required
              min="1"
              max={LIMITS.amount}
              step="1"
              placeholder="0"
              className="min-w-0 flex-1 bg-transparent p-0 amount text-[34px] text-ink outline-none placeholder:text-line-dashed [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={fieldLabelClass}>支払い内容</span>
          <input
            type="text"
            name="memo"
            defaultValue={defaultValues?.memo}
            maxLength={LIMITS.memo}
            className={textFieldClass}
            placeholder="例：夕食、レンタカー"
          />
        </label>

        {/* 支払者は1人だけ選ぶ。見た目はチップ */}
        <fieldset className="flex min-w-0 flex-col">
          <legend className={`${fieldLabelClass} mb-2.5`}>支払者</legend>
          <div className="flex flex-wrap gap-2">
            {payers.map((participant) => {
              const selected = payer === participant.id;
              return (
                <label
                  key={participant.id}
                  className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-line-dashed bg-paper px-4 text-[15px] font-bold text-ink transition-colors has-checked:border-primary has-checked:bg-primary has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink"
                >
                  <input
                    type="radio"
                    name="payerId"
                    value={participant.id}
                    checked={selected}
                    required
                    onChange={() => setPayer(participant.id)}
                    className="sr-only"
                  />
                  {selected && <CheckIcon />}
                  {displayNames.get(participant.id)}
                </label>
              );
            })}
          </div>
        </fieldset>

        <ModalActions submitLabel={submitLabel} onCancel={onCancel} disabled={isPending} />

        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="-mt-1 inline-flex min-h-11 items-center justify-center self-center px-4 text-sm font-bold text-pay transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-pay">
            この支払いを削除
          </button>
        )}
      </form>
    </Modal>
  );
}
