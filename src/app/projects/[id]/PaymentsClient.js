"use client";
import { useEffect, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addPayment,
  deletePayment,
  deleteProject,
  editPayment,
  editProject,
  restorePayment,
  toggleSettled,
} from "./actions";
import Modal, { ModalActions } from "@/components/Modal";
import ProjectFormFields from "@/components/ProjectFormFields";
import {
  CheckIcon,
  LinkIcon,
  PlusIcon,
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

// 同じニックネームの参加者がいても見分けられるよう、2人目以降に番号を付けた表示名を作る
function buildDisplayNames(participants) {
  const seen = new Map();
  const names = new Map();
  for (const participant of participants) {
    const count = (seen.get(participant.name) ?? 0) + 1;
    seen.set(participant.name, count);
    names.set(participant.id, count === 1 ? participant.name : `${participant.name}（${count}）`);
  }
  return names;
}

// 未清算の支払いを参加者で均等割りし、誰が誰にいくら払えば精算できるかを計算する
// balances は参加者IDごとの収支（プラス=最終的に受け取る、マイナス=最終的に支払う）
// 名前をキーにすると同じニックネームの参加者が1人にまとまってしまうので、必ずIDで集計する
function calculateSettlements(participants, payments) {
  if (participants.length === 0) return { transfers: [], balances: new Map() };

  const unsettled = payments.filter((payment) => !payment.isSettled);
  const total = unsettled.reduce((sum, payment) => sum + payment.amount, 0);
  const share = total / participants.length;

  const balances = new Map(participants.map((p) => [p.id, -share]));
  for (const payment of unsettled) {
    balances.set(payment.payerId, (balances.get(payment.payerId) ?? -share) + payment.amount);
  }

  const creditors = [];
  const debtors = [];
  for (const [id, balance] of balances) {
    if (balance > 0.5) creditors.push({ id, amount: balance });
    else if (balance < -0.5) debtors.push({ id, amount: -balance });
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
      transfers.push({ from: debtor.id, to: creditor.id, amount: Math.round(amount) });
    }

    debtor.amount -= amount;
    creditor.amount -= amount;
    if (debtor.amount <= 0.5) i++;
    if (creditor.amount <= 0.5) j++;
  }

  return { transfers, balances };
}

// 支払い内容の候補。「その他」を選ぶと自由に入力できる
const MEMO_OPTIONS = ["食事", "宿", "交通費", "ガソリン", "観光", "買い物"];
const OTHER = "その他";

// 編集時は保存済みの内容から、どのチップを選んだ状態にするかを決める
function initialMemoChoice(memo) {
  if (!memo) return null;
  return MEMO_OPTIONS.includes(memo) ? memo : OTHER;
}

