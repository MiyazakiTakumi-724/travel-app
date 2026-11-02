"use client";
import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addPayment,
  deletePayment,
  deleteProject,
  editPayment,
  editProject,
  toggleSettled,
} from "./actions";
import SiteHeader from "@/components/SiteHeader";
import Modal, { ModalActions } from "@/components/Modal";
import ProjectFormFields from "@/components/ProjectFormFields";
import {
  CheckIcon,
  LinkIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/icons";
import {
  fieldLabelClass,
  primaryButtonClass,
  secondaryButtonClass,
  textButtonClass,
  textFieldClass,
} from "@/components/ui";
import { formatPeriod, formatSignedYen, formatYen } from "@/lib/format";
import { splitAmount } from "@/lib/split";

// 未清算の支払いを参加者で均等割りし、誰が誰にいくら払えば精算できるかを計算する
// balances は各参加者の収支（プラス=最終的に受け取る、マイナス=最終的に支払う）
function calculateSettlements(participants, payments) {
  if (participants.length === 0) return { transfers: [], balances: new Map() };

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

  return { transfers, balances };
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

  const noPayerSelected = allowMultiplePayers && selectedPayers.length === 0;

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
            <span aria-hidden="true" className="font-display text-[28px] text-primary">¥</span>
            <input
              type="number"
              name="amount"
              inputMode="numeric"
              defaultValue={defaultValues?.amount}
              required
              min="1"
              placeholder="0"
              className="min-w-0 flex-1 bg-transparent p-0 font-display text-[34px] text-ink outline-none placeholder:text-line-dashed [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={fieldLabelClass}>支払い内容</span>
          <input
            type="text"
            name="memo"
            defaultValue={defaultValues?.memo}
            className={textFieldClass}
            placeholder="例：夕食、レンタカー"
          />
        </label>

        {/* 支払者（新規は複数選択のチェックボックス、編集は単一選択のラジオ）。見た目はチップ */}
        <fieldset className="flex min-w-0 flex-col">
          <legend className={`${fieldLabelClass} mb-2.5`}>
            {allowMultiplePayers ? "支払者（複数選択で均等割り）" : "支払者"}
          </legend>
          <div className="flex flex-wrap gap-2">
            {participants.map((participant) => {
              const selected = allowMultiplePayers
                ? selectedPayers.includes(participant.name)
                : payer === participant.name;
              return (
                <label
                  key={participant.id}
                  className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-line-dashed bg-paper px-4 text-[15px] font-bold text-ink transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink"
                >
                  <input
                    type={allowMultiplePayers ? "checkbox" : "radio"}
                    name="payer"
                    value={participant.name}
                    checked={selected}
                    required={!allowMultiplePayers}
                    onChange={() =>
                      allowMultiplePayers ? togglePayer(participant.name) : setPayer(participant.name)
                    }
                    className="sr-only"
                  />
                  {selected && <CheckIcon />}
                  {participant.name}
                </label>
              );
            })}
          </div>
          {noPayerSelected && (
            <p role="alert" className="mt-2 text-xs text-pay">支払者を1人以上選択してください</p>
          )}
        </fieldset>

        <ModalActions
          submitLabel={submitLabel}
          onCancel={onCancel}
          disabled={isPending || noPayerSelected}
        />
      </form>
    </Modal>
  );
}

function applyPaymentChange(payments, change) {
  switch (change.type) {
    case "add":
      return [...payments, ...change.payments];
    case "edit":
      return payments.map((payment) =>
        payment.id === change.id ? { ...payment, ...change.changes } : payment
      );
    case "delete":
      return payments.filter((payment) => payment.id !== change.id);
    default:
      return payments;
  }
}

