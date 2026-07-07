"use client";
import { useState, useTransition } from "react";
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
    <div className="bg-gray-100 min-h-screen pb-24 relative">
      <h1 className="text-6xl font-bold p-4 ml-1">{project.title} 清算リスト</h1>
      <p className="text-gray-600 ml-5 text-2xl">目的地：{project.destination}</p>
      <p className="text-gray-600 ml-5 text-2xl">期間：{project.date}</p>

      <div className="justify-end flex gap-3">
        <button
          onClick={handleCopyInviteLink}
          className="bg-white text-blue-600 border-2 border-blue-600 text-xl px-6 py-4 mb-3 rounded-md font-bold shadow-md hover:shadow-lg text-left transition transform hover:-translate-y-1 block">
          {copied ? "コピーしました！" : "招待リンクをコピー"}
        </button>
        <button
          onClick={() => setisOpen(!isOpen)}
          className="bg-blue-600 text-xl text-white px-6 py-4 mr-5 mb-3 rounded-md font-bold shadow-md hover:shadow-lg text-left transition transform hover:-translate-y-1 block">
          支払い入力
        </button>
      </div>

      {isOpen && (

        // オーバーレイ
        <>
          <div className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setisOpen(false)} />

          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 p-8 bg-white border-4 border-blue-200 rounded-xl shadow-lg w-full max-w-lg">

            <form action={handleAddPayment}>
              <select
                // 支払い入力フォーム（参加者から選択）
                name="payer"
                className="border-2 border-gray-300 p-2 rounded-md w-full mb-2 bg-white"
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
                className="border-2 border-gray-300 p-2 rounded-md w-full mb-2"
                placeholder="支払い内容"
              />
              <input
                type="number"
                name="amount"
                required
                min="1"
                className="border-2 border-gray-300 p-2 rounded-md w-full mb-2"
                placeholder="金額"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-blue-600 text-white px-6 py-3 rounded-md font-bold disabled:opacity-50">
                  確定する
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      <div className="flex flex-col gap-2">
        {project.payments.map((payment) => (
          <PaymentRow
            key={payment.id}
            projectId={project.id}
            paymentId={payment.id}
            payer={payment.payer}
            memo={payment.memo}
            amount={payment.amount}
            isSettled={payment.isSettled}
          />
        ))}
      </div>

      {/* 合計精算額 */}
      <div className="fixed bottom-0 w-full bg-white p-3">
        <p className="text-2xl">合計精算額: ¥{totalAmount.toLocaleString()}</p>
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
    <div className={`flex items-center justify-between p-4 border-1 border-grey-300 rounded-md ml-5 mr-5 mt-2 transition-colors ${isSettled ? 'bg-gray-50 opacity-60' : 'bg-white'
      }`}>

      {/*チェックボックス*/}
      <div className="flex-shrink-0 mr-4">
        <input
          type="checkbox"
          checked={isSettled}
          disabled={isPending}
          onChange={handleToggle}
          className="w-6 h-6 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
        />
      </div>

      {/*支払者+メモ*/}
      <div className="flex-1 min-w-0 pr-4">
        <p className={`text-lg font-bold truncate ${isSettled ? 'text-gray-500 line-through' : 'text-gray-900'
          }`}>
          {payer}
        </p>
        <p>{memo}</p>
      </div>

      {/* 支払金額 */}
      <div className="flex-shrink-0 text-right">
        <p className={`text-xl font-bold ${isSettled ? 'text-gray-500' : 'text-blue-600'
          }`}>
          ¥{Number(amount).toLocaleString()}
        </p>
      </div>

    </div>
  );
}