function PaymentFormModal({ title, participants, displayNames, defaultValues, defaultPayerId, onSubmit, onCancel, onDelete, isPending, submitLabel, allowMultiplePayers }) {
  // 新規のときは自分を支払者にしておく（自分で払った分を記録することが一番多いため）
  const initialPayerId = defaultValues?.payerId ?? defaultPayerId ?? participants[0]?.id ?? "";
  const [payer, setPayer] = useState(initialPayerId);
  const [selectedPayers, setSelectedPayers] = useState(initialPayerId ? [initialPayerId] : []);
  const [memoChoice, setMemoChoice] = useState(initialMemoChoice(defaultValues?.memo));
  const [otherMemo, setOtherMemo] = useState(
    initialMemoChoice(defaultValues?.memo) === OTHER ? defaultValues.memo : ""
  );
  const memo = memoChoice === OTHER ? otherMemo : memoChoice ?? "";

  const togglePayer = (id) => {
    setSelectedPayers((current) =>
      current.includes(id) ? current.filter((n) => n !== id) : [...current, id]
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
            <span aria-hidden="true" className="amount text-[28px] text-primary">¥</span>
            <input
              type="number"
              name="amount"
              inputMode="numeric"
              defaultValue={defaultValues?.amount}
              required
              min="1"
              placeholder="0"
              className="min-w-0 flex-1 bg-transparent p-0 amount text-[34px] text-ink outline-none placeholder:text-line-dashed [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </span>
        </label>

        {/* 支払い内容はチップから選ぶ。もう一度押すと選択を外せる */}
        <fieldset className="flex min-w-0 flex-col">
          <legend className={`${fieldLabelClass} mb-2.5`}>支払い内容</legend>
          <input type="hidden" name="memo" value={memo} />
          <div className="flex flex-wrap gap-2">
            {[...MEMO_OPTIONS, OTHER].map((option) => {
              const selected = memoChoice === option;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setMemoChoice(selected ? null : option)}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full border-[1.5px] border-line-dashed bg-paper px-4 text-[15px] font-bold text-ink transition-colors aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  {selected && <CheckIcon />}
                  {option}
                </button>
              );
            })}
          </div>
          {memoChoice === OTHER && (
            <input
              type="text"
              aria-label="支払い内容（自由入力）"
              value={otherMemo}
              onChange={(event) => setOtherMemo(event.target.value)}
              autoFocus
              className={`${textFieldClass} mt-2.5`}
              placeholder="例：レンタカー、スキー場のリフト券"
            />
          )}
        </fieldset>

        {/* 支払者（新規は複数選択のチェックボックス、編集は単一選択のラジオ）。見た目はチップ */}
        <fieldset className="flex min-w-0 flex-col">
          <legend className={`${fieldLabelClass} mb-2.5`}>
            {allowMultiplePayers ? "支払者（複数選択で均等割り）" : "支払者"}
          </legend>
          <div className="flex flex-wrap gap-2">
            {participants.map((participant) => {
              const selected = allowMultiplePayers
                ? selectedPayers.includes(participant.id)
                : payer === participant.id;
              return (
                <label
                  key={participant.id}
                  className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-line-dashed bg-paper px-4 text-[15px] font-bold text-ink transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink"
                >
                  <input
                    type={allowMultiplePayers ? "checkbox" : "radio"}
                    name="payerId"
                    value={participant.id}
                    checked={selected}
                    required={!allowMultiplePayers}
                    onChange={() =>
                      allowMultiplePayers ? togglePayer(participant.id) : setPayer(participant.id)
                    }
                    className="sr-only"
                  />
                  {selected && <CheckIcon />}
                  {displayNames.get(participant.id)}
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

function applyPaymentChange(payments, change) {
  switch (change.type) {
    case "add":
      return [...payments, ...change.payments];
    case "restore":
      // 作成日時の順に並べ直して、元の位置に戻す
      return [...payments, change.payment].sort(
        (a, b) => new Date(a.createdAt ?? 0) - new Date(b.createdAt ?? 0)
      );
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
function MySettlementRow({ transfer, currentParticipantId, displayNames }) {
  const isPaying = transfer.from === currentParticipantId;
  return (
    <li className="flex justify-between gap-3 font-bold">
      <span className="min-w-0 break-words">
        {isPaying
          ? `${displayNames.get(transfer.to)}さんへ`
          : `${displayNames.get(transfer.from)}さんから`}
      </span>
      <span className={`shrink-0 ${isPaying ? "text-pay" : "text-primary"}`}>
        {formatYen(transfer.amount)}
      </span>
    </li>
  );
}

export default function PaymentsClient({ project, currentParticipantId, isOwner }) {
  const router = useRouter();

  // useState初期値設定
  const [isOpen, setisOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  // 直前に削除した支払い。「元に戻す」を出している間だけ持つ
  const [deletedPayment, setDeletedPayment] = useState(null);

  useEffect(() => {
    if (!deletedPayment) return;
    const timer = setTimeout(() => setDeletedPayment(null), 6000);
    return () => clearTimeout(timer);
  }, [deletedPayment]);

  const handleCopyInviteLink = async () => {
    const inviteUrl = `${window.location.origin}/invite/${project.id}`;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // サーバーの返事を待たずに支払い一覧へ先に反映する。処理が終わると最新のデータに置き換わる
  const [payments, applyOptimistic] = useOptimistic(project.payments, applyPaymentChange);

  const handleAddPayment = (formData) => {
    const payerIds = formData.getAll("payerId").map(String);
    const amount = Number(formData.get("amount"));
    const memo = formData.get("memo")?.toString().trim();
    const amounts = splitAmount(amount, payerIds.length);
    setisOpen(false);
    startTransition(async () => {
      applyOptimistic({
        type: "add",
        payments: payerIds.map((payerId, index) => ({
          id: `pending-${Date.now()}-${index}`,
          payerId,
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
          payerId: formData.get("payerId")?.toString(),
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

  // 確認ダイアログは出さずにすぐ消し、代わりに「元に戻す」を数秒間表示する
  const handleDeletePayment = () => {
    const payment = editingPayment;
    if (!payment) return;
    setEditingPayment(null);
    setDeletedPayment(payment);
    startTransition(async () => {
      applyOptimistic({ type: "delete", id: payment.id });
      await deletePayment(project.id, payment.id);
    });
  };

  const handleUndoDelete = () => {
    const payment = deletedPayment;
    if (!payment) return;
    setDeletedPayment(null);
    startTransition(async () => {
      applyOptimistic({ type: "restore", payment });
      await restorePayment(project.id, payment);
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

  const displayNames = buildDisplayNames(project.participants);
  const { transfers: settlements, balances } = calculateSettlements(
    project.participants,
    payments
  );
  const mine = settlements.filter(
    (t) => t.from === currentParticipantId || t.to === currentParticipantId
  );
  const others = settlements.filter(
    (t) => t.from !== currentParticipantId && t.to !== currentParticipantId
  );

  const myBalance = Math.round(balances.get(currentParticipantId) ?? 0);
  const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);

  const balanceLabel =
    myBalance > 0 ? "あなたが受け取る金額" : myBalance < 0 ? "あなたが支払う金額" : "あなたの精算";
  const ticketBalanceClass =
    myBalance > 0 ? "text-primary" : myBalance < 0 ? "text-pay" : "text-ink-faint";
  const barBalanceClass =
    myBalance > 0 ? "text-primary-light" : myBalance < 0 ? "text-pay-light" : "text-line-soft";

  return (
    <div className="flex min-h-screen flex-col">
      {/* スマホアプリと同じく、戻るは左上・プロジェクトの操作は右上に置く */}
      <header className="mx-auto flex w-full max-w-280 items-center justify-between gap-2 px-2.5 pt-2 sm:px-6 sm:pt-4">
        <Link
          href="/projects"
          className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2.5 text-[15px] font-bold text-primary transition-colors hover:bg-paper focus-visible:outline-2 focus-visible:outline-primary">
          <span aria-hidden="true" className="text-xl leading-none">‹</span>
          一覧
        </Link>
        {isOwner && (
          <div className="flex">
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
      </header>

      <main className="mx-auto flex w-full max-w-280 flex-1 flex-col gap-6 px-5 pt-2 pb-12 sm:gap-8 sm:px-6 sm:pt-6">
        <div className="flex flex-wrap items-end justify-between gap-4 sm:gap-6">
          <div className="flex min-w-0 flex-col gap-1.5">
            {/* スマホでは小さめにして、すぐ下の精算券が最初の画面に入るようにする */}
            <h1 className="min-w-0 break-words heading text-[clamp(26px,5vw,42px)] leading-tight">
              {project.title}
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm font-medium text-ink-sub sm:text-base">
              <span>{project.destination || "目的地未定"}</span>
              <span>{formatPeriod(project.startDate, project.endDate)}</span>
            </div>
            <ul aria-label="メンバー" className="mt-1.5 flex flex-wrap gap-1.5">
              {project.participants.map((participant) => (
                <li
                  key={participant.id}
                  className={`rounded-full px-3 py-0.5 text-sm font-medium ${
                    participant.id === currentParticipantId ? "bg-primary text-white" : "bg-paper"
                  }`}>
                  {displayNames.get(participant.id)}
                  {participant.id === currentParticipantId ? "（あなた）" : ""}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleCopyInviteLink}
              className={`${secondaryButtonClass} min-h-11 text-sm sm:min-h-12 sm:text-[15px]`}>
              <LinkIcon />
              <span aria-live="polite">{copied ? "コピーしました！" : "招待リンクをコピー"}</span>
            </button>
            {/* スマホでは画面下のバーに同じボタンがあるので、PCのときだけ出す */}
            <button
              onClick={() => setisOpen(true)}
              className={`${primaryButtonClass} min-h-12 text-[15px] max-lg:hidden`}>
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
                className="flex min-h-45 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-dashed font-bold text-primary transition-colors hover:bg-paper focus-visible:outline-2 focus-visible:outline-primary">
                <PlusIcon size={24} />
                最初の支払いを記録
              </button>
            ) : (
              <ul className="divide-y divide-sky-ground rounded-xl bg-paper">
                {payments.map((payment) => (
                  <PaymentRow
                    key={payment.id}
                    payment={payment}
                    payerName={displayNames.get(payment.payerId) ?? "不明"}
                    onEdit={setEditingPayment}
                    onToggle={handleToggleSettled}
                  />
                ))}
              </ul>
            )}
          </section>

          {/* 自分の精算をきっぷ風に表示。スマホでは支払い記録より上に出す */}
          {payments.length > 0 && (
            <aside aria-labelledby="settlement-heading" className="order-first flex min-w-0 flex-col gap-7 lg:order-none">
              <div className="drop-shadow-[0_14px_20px_rgb(21_128_196/0.15)]">
                <div className="ticket-top px-6.5 pt-5.5 pb-4">
                  <h2 id="settlement-heading" className="text-sm font-bold text-ink-sub">{balanceLabel}</h2>
                  <p className={`mt-0.5 amount text-[48px] leading-tight ${ticketBalanceClass}`}>
                    {formatYen(Math.abs(myBalance))}
                  </p>
                </div>
                <div className="ticket-bottom px-6.5 pt-4 pb-5">
                  {mine.length > 0 ? (
                    <ul className="flex flex-col gap-1.5">
                      {mine.map((transfer, index) => (
                        <MySettlementRow
                          key={index}
                          transfer={transfer}
                          currentParticipantId={currentParticipantId}
                          displayNames={displayNames}
                        />
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
                          {displayNames.get(transfer.from)} <span className="text-pay">→</span>{" "}
                          {displayNames.get(transfer.to)}
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

      {/* スマホ用の下部バー。自分の収支と、一番よく使う「記録」ボタンを親指の届く位置に置く（PCでは精算券と上のボタンがあるので出さない） */}
      <div className="sticky bottom-0 bg-ink pb-[env(safe-area-inset-bottom)] text-white lg:hidden">
        <div className="mx-auto flex w-full max-w-280 items-center justify-between gap-3 px-5 py-3 sm:px-6">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-xs font-bold text-line-soft">{balanceLabel}</span>
            <span className={`amount text-[26px] leading-none ${barBalanceClass}`}>
              {formatSignedYen(myBalance)}
            </span>
          </div>
          <button
            onClick={() => setisOpen(true)}
            className={`${primaryButtonClass} min-h-12 shrink-0 rounded-full px-5 text-[15px]`}>
            <PlusIcon />
            記録
          </button>
        </div>
      </div>

      {isOpen && (
        <PaymentFormModal
          title="支払いを記録"
          participants={project.participants}
          displayNames={displayNames}
          defaultPayerId={currentParticipantId}
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
          displayNames={displayNames}
          defaultValues={editingPayment}
          onSubmit={handleEditPayment}
          onCancel={() => setEditingPayment(null)}
          onDelete={handleDeletePayment}
          isPending={isPending}
          submitLabel="更新する"
        />
      )}

      {deletedPayment && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl bg-ink py-2 pr-2 pl-4.5 text-sm text-white shadow-[0_12px_28px_rgb(16_53_74/0.35)] lg:bottom-8">
          <span className="min-w-0 truncate">
            「{deletedPayment.memo || `${displayNames.get(deletedPayment.payerId)}の支払い`}」を削除しました
          </span>
          <button
            onClick={handleUndoDelete}
            className="inline-flex min-h-11 shrink-0 items-center rounded-lg px-3.5 font-bold text-primary-light transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-primary-light">
            元に戻す
          </button>
        </div>
      )}

      {isEditingProject && (
        <Modal title="プロジェクトを編集" onClose={() => setIsEditingProject(false)}>
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

// チェックで精算済みを切り替え、それ以外の部分をタップすると編集シートが開く
function PaymentRow({ payment, payerName, onEdit, onToggle }) {
  const { id: paymentId, memo, amount, isSettled } = payment;
  // 保存中の仮の行はまだIDが確定していないので操作できない
  const isPending = String(paymentId).startsWith("pending-");
  const title = memo || `${payerName}の支払い`;

  return (
    <li className="flex items-center gap-1 px-2 sm:gap-2 sm:px-3">
      <label className="flex size-11 flex-none cursor-pointer items-center justify-center">
        <input
          type="checkbox"
          checked={isSettled}
          disabled={isPending}
          onChange={() => onToggle(paymentId, !isSettled)}
          aria-label={isSettled ? `「${title}」の精算済みを解除` : `「${title}」を精算済みにする`}
          className="size-5.5 cursor-pointer accent-primary"
        />
      </label>

      <button
        type="button"
        onClick={() => onEdit(payment)}
        disabled={isPending}
        aria-label={`「${title}」を編集`}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-4 pr-2 pl-1 text-left transition-colors hover:bg-sky-ground/60 focus-visible:outline-2 focus-visible:outline-primary active:bg-sky-ground disabled:opacity-60">
        {/* 支払い内容が主、支払者が従。内容が空なら支払者を主にする */}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className={`break-words text-[17px] font-bold ${isSettled ? "text-ink-faint line-through" : ""}`}>
            {title}
          </span>
          <span className={`text-sm ${isSettled ? "text-ink-faint" : "text-ink-sub"}`}>
            {memo ? `${payerName}が支払い` : ""}
            {memo && isSettled ? "／" : ""}
            {isSettled ? "精算済み" : ""}
          </span>
        </span>

        <span className={`shrink-0 amount text-xl ${isSettled ? "text-ink-faint line-through" : ""}`}>
          {formatYen(amount)}
        </span>
        <span aria-hidden="true" className="shrink-0 text-lg text-ink-faint">›</span>
      </button>
    </li>
  );
}
