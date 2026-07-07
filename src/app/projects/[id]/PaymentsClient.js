"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { addPayment, deletePayment, editPayment, toggleSettled } from "./actions";

// 未清算の支払いを参加者で均等割りし、誰が誰にいくら払えば精算できるかを計算する
function calculateSettlements(participants, payments) {
  if (participants.length === 0) return [];

  const unsettled = payments.filter((payment) => !payment.isSettled);
  const total = unsettled.reduce((sum, payment) => sum + payment.amount, 0);
  const share = total / participants.length;

  const balances = new Map(participants.map((p) => [p.name, -share]));
  for (const payment of unsettled) {
    balances.set(payment.payer, (balances.get(payment.payer) ?? -share) + payment.amount);
  }

  const creditors = [];
  const debtors = [];
  for (const [name, balance] of balances) {
    if (balance > 0.5) creditors.push({ name, amount: balance });
    else if (balance < -0.5) debtors.push({ name, amount: -balance });
  }
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transfers = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(debtor.amount, creditor.amount);

    if (amount > 0.5) {
      transfers.push({ from: debtor.name, to: creditor.name, amount: Math.round(amount) });
    }

    debtor.amount -= amount;
    creditor.amount -= amount;
    if (debtor.amount <= 0.5) i++;
    if (creditor.amount <= 0.5) j++;
  }

  return transfers;
}