// 自分が関わる送金を「〇〇さんへ／〇〇さんから」の形で表示する
function MySettlementRow({ transfer, currentUserName }) {
  const isPaying = transfer.from === currentUserName;
  return (
    <li className="flex justify-between gap-3 font-bold">
      <span className="min-w-0 break-words">
        {isPaying ? `${transfer.to}さんへ` : `${transfer.from}さんから`}
      </span>
      <span className={`shrink-0 ${isPaying ? "text-pay" : "text-primary"}`}>
        {formatYen(transfer.amount)}
      </span>
    </li>
  );
}

export default function PaymentsClient({ project, currentUserName, isOwner }) {
  const router = useRouter();

  // useState初期値設定
  const [isOpen, setisOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const handleCopyInviteLink = async () => {
    const inviteUrl = `${window.location.origin}/invite/${project.id}`;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // サーバーの返事を待たずに支払い一覧へ先に反映する。処理が終わると最新のデータに置き換わる
  const [payments, applyOptimistic] = useOptimistic(project.payments, applyPaymentChange);

  const handleAddPayment = (formData) => {
    const payers = formData.getAll("payer").map(String);
    const amount = Number(formData.get("amount"));
    const memo = formData.get("memo")?.toString().trim();
    const amounts = splitAmount(amount, payers.length);
    setisOpen(false);
    startTransition(async () => {
      applyOptimistic({
        type: "add",
        payments: payers.map((payer, index) => ({
          id: `pending-${Date.now()}-${index}`,
          payer,
          memo,
          amount: amounts[index],
          isSettled: false,
        })),
      });
      await addPayment(project.id, formData);
    });
  };

  const handleEditPayment = (formData) => {
    // React Compiler が依存値として描画時に読むので、編集中でないとき（null）でも落ちないようにする
    const paymentId = editingPayment?.id;
    setEditingPayment(null);
    startTransition(async () => {
      applyOptimistic({
        type: "edit",
        id: paymentId,
        changes: {
          payer: formData.get("payer")?.toString(),
          memo: formData.get("memo")?.toString().trim(),
          amount: Number(formData.get("amount")),
        },
      });
      await editPayment(project.id, paymentId, formData);
    });
  };

  const handleToggleSettled = (paymentId, isSettled) => {
    startTransition(async () => {
      applyOptimistic({ type: "edit", id: paymentId, changes: { isSettled } });
      await toggleSettled(project.id, paymentId, isSettled);
    });
  };

  const handleDeletePayment = (paymentId) => {
    if (!window.confirm("この支払い記録を削除しますか？")) return;
    startTransition(async () => {
      applyOptimistic({ type: "delete", id: paymentId });
      await deletePayment(project.id, paymentId);
    });
  };

  const handleEditProject = (formData) => {
    startTransition(async () => {
      await editProject(project.id, formData);
      setIsEditingProject(false);
    });
  };

  const handleDeleteProject = () => {
    if (!window.confirm(`「${project.title}」を削除しますか？支払い記録もすべて削除されます。`)) return;
    startTransition(async () => {
      await deleteProject(project.id);
      router.push("/projects");
    });
  };

  const { transfers: settlements, balances } = calculateSettlements(
    project.participants,
    payments
  );
  const mine = settlements.filter(
    (t) => t.from === currentUserName || t.to === currentUserName
  );
  const others = settlements.filter(
    (t) => t.from !== currentUserName && t.to !== currentUserName
  );

  const myBalance = Math.round(balances.get(currentUserName) ?? 0);
  const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);

  const balanceLabel =
    myBalance > 0 ? "あなたが受け取る金額" : myBalance < 0 ? "あなたが支払う金額" : "あなたの精算";
  const ticketBalanceClass =
    myBalance > 0 ? "text-primary" : myBalance < 0 ? "text-pay" : "text-ink-faint";
  const barBalanceClass =
    myBalance > 0 ? "text-primary-light" : myBalance < 0 ? "text-pay-light" : "text-line-soft";

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader logoHref="/projects">
        <Link
          href="/projects"
          className="inline-flex min-h-11 items-center text-sm font-medium text-ink-muted transition-colors hover:text-primary">
          ← 一覧に戻る
        </Link>
      </SiteHeader>

      <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-8 px-5 pt-6 pb-12 sm:px-6 sm:pt-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <h1 className="min-w-0 break-words font-display text-[clamp(32px,5vw,48px)] leading-tight">
                {project.title}
              </h1>
              {isOwner && (
                <div className="flex gap-1">
                  <button
                    onClick={() => setIsEditingProject(true)}
                    disabled={isPending}
                    className={`${textButtonClass} hover:text-primary`}>
                    編集
                  </button>
                  <button
                    onClick={handleDeleteProject}
                    disabled={isPending}
                    className={`${textButtonClass} hover:text-pay`}>
                    削除
                  </button>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 font-medium text-ink-sub">
              <span>{project.destination || "目的地未定"}</span>
              <span>{formatPeriod(project.startDate, project.endDate)}</span>
            </div>
            <ul aria-label="メンバー" className="mt-2 flex flex-wrap gap-2">
              {project.participants.map((participant) => (
                <li
                  key={participant.id}
                  className={`rounded-full px-3 py-0.5 text-sm font-medium ${
                    participant.name === currentUserName ? "bg-primary text-white" : "bg-paper"
                  }`}>
                  {participant.name === currentUserName ? `${participant.name}（あなた）` : participant.name}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleCopyInviteLink}
              className={`${secondaryButtonClass} min-h-12 text-[15px]`}>
              <LinkIcon />
              <span aria-live="polite">{copied ? "コピーしました！" : "招待リンクをコピー"}</span>
            </button>
            <button
              onClick={() => setisOpen(true)}
              className={`${primaryButtonClass} min-h-12 text-[15px]`}>
              <PlusIcon />
              支払いを記録
            </button>
          </div>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[1fr_380px] lg:gap-10">
          <section aria-labelledby="payments-heading" className="flex min-w-0 flex-col gap-3.5">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="payments-heading" className="text-xl font-black">支払い記録</h2>
              <span className="text-sm text-ink-sub">合計 {formatYen(totalAmount)}</span>
            </div>

            {payments.length === 0 ? (
              <button
                onClick={() => setisOpen(true)}
                className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-dashed font-bold text-primary transition-colors hover:bg-paper focus-visible:outline-2 focus-visible:outline-primary">
                <PlusIcon size={24} />
                最初の支払いを記録
              </button>
            ) : (
              <ul className="divide-y divide-sky-ground rounded-xl bg-paper">
                {payments.map((payment) => (
                  <PaymentRow
                    key={payment.id}
                    payment={payment}
                    onEdit={setEditingPayment}
                    onToggle={handleToggleSettled}
                    onDelete={handleDeletePayment}
                  />
                ))}
              </ul>
            )}
          </section>

          {/* 自分の精算をきっぷ風に表示。スマホでは支払い記録より上に出す */}
          {payments.length > 0 && (
            <aside aria-labelledby="settlement-heading" className="order-first flex min-w-0 flex-col gap-7 lg:order-none">
              <div className="drop-shadow-[0_14px_20px_rgb(21_128_196/0.15)]">
                <div className="ticket-top px-[26px] pt-[22px] pb-4">
                  <h2 id="settlement-heading" className="text-sm font-bold text-ink-sub">{balanceLabel}</h2>
                  <p className={`mt-0.5 font-display text-[44px] leading-tight ${ticketBalanceClass}`}>
                    {formatYen(Math.abs(myBalance))}
                  </p>
                </div>
                <div className="ticket-bottom px-[26px] pt-4 pb-5">
                  {mine.length > 0 ? (
                    <ul className="flex flex-col gap-1.5">
                      {mine.map((transfer, index) => (
                        <MySettlementRow key={index} transfer={transfer} currentUserName={currentUserName} />
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-ink-sub">
                      {settlements.length === 0 ? "精算の必要はありません" : "あなたの送金・受け取りはありません"}
                    </p>
                  )}
                </div>
              </div>

              {others.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h3 className="font-black">ほかのメンバーの精算</h3>
                  <ul className="flex flex-col gap-0.5 overflow-hidden rounded-lg">
                    {others.map((transfer, index) => (
                      <li key={index} className="flex justify-between gap-3 bg-paper px-4 py-3 text-[15px]">
                        <span className="min-w-0 break-words">
                          {transfer.from} <span className="text-pay">→</span> {transfer.to}
                        </span>
                        <b className="shrink-0">{formatYen(transfer.amount)}</b>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </aside>
          )}
        </div>
      </main>

      {/* 自分の収支（PCでは精算券と重複するのでスマホのみ） */}
      <div className="sticky bottom-0 bg-ink text-white lg:hidden">
        <div className="mx-auto flex w-full max-w-[1120px] items-center justify-between gap-3 px-5 py-3.5 sm:px-6">
          <span className="min-w-0 text-sm font-bold text-line-soft">{balanceLabel}</span>
          <span className={`shrink-0 font-display text-2xl ${barBalanceClass}`}>
            {formatSignedYen(myBalance)}
          </span>
        </div>
      </div>

      {isOpen && (
        <PaymentFormModal
          title="支払いを記録"
          participants={project.participants}
          onSubmit={handleAddPayment}
          onCancel={() => setisOpen(false)}
          isPending={isPending}
          submitLabel="記録する"
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

      {isEditingProject && (
        <Modal title="旅行を編集" onClose={() => setIsEditingProject(false)}>
          <form action={handleEditProject} className="flex flex-col gap-5">
            <ProjectFormFields project={project} />
            <ModalActions
              submitLabel="更新する"
              onCancel={() => setIsEditingProject(false)}
              disabled={isPending}
            />
          </form>
        </Modal>
      )}
    </div>
  );
}

function PaymentRow({ payment, onEdit, onToggle, onDelete }) {
  const { id: paymentId, payer, memo, amount, isSettled } = payment;
  // 保存中の仮の行はまだIDが確定していないので操作できない
  const isPending = String(paymentId).startsWith("pending-");

  const handleToggle = () => onToggle(paymentId, !isSettled);
  const handleDelete = () => onDelete(paymentId);

  const iconButtonClass =
    "flex size-10 items-center justify-center rounded-lg text-ink-muted transition-colors focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60";

  return (
    <li className="flex items-center gap-2 px-2 py-4 sm:gap-3 sm:px-3">
      <label className="flex size-11 flex-none cursor-pointer items-center justify-center">
        <input
          type="checkbox"
          checked={isSettled}
          disabled={isPending}
          onChange={handleToggle}
          aria-label={isSettled ? "精算済みを解除" : "精算済みにする"}
          className="size-[22px] cursor-pointer accent-primary"
        />
      </label>

      {/* 支払い内容が主、支払者が従。内容が空なら支払者を主にする */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={`break-words text-[17px] font-bold ${isSettled ? "text-ink-faint line-through" : ""}`}>
          {memo || `${payer}の支払い`}
        </span>
        <span className={`text-sm ${isSettled ? "text-ink-faint" : "text-ink-sub"}`}>
          {memo ? `${payer}が支払い` : ""}
          {memo && isSettled ? "／" : ""}
          {isSettled ? "精算済み" : ""}
        </span>
      </div>

      <span className={`shrink-0 text-lg font-black ${isSettled ? "text-ink-faint line-through" : ""}`}>
        {formatYen(amount)}
      </span>

      <div className="flex">
        <button
          onClick={() => onEdit(payment)}
          disabled={isPending}
          aria-label="支払いを編集"
          className={`${iconButtonClass} hover:text-primary`}>
          <PencilIcon />
        </button>
        <button
          onClick={handleDelete}
          disabled={isPending}
          aria-label="支払いを削除"
          className={`${iconButtonClass} hover:text-pay`}>
          <TrashIcon />
        </button>
      </div>
    </li>
  );
}
