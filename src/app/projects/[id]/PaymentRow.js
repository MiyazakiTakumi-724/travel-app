import { formatYen } from "@/lib/format";

// タップすると編集シートが開く
export default function PaymentRow({ payment, payerName, onEdit }) {
  const { id: paymentId, memo, amount } = payment;
  // 保存中の仮の行はまだIDが確定していないので操作できない
  const isPending = String(paymentId).startsWith("pending-");
  const title = memo || `${payerName}の支払い`;

  return (
    <li className="px-2 sm:px-3">
      <button
        type="button"
        onClick={() => onEdit(payment)}
        disabled={isPending}
        aria-label={`「${title}」を編集`}
        className="flex w-full min-w-0 items-center gap-3 rounded-lg py-4 pr-2 pl-3 text-left transition-colors hover:bg-sky-ground/60 focus-visible:outline-2 focus-visible:outline-primary active:bg-sky-ground disabled:opacity-60">
        {/* 支払い内容が主、支払者が従。内容が空なら支払者を主にする */}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="wrap-break-word text-[17px] font-bold">{title}</span>
          {memo && <span className="text-sm text-ink-sub">{payerName}が支払い</span>}
        </span>

        <span className="shrink-0 amount text-xl">{formatYen(amount)}</span>
        <span aria-hidden="true" className="shrink-0 text-lg text-ink-faint">›</span>
      </button>
    </li>
  );
}