function PaymentFormModal({ title, participants, defaultValues, onSubmit, onCancel, isPending, submitLabel, allowMultiplePayers }) {
  const [payer, setPayer] = useState(defaultValues?.payer ?? participants[0]?.name ?? "");
  const [selectedPayers, setSelectedPayers] = useState(
    defaultValues?.payer ? [defaultValues.payer] : participants[0] ? [participants[0].name] : []
  );

  const togglePayer = (name) => {
    setSelectedPayers((current) =>
      current.includes(name) ? current.filter((n) => n !== name) : [...current, name]
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onCancel} />

      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 p-6 sm:p-8 bg-white rounded-2xl shadow-xl w-[calc(100%-2rem)] max-w-md">
        <h2 className="text-lg font-bold text-gray-900 mb-4">{title}</h2>

        <form action={onSubmit} className="flex flex-col gap-3">
          {allowMultiplePayers ? (
            <div className="border border-gray-300 rounded-lg p-3">
              <p className="text-xs font-bold text-gray-500 mb-2">支払者（複数選択可・均等割り）</p>
              <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                {participants.map((participant) => (
                  <label key={participant.id} className="flex items-center gap-2 text-sm text-gray-800">
                    <input
                      type="checkbox"
                      name="payer"
                      value={participant.name}
                      checked={selectedPayers.includes(participant.name)}
                      onChange={() => togglePayer(participant.name)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                    />
                    {participant.name}
                  </label>
                ))}
              </div>
              {selectedPayers.length === 0 && (
                <p className="text-xs text-red-500 mt-2">支払者を1人以上選択してください</p>
              )}
            </div>
          ) : (
            <select
              // 支払い入力フォーム（参加者から選択）
              name="payer"
              className="border border-gray-300 p-3 rounded-lg w-full text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={payer}
              onChange={(e) => setPayer(e.target.value)}
            >
              {participants.map((participant) => (
                <option key={participant.id} value={participant.name}>
                  {participant.name}
                </option>
              ))}
            </select>
          )}
          <input
            type="text"
            name="memo"
            defaultValue={defaultValues?.memo}
            className="border border-gray-300 p-3 rounded-lg w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="支払い内容"
          />
          <input
            type="number"
            name="amount"
            defaultValue={defaultValues?.amount}
            required
            min="1"
            className="border border-gray-300 p-3 rounded-lg w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="金額"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-500 px-4 py-2.5 rounded-lg font-bold text-sm hover:bg-gray-100 transition">
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isPending || (allowMultiplePayers && selectedPayers.length === 0)}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold text-sm shadow-sm transition hover:bg-blue-700 disabled:opacity-50">
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

function SettlementRow({ transfer }) {
  return (
    <div className="flex items-center justify-between text-sm bg-white rounded-lg px-4 py-3 shadow-sm">
      <p className="font-bold text-gray-900">
        {transfer.from}
        <span className="mx-2 text-blue-500">→</span>
        {transfer.to}
      </p>
      <p className="font-bold text-blue-600">
        ¥{transfer.amount.toLocaleString()}
      </p>
    </div>
  );
}

export default function PaymentsClient({ project, currentUserName }) {

  // useState初期値設定
  const [isOpen, setisOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [showOthers, setShowOthers] = useState(false);

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
    });
  };

  const handleEditPayment = (formData) => {
    startTransition(async () => {
      await editPayment(project.id, editingPayment.id, formData);
      setEditingPayment(null);
    });
  };

  const totalAmount = project.payments.reduce(
    (sum, payment) => sum + payment.amount,
    0
  );

  const settlements = calculateSettlements(project.participants, project.payments);
  const iReceive = settlements.filter((t) => t.to === currentUserName);
  const iPay = settlements.filter((t) => t.from === currentUserName);
  const others = settlements.filter(
    (t) => t.from !== currentUserName && t.to !== currentUserName
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
        <PaymentFormModal
          title="支払いを記録"
          participants={project.participants}
          onSubmit={handleAddPayment}
          onCancel={() => setisOpen(false)}
          isPending={isPending}
          submitLabel="確定する"
          allowMultiplePayers
        />
      )}

      {editingPayment && (
        <PaymentFormModal
          title="支払いを編集"
          participants={project.participants}
          defaultValues={editingPayment}
          onSubmit={handleEditPayment}
          onCancel={() => setEditingPayment(null)}
          isPending={isPending}
          submitLabel="更新する"
        />
      )}

      {project.payments.length > 0 && (
        <div className="max-w-3xl mx-auto px-4 sm:px-8 mb-6">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 sm:p-5">
            <h2 className="text-sm font-bold text-blue-900 mb-3">精算方法</h2>
            {settlements.length === 0 ? (
              <p className="text-sm text-blue-700">精算の必要はありません</p>
            ) : (
              <div className="flex flex-col gap-4">
                {iReceive.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-green-700 mb-2">あなたが受け取る</p>
                    <div className="flex flex-col gap-2">
                      {iReceive.map((transfer, index) => (
                        <SettlementRow key={index} transfer={transfer} />
                      ))}
                    </div>
                  </div>
                )}

                {iPay.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-orange-700 mb-2">あなたが支払う</p>
                    <div className="flex flex-col gap-2">
                      {iPay.map((transfer, index) => (
                        <SettlementRow key={index} transfer={transfer} />
                      ))}
                    </div>
                  </div>
                )}

                {others.length > 0 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowOthers(!showOthers)}
                      className="flex items-center gap-1 text-xs font-bold text-blue-700">
                      その他の精算（{others.length}件）
                      <span className="text-blue-400">{showOthers ? "▲" : "▼"}</span>
                    </button>
                    {showOthers && (
                      <div className="flex flex-col gap-2 mt-2">
                        {others.map((transfer, index) => (
                          <SettlementRow key={index} transfer={transfer} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
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
              payment={payment}
              onEdit={setEditingPayment}
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

function PaymentRow({ projectId, payment, onEdit }) {
  const { id: paymentId, payer, memo, amount, isSettled } = payment;
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      await toggleSettled(projectId, paymentId, !isSettled);
    });
  };

  const handleDelete = () => {
    if (!window.confirm("この支払い記録を削除しますか？")) return;
    startTransition(async () => {
      await deletePayment(projectId, paymentId);
    });
  };

  return (
    <div className={`p-4 border rounded-lg transition-colors ${isSettled ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-200'
      }`}>
      <div className="flex items-center justify-between">
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

      <div className="flex justify-end gap-4 mt-2 pt-2 border-t border-gray-100">
        <button
          onClick={() => onEdit(payment)}
          disabled={isPending}
          className="text-xs font-bold text-gray-400 hover:text-blue-600 transition disabled:opacity-50">
          編集
        </button>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="text-xs font-bold text-gray-400 hover:text-red-600 transition disabled:opacity-50">
          削除
        </button>
      </div>
    </div>
  );
}
