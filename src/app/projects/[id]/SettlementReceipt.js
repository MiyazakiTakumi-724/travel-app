import { PlusIcon } from "@/components/icons";
import { primaryButtonClass } from "@/components/ui";
import { formatSignedYen, formatYen } from "@/lib/format";
import { summarizeSettlement } from "@/lib/settlement";

const toneOf = (amount) => (amount > 0 ? "text-primary" : amount < 0 ? "text-pay" : "text-ink-faint");

// レシートの中の小見出し
function Label({ children }) {
  return <p className="mb-1.5 text-xs font-bold text-ink-muted">{children}</p>;
}

function Line({ label, amount, muted }) {
  return (
    <div className={`flex justify-between gap-3 py-0.5 ${muted ? "text-[13px] text-ink-muted" : "text-sm"}`}>
      <span className="min-w-0">{label}</span>
      <span className="shrink-0 amount text-[15px]">{formatYen(amount)}</span>
    </div>
  );
}

const Divider = () => <hr className="my-3.5 border-0 border-t-2 border-dashed border-line-dashed" />;

// 精算タブ。計算の流れ（支払い → メンバーごとの内訳 → あなたの精算 → 送金のしかた）を1枚のレシートで見せる
export default function SettlementReceipt({ participants, payments, displayNames, currentParticipantId, onRecord }) {
  if (payments.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl bg-paper px-6 py-10 text-center">
        <h2 className="font-black">まだ支払いがありません</h2>
        <p className="text-sm leading-relaxed text-ink-sub">支払いを記録すると、誰が誰にいくら払えばいいかがここに表示されます。</p>
        <button onClick={onRecord} className={`${primaryButtonClass} mt-2 min-h-12 text-[15px]`}>
          <PlusIcon />
          支払いを記録
        </button>
      </div>
    );
  }

  const summary = summarizeSettlement(participants, payments);
  const myBalance = Math.round(summary.rows.find((row) => row.id === currentParticipantId)?.balance ?? 0);
  const myLabel = myBalance > 0 ? "あなたが受け取る金額" : myBalance < 0 ? "あなたが支払う金額" : "あなたの精算";
  const nameOf = (id) => `${displayNames.get(id)}${id === currentParticipantId ? "（あなた）" : ""}`;

  return (
    <div className="flex w-full max-w-xl flex-col gap-3">
      {/* 下の端をギザギザにしたレシート */}
      <div className="drop-shadow-[0_12px_16px_rgb(21_128_196/0.14)]">
        <div className="receipt bg-white px-5 pt-5.5 pb-8 sm:px-6.5">
          <h2 className="text-center heading text-lg">精算レシート</h2>
          <p className="mt-0.5 text-center text-xs text-ink-muted">{participants.length}人で精算</p>

          <Divider />
          <Label>支払い</Label>
          <Line label={`未精算の支払い（${summary.unsettledCount}件）`} amount={summary.unsettledTotal} />
          {summary.settledCount > 0 && (
            <Line label={`精算済みの支払い（${summary.settledCount}件）`} amount={summary.settledTotal} muted />
          )}
          <Line label={`1人あたり（÷ ${participants.length}人）`} amount={Math.round(summary.share)} />

          <Divider />
          <Label>メンバーごとの内訳</Label>
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="text-[11px] text-ink-muted">
                <th className="pb-1 text-left font-bold">人</th>
                <th className="pb-1 text-right font-bold">払った額</th>
                <th className="pb-1 text-right font-bold">負担額</th>
                <th className="pb-1 text-right font-bold">収支</th>
              </tr>
            </thead>
            <tbody>
              {summary.rows.map((row) => {
                const balance = Math.round(row.balance);
                return (
                  <tr key={row.id} className={row.id === currentParticipantId ? "font-bold" : ""}>
                    <td className="max-w-24 truncate py-1 pr-2">{displayNames.get(row.id)}</td>
                    <td className="py-1 text-right amount">{formatYen(row.paid)}</td>
                    <td className="py-1 text-right amount">{formatYen(Math.round(row.share))}</td>
                    <td className={`py-1 text-right amount ${toneOf(balance)}`}>{formatSignedYen(balance)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <Divider />
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="text-sm font-bold">{myLabel}</span>
            <span className={`amount text-[40px] leading-tight ${toneOf(myBalance)}`}>{formatYen(Math.abs(myBalance))}</span>
          </div>

          <Divider />
          <Label>
            送金のしかた{summary.transfers.length > 0 ? `（${summary.transfers.length}回）` : ""}
          </Label>
          {summary.transfers.length === 0 ? (
            <p className="text-sm text-ink-sub">精算の必要はありません</p>
          ) : (
            <ul className="flex flex-col">
              {summary.transfers.map((transfer, index) => {
                const mine = transfer.from === currentParticipantId || transfer.to === currentParticipantId;
                return (
                  <li key={index} className={`flex justify-between gap-3 py-1 text-sm ${mine ? "font-bold" : ""}`}>
                    <span className="min-w-0 wrap-break-word">
                      {nameOf(transfer.from)} <span className="text-pay">→</span> {nameOf(transfer.to)}
                    </span>
                    <span className="shrink-0 amount text-[15px]">{formatYen(transfer.amount)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      <p className="text-xs leading-relaxed text-ink-muted">
        送金が済んだら、「支払い」で支払いに精算済みのチェックを入れると、計算から外れます。
      </p>
    </div>
  );
}
