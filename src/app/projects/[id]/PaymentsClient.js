"use client";
import { useId, useState, useTransition } from "react";
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
import Modal, { SubmitButton } from "@/components/Modal";
import ProjectFormFields from "@/components/ProjectFormFields";
import {
  CheckIcon,
  ChevronDownIcon,
  LinkIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/icons";
import {
  cardClass,
  iconButtonClass,
  primaryButtonClass,
  secondaryButtonClass,
  textFieldClass,
} from "@/components/ui";
import { calculateSettlements } from "@/lib/settlement";
import { balanceColorClass, formatPeriod, formatSignedYen, formatYen } from "@/lib/format";

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
      <form action={onSubmit} className="flex flex-col gap-4">
        <label className="flex items-center gap-2 border-b-2 border-gray-900 pb-1 focus-within:border-blue-600">
          <span aria-hidden="true" className="text-2xl font-bold text-blue-600">¥</span>
          <input
            type="number"
            name="amount"
            inputMode="numeric"
            aria-label="金額"
            defaultValue={defaultValues?.amount}
            required
            min="1"
            placeholder="0"
            className="min-w-0 flex-1 bg-transparent p-0 text-3xl font-bold tabular-nums text-gray-900 outline-none placeholder:text-gray-300 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </label>

        <input
          type="text"
          name="memo"
          aria-label="支払い内容"
          defaultValue={defaultValues?.memo}
          className={textFieldClass}
          placeholder="夕食、レンタカー など"
        />

        {/* 払った人（新規は複数選択のチェックボックス、編集は単一選択のラジオ）。見た目はチップ */}
        <fieldset className="flex min-w-0 flex-col">
          <legend className="sr-only">
            {allowMultiplePayers ? "払った人（複数選択で均等割り）" : "払った人"}
          </legend>
          <div className="flex flex-wrap gap-2">
            {participants.map((participant) => {
              const selected = allowMultiplePayers
                ? selectedPayers.includes(participant.name)
                : payer === participant.name;
              return (
                <label
                  key={participant.id}
                  className="inline-flex min-h-10 cursor-pointer items-center gap-1 rounded-full border border-gray-300 bg-white px-4 text-sm font-bold text-gray-700 transition has-[:checked]:border-blue-600 has-[:checked]:bg-blue-600 has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue-600"
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
            <p role="alert" className="mt-2 text-xs text-red-500">払った人を1人以上選んでください</p>
          )}
        </fieldset>

        <SubmitButton disabled={isPending || noPayerSelected}>{submitLabel}</SubmitButton>
      </form>
    </Modal>
  );
}

// 自分が関わる行は「あなた」と表示し、受け取りは青・支払いはオレンジで金額を色分けする
function SettlementRow({ transfer, currentUserName }) {
  const label = (name) => (name === currentUserName ? "あなた" : name);
  const amountClass =
    transfer.to === currentUserName
      ? "text-blue-600"
      : transfer.from === currentUserName
        ? "text-orange-600"
        : "text-gray-700";
  return (
    <li className="flex justify-between gap-3 py-2.5">
      <span className="min-w-0 break-words">
        {label(transfer.from)} → {label(transfer.to)}
      </span>
      <b className={`shrink-0 tabular-nums ${amountClass}`}>{formatYen(transfer.amount)}</b>
    </li>
  );
}

export default function PaymentsClient({ project, currentUserName, isOwner }) {
  const router = useRouter();
  const othersListId = useId();

  // useState初期値設定
  const [isOpen, setisOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [isEditingProject, setIsEditingProject] = useState(false);
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
    project.payments
  );
  const mine = settlements
    .filter((t) => t.to === currentUserName)
    .concat(settlements.filter((t) => t.from === currentUserName));
  const others = settlements.filter(
    (t) => t.from !== currentUserName && t.to !== currentUserName
  );

  const myBalance = Math.round(balances.get(currentUserName) ?? 0);
  const totalAmount = project.payments.reduce((sum, payment) => sum + payment.amount, 0);
  const meta = [
    project.destination,
    formatPeriod(project.startDate, project.endDate),
    `${project.participants.length}名`,
  ].filter(Boolean).join("　");

  return (
    <div className="min-h-screen bg-gray-50">
      <SiteHeader logoHref="/projects">
        <Link href="/projects" className="min-h-11 content-center text-sm text-gray-500 transition hover:text-gray-700">
          ← 一覧
        </Link>
      </SiteHeader>

      <main className="mx-auto max-w-5xl px-4 pt-6 pb-28 sm:px-6 sm:pt-8 lg:pb-12">
        <div className="flex items-start justify-between gap-3">
          <h1 className="min-w-0 break-words text-2xl font-bold text-gray-900 sm:text-3xl">{project.title}</h1>
          {isOwner && (
            <div className="flex">
              <button
                onClick={() => setIsEditingProject(true)}
                disabled={isPending}
                aria-label="旅行を編集"
                className={`${iconButtonClass} hover:text-blue-600`}>
                <PencilIcon />
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={isPending}
                aria-label="旅行を削除"
                className={`${iconButtonClass} hover:text-red-600`}>
                <TrashIcon />
              </button>
            </div>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm tabular-nums text-gray-500">{meta}</p>
          <button onClick={handleCopyInviteLink} className={`${secondaryButtonClass} min-h-10 text-sm`}>
            <LinkIcon />
            <span aria-live="polite">{copied ? "コピーしました" : "招待リンク"}</span>
          </button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
          {/* あなたの収支（スマホでは一番上、PCでは右側） */}
          {project.payments.length > 0 && (
            <section aria-label="精算" className={`${cardClass} p-5 sm:p-6 lg:order-2`}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-gray-500">あなたの収支</span>
                <span className={`text-3xl font-bold tabular-nums ${balanceColorClass(myBalance)}`}>
                  {formatSignedYen(myBalance)}
                </span>
              </div>

              {mine.length > 0 && (
                <ul className="mt-4 divide-y divide-gray-100 border-t border-gray-100 text-sm">
                  {mine.map((transfer, index) => (
                    <SettlementRow key={index} transfer={transfer} currentUserName={currentUserName} />
                  ))}
                </ul>
              )}

              {others.length > 0 && (
                <div className="mt-1">
                  <button
                    type="button"
                    onClick={() => setShowOthers(!showOthers)}
                    aria-expanded={showOthers}
                    aria-controls={othersListId}
                    className="inline-flex min-h-10 items-center gap-1 text-sm font-bold text-gray-400 transition hover:text-gray-600">
                    ほか {others.length}件
                    <ChevronDownIcon className={`transition-transform ${showOthers ? "rotate-180" : ""}`} />
                  </button>
                  {showOthers && (
                    <ul id={othersListId} className="divide-y divide-gray-100 border-t border-gray-100 text-sm">
                      {others.map((transfer, index) => (
                        <SettlementRow key={index} transfer={transfer} currentUserName={currentUserName} />
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </section>
          )}

          <section aria-label="支払い" className={`${cardClass} lg:order-1`}>
            {project.payments.length === 0 ? (
              <p className="py-12 text-center text-sm text-gray-400">まだ支払いがありません</p>
            ) : (
              <>
                <ul className="divide-y divide-gray-100">
                  {project.payments.map((payment) => (
                    <PaymentRow
                      key={payment.id}
                      projectId={project.id}
                      payment={payment}
                      onEdit={setEditingPayment}
                    />
                  ))}
                </ul>
                {/* 合計は金額列の真下、二重線の下に置く */}
                <div className="flex justify-end border-t-4 border-double border-gray-200 py-3 pr-[100px] pl-4">
                  <span className="font-bold tabular-nums text-gray-900" aria-label={`合計 ${formatYen(totalAmount)}`}>
                    {formatYen(totalAmount)}
                  </span>
                </div>
              </>
            )}
          </section>
        </div>

        <div className="mt-6 hidden justify-end lg:flex">
          <button onClick={() => setisOpen(true)} className={`${primaryButtonClass} min-h-12`}>
            <PlusIcon />
            支払いを記録
          </button>
        </div>
      </main>

      {/* スマホは一番使う操作を画面下に固定 */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 p-3 backdrop-blur lg:hidden">
        <button onClick={() => setisOpen(true)} className={`${primaryButtonClass} min-h-12 w-full`}>
          <PlusIcon />
          支払いを記録
        </button>
      </div>

      {isOpen && (
        <PaymentFormModal
          title="支払いを記録"
          participants={project.participants}
          onSubmit={handleAddPayment}
          onCancel={() => setisOpen(false)}
          isPending={isPending}
          submitLabel="記録"
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
          submitLabel="保存"
        />
      )}

      {isEditingProject && (
        <Modal title="旅行を編集" onClose={() => setIsEditingProject(false)}>
          <form action={handleEditProject} className="flex flex-col gap-3">
            <ProjectFormFields project={project} />
            <SubmitButton disabled={isPending}>保存</SubmitButton>
          </form>
        </Modal>
      )}
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
    <li className="flex items-center gap-3 py-2 pr-2 pl-4 sm:pl-5">
      <input
        type="checkbox"
        checked={isSettled}
        disabled={isPending}
        onChange={handleToggle}
        aria-label={isSettled ? "精算済みを解除" : "精算済みにする"}
        className="size-5 shrink-0 cursor-pointer accent-blue-600"
      />

      {/* 支払い内容が主、払った人が従。内容が空なら払った人を主にする */}
      <div className="min-w-0 flex-1 py-1">
        <p className={`break-words font-bold ${isSettled ? "text-gray-400 line-through" : "text-gray-900"}`}>
          {memo || payer}
        </p>
        {memo && <p className="text-xs text-gray-500">{payer}</p>}
      </div>

      <span className={`shrink-0 font-bold tabular-nums ${isSettled ? "text-gray-400" : "text-gray-900"}`}>
        {formatYen(amount)}
      </span>

      <div className="flex shrink-0">
        <button
          onClick={() => onEdit(payment)}
          disabled={isPending}
          aria-label="支払いを編集"
          className={`${iconButtonClass} hover:text-blue-600`}>
          <PencilIcon />
        </button>
        <button
          onClick={handleDelete}
          disabled={isPending}
          aria-label="支払いを削除"
          className={`${iconButtonClass} hover:text-red-600`}>
          <TrashIcon />
        </button>
      </div>
    </li>
  );
}
