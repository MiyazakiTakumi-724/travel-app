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
import Stamp from "@/components/Stamp";
import {
  CheckIcon,
  ChevronDownIcon,
  LinkIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/icons";
import {
  primaryButtonClass,
  secondaryButtonClass,
  textFieldClass,
} from "@/components/ui";

const iconButtonClass =
  "flex size-10 items-center justify-center text-ink-muted transition-colors focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60";
import { formatPeriod, formatSignedYen, formatYen } from "@/lib/format";

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
      <form action={onSubmit} className="flex flex-col gap-5">
        <label className="flex items-center gap-2 border-b-2 border-ink pb-1.5 focus-within:border-primary">
          <span aria-hidden="true" className="font-mono text-[28px] font-bold text-primary">¥</span>
          <input
            type="number"
            name="amount"
            inputMode="numeric"
            aria-label="金額"
            defaultValue={defaultValues?.amount}
            required
            min="1"
            placeholder="0"
            className="min-w-0 flex-1 bg-transparent p-0 font-mono text-[34px] font-bold text-ink outline-none placeholder:text-line-dashed [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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

        {/* 支払者（新規は複数選択のチェックボックス、編集は単一選択のラジオ）。見た目はチップ */}
        <fieldset className="flex min-w-0 flex-col">
          <legend className="sr-only">
            {allowMultiplePayers ? "支払った人（複数選択で均等割り）" : "支払った人"}
          </legend>
          <div className="flex flex-wrap gap-2">
            {participants.map((participant) => {
              const selected = allowMultiplePayers
                ? selectedPayers.includes(participant.name)
                : payer === participant.name;
              return (
                <label
                  key={participant.id}
                  className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 border-[1.5px] border-line-dashed bg-paper px-4 text-[15px] font-bold text-ink transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink"
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
      ? "text-primary"
      : transfer.from === currentUserName
        ? "text-pay"
        : "";
  return (
    <li className="flex justify-between gap-3 font-mono text-[15px]">
      <span className="min-w-0 break-words">
        {label(transfer.from)} → {label(transfer.to)}
      </span>
      <b className={`shrink-0 ${amountClass}`}>{formatYen(transfer.amount)}</b>
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
  const iReceive = settlements.filter((t) => t.to === currentUserName);
  const iPay = settlements.filter((t) => t.from === currentUserName);
  const others = settlements.filter(
    (t) => t.from !== currentUserName && t.to !== currentUserName
  );

  const myBalance = Math.round(balances.get(currentUserName) ?? 0);
  const totalAmount = project.payments.reduce((sum, payment) => sum + payment.amount, 0);
  const period = formatPeriod(project.startDate, project.endDate);

  const receiptBalanceClass =
    myBalance > 0 ? "text-primary" : myBalance < 0 ? "text-pay" : "text-ink-muted";
  const barBalanceClass =
    myBalance > 0 ? "text-sky-shadow" : myBalance < 0 ? "text-[#F6B28A]" : "text-line-soft";

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader logoHref="/projects">
        <Link
          href="/projects"
          className="inline-flex min-h-11 items-center text-sm font-medium text-ink-muted transition-colors hover:text-primary">
          ← 一覧
        </Link>
      </SiteHeader>

      <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-9 px-6 pt-10 pb-12 sm:pt-12">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="min-w-0 break-words text-[clamp(32px,4vw,48px)] font-extrabold tracking-[-0.01em]">
                {project.title}
              </h1>
              {isOwner && (
                <div className="flex">
                  <button
                    onClick={() => setIsEditingProject(true)}
                    disabled={isPending}
                    aria-label="旅行を編集"
                    className={`${iconButtonClass} hover:text-primary`}>
                    <PencilIcon />
                  </button>
                  <button
                    onClick={handleDeleteProject}
                    disabled={isPending}
                    aria-label="旅行を削除"
                    className={`${iconButtonClass} hover:text-pay`}>
                    <TrashIcon />
                  </button>
                </div>
              )}
            </div>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] text-ink-sub">
              {project.destination && <span className="font-bold text-ink">{project.destination}</span>}
              {period && <span className="font-mono">{period}</span>}
              <span className="font-mono">{project.participants.length}名</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleCopyInviteLink}
              className={`${secondaryButtonClass} min-h-12 text-[15px]`}>
              <LinkIcon />
              <span aria-live="polite">{copied ? "コピーしました" : "招待リンク"}</span>
            </button>
            <button
              onClick={() => setisOpen(true)}
              className={`${primaryButtonClass} min-h-12 text-[15px]`}>
              <PlusIcon />
              支払いを記録
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-8">
          <section aria-label="支払い" className="flex min-w-0 flex-[999_1_560px] flex-col">
            {project.payments.length === 0 ? (
              <p className="border-y-[1.5px] border-ink py-12 text-center text-sm text-ink-muted">
                まだ支払いがありません
              </p>
            ) : (
              <>
                <ul className="border-t-[1.5px] border-ink">
                  {project.payments.map((payment) => (
                    <PaymentRow
                      key={payment.id}
                      projectId={project.id}
                      payment={payment}
                      onEdit={setEditingPayment}
                    />
                  ))}
                </ul>
                {/* 合計はリスト末尾の二重線の下に置き、ラベルなしで伝える */}
                <div className="flex justify-end border-t-[3px] border-double border-ink pt-3 pr-[98px] font-mono text-base font-bold sm:pr-[102px] sm:text-lg">
                  <span aria-label={`合計 ${formatYen(totalAmount)}`}>{formatYen(totalAmount)}</span>
                </div>
              </>
            )}
          </section>

          {/* 精算方法レシート。スマホでは支払い記録より上に表示する */}
          {project.payments.length > 0 && (
            <aside
              aria-labelledby="settlement-heading"
              className="order-first flex min-w-0 flex-[1_1_340px] flex-col gap-4 bg-paper px-[26px] pt-7 pb-8 shadow-[0_24px_40px_-28px_rgba(11,116,181,0.5)] lg:order-none"
            >
              <h2 id="settlement-heading" className="text-center font-mono text-sm font-bold tracking-[0.2em]">
                *** 精算方法 ***
              </h2>
              <div className="border-t border-dashed border-ink" />

              {settlements.length === 0 ? (
                <p className="text-center font-mono text-sm text-ink-sub">精算なし</p>
              ) : (
                <>
                  {/* 自分が受け取る行 → 自分が払う行の順に並べ、それ以外は折りたたむ */}
                  {iReceive.length + iPay.length > 0 && (
                    <ul className="flex flex-col gap-2.5">
                      {[...iReceive, ...iPay].map((transfer, index) => (
                        <SettlementRow key={index} transfer={transfer} currentUserName={currentUserName} />
                      ))}
                    </ul>
                  )}

                  {others.length > 0 && (
                    <div className="flex flex-col gap-2.5">
                      <button
                        type="button"
                        onClick={() => setShowOthers(!showOthers)}
                        aria-expanded={showOthers}
                        aria-controls={othersListId}
                        className="inline-flex min-h-10 items-center gap-1.5 self-start font-mono text-[13px] font-bold text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-primary">
                        ほか {others.length}件
                        <ChevronDownIcon className={`transition-transform ${showOthers ? "rotate-180" : ""}`} />
                      </button>
                      {showOthers && (
                        <ul id={othersListId} className="flex flex-col gap-2.5">
                          {others.map((transfer, index) => (
                            <SettlementRow key={index} transfer={transfer} currentUserName={currentUserName} />
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </>
              )}

              <div className="border-t border-dashed border-ink" />
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold">あなたの収支</span>
                <span className={`font-mono text-[30px] font-bold ${receiptBalanceClass}`}>
                  {formatSignedYen(myBalance)}
                </span>
              </div>
            </aside>
          )}
        </div>
      </main>

      {/* 精算後の自分の収支（PCでは精算レシートと重複するのでスマホのみ） */}
      <div className="sticky bottom-0 bg-ink text-white lg:hidden">
        <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between gap-4 px-6 py-4">
          <span className="text-sm text-line-soft">あなたの収支</span>
          <span className={`font-mono text-[26px] font-bold ${barBalanceClass}`}>
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
          <form action={handleEditProject} className="flex flex-col gap-4">
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
    <li className="flex items-center gap-3 border-b border-line-soft px-1 py-[18px] sm:gap-4">
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
        <span className={`break-words text-base font-bold ${isSettled ? "text-ink-faint line-through" : ""}`}>
          {memo || payer}
        </span>
        {memo && (
          <span className={`text-[13px] ${isSettled ? "text-ink-faint" : "text-ink-muted"}`}>
            {payer}
          </span>
        )}
      </div>

      {isSettled && (
        <span className="hidden shrink-0 sm:inline-flex">
          <Stamp small />
        </span>
      )}
      <span className={`shrink-0 font-mono text-base font-bold sm:text-lg ${isSettled ? "text-ink-faint" : ""}`}>
        {formatYen(amount)}
      </span>

      <div className="flex gap-0.5">
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
