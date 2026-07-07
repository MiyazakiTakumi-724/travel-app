"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { addPayment, toggleSettled } from "./actions";

export default function PaymentsClient({ project }) {

  // useState初期値設定
  const [isOpen, setisOpen] = useState(false);
  const [payer, setPayer] = useState(project.participants[0]?.name ?? "");
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const handleCopyInviteLink = async () => {
    const inviteUrl = `${window.location.origin}/invite/${project.id}`;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddPayment = (formData) => {
    startTransition(async () => {
      await addPayment(project.id, formData);
      setisOpen(false);
      setPayer(project.participants[0]?.name ?? "");
    });
  };

  const totalAmount = project.payments.reduce(
    (sum, payment) => sum + payment.amount,
    0
  );

  return (
    <div className="bg-gray-50 min-h-screen pb-28 relative">
      <div className="max-w-3xl mx-auto px-4 pt-6 sm:px-8 sm:pt-10">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition mb-3">
          ← 一覧に戻る
        </Link>

        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-2 break-words">
          {project.title}
        </h1>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm sm:text-base text-gray-500 mb-6">
          <p>目的地：{project.destination || "未定"}</p>
          <p>期間：{project.date || "未定"}</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-end gap-2 sm:gap-3 mb-6">
          <button
            onClick={handleCopyInviteLink}
            className="w-full sm:w-auto bg-white text-blue-600 border border-blue-600 px-5 py-2.5 rounded-lg font-bold text-sm shadow-sm transition hover:bg-blue-50 active:scale-[0.99]">
            {copied ? "コピーしました！" : "招待リンクをコピー"}
          </button>
          <button
            onClick={() => setisOpen(!isOpen)}
            className="w-full sm:w-auto bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow-sm transition hover:bg-blue-700 active:scale-[0.99]">
            支払い入力
          </button>
        </div>
      </div>

      {isOpen && (

        // オーバーレイ
        <>
          <div className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setisOpen(false)} />

          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 p-6 sm:p-8 bg-white rounded-2xl shadow-xl w-[calc(100%-2rem)] max-w-md">
            <h2 className="text-lg font-bold text-gray-900 mb-4">支払いを記録</h2>

            <form action={handleAddPayment} className="flex flex-col gap-3">
              <select
                // 支払い入力フォーム（参加者から選択）
                name="payer"
                className="border border-gray-300 p-3 rounded-lg w-full text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={payer}
                onChange={(e) => setPayer(e.target.value)}
              >
                {project.participants.map((participant) => (
                  <option key={participant.id} value={participant.name}>
                    {participant.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                name="memo"
                className="border border-gray-300 p-3 rounded-lg w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="支払い内容"
              />
              <input
                type="number"
                name="amount"
                required
                min="1"
                className="border border-gray-300 p-3 rounded-lg w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="金額"
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setisOpen(false)}
                  className="text-gray-500 px-4 py-2.5 rounded-lg font-bold text-sm hover:bg-gray-100 transition">
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold text-sm shadow-sm transition hover:bg-blue-700 disabled:opacity-50">
                  確定する
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      <div className="max-w-3xl mx-auto px-4 sm:px-8 flex flex-col gap-2">
        {project.payments.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-12">
            まだ支払いの記録がありません
          </p>
        ) : (
          project.payments.map((payment) => (
            <PaymentRow
              key={payment.id}
              projectId={project.id}
              paymentId={payment.id}
              payer={payment.payer}
              memo={payment.memo}
              amount={payment.amount}
              isSettled={payment.isSettled}
            />
          ))
        )}
      </div>

      {/* 合計精算額 */}
      <div className="fixed bottom-0 w-full bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] px-4 py-4 sm:px-8">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <p className="text-sm text-gray-500">合計精算額</p>
          <p className="text-2xl font-bold text-blue-600">¥{totalAmount.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

function PaymentRow({ projectId, paymentId, payer, memo, amount, isSettled }) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      await toggleSettled(projectId, paymentId, !isSettled);
    });
  };

  return (
    <div className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${isSettled ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-200'
      }`}>

      {/*チェックボックス*/}
      <div className="shrink-0 mr-4">
        <input
          type="checkbox"
          checked={isSettled}
          disabled={isPending}
          onChange={handleToggle}
          className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
        />
      </div>

      {/*支払者+メモ*/}
      <div className="flex-1 min-w-0 pr-4">
        <p className={`font-bold truncate ${isSettled ? 'text-gray-400 line-through' : 'text-gray-900'
          }`}>
          {payer}
        </p>
        <p className="text-sm text-gray-500 truncate">{memo}</p>
      </div>

      {/* 支払金額 */}
      <div className="shrink-0 text-right">
        <p className={`text-lg font-bold ${isSettled ? 'text-gray-400' : 'text-blue-600'
          }`}>
          ¥{Number(amount).toLocaleString()}
        </p>
      </div>

    </div>
  );
}
