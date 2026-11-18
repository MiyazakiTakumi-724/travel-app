"use client";
import { useEffect, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  addPayment,
  deletePayment,
  deleteProject,
  editPayment,
  editProject,
  removeParticipant,
  restorePayment,
  toggleSettled,
} from "./actions";
import Modal, { ModalActions } from "@/components/Modal";
import ProjectFormFields from "@/components/ProjectFormFields";
import {
  CheckIcon,
  CloseIcon,
  LinkIcon,
  CalendarIcon,
  ListIcon,
  PlusIcon,
  ReceiptIcon,
  UsersIcon,
} from "@/components/icons";
import {
  fieldLabelClass,
  primaryButtonClass,
  secondaryButtonClass,
  textButtonClass,
  textFieldClass,
} from "@/components/ui";
import { formatSignedYen, formatTripPeriod, formatYen } from "@/lib/format";
import ScheduleSection from "./ScheduleSection";
import SettlementReceipt from "./SettlementReceipt";
import { splitAmount } from "@/lib/split";
import { buildDisplayNames, calculateSettlements } from "@/lib/settlement";
import { applyPaymentChange, initialMemoChoice, MEMO_OPTIONS, OTHER } from "@/lib/payments";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import { runServerAction } from "@/lib/runServerAction";
import { LIMITS } from "@/lib/limits";

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
              max={LIMITS.amount}
              step="1"
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
              maxLength={LIMITS.memo}
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
                  className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-line-dashed bg-paper px-4 text-[15px] font-bold text-ink transition-colors has-checked:border-primary has-checked:bg-primary has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink"
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

// スマホで下に並べるタブ（PCは「日程調整・支払い・精算」の3つに分け、メンバーは支払いの横に並べる）
const TABS = [
  { id: "schedule", label: "日程", Icon: CalendarIcon },
  { id: "payments", label: "支払い", Icon: ListIcon },
  { id: "settle", label: "精算", Icon: ReceiptIcon },
  { id: "members", label: "メンバー", Icon: UsersIcon },
];
const DESKTOP_TABS = [
  { id: "schedule", label: "日程調整", Icon: CalendarIcon },
  { id: "payments", label: "支払い", Icon: ListIcon },
  { id: "settle", label: "精算", Icon: ReceiptIcon },
];

export default function PaymentsClient({ project, currentParticipantId, isOwner }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 開いているタブ。URL（?tab=）にも残して、再読み込みしても同じタブに戻れるようにする。
  // 指定がなければ、日程を調整中なら日程調整、日程が決まっていれば支払いから始める
  const [tab, setTab] = useState(() => {
    const fromUrl = searchParams.get("tab");
    if (TABS.some((t) => t.id === fromUrl)) return fromUrl;
    const isScheduling = !project.startDate && !project.endDate && Boolean(project.days);
    return isScheduling ? "schedule" : "payments";
  });
  const selectTab = (id) => {
    setTab(id);
    window.history.replaceState(null, "", `?tab=${id}`);
    window.scrollTo({ top: 0 });
  };
  // 支払いとメンバーは、PCでは「支払い」の画面に並べ、スマホではそれぞれのタブに分ける
  const onPaymentsView = tab === "payments" || tab === "members";
  const panelClass = (id) => (tab === id ? "" : onPaymentsView ? "max-lg:hidden" : "hidden");

  // useState初期値設定
  const [isOpen, setisOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  // 保存中に読み直すと楽観的更新の表示が揺れるので、その間は止める
  useAutoRefresh({ paused: isPending });
  // 直前に削除した支払い。「元に戻す」を出している間だけ持つ
  const [deletedPayment, setDeletedPayment] = useState(null);

  useEffect(() => {
    if (!deletedPayment) return;
    const timer = setTimeout(() => setDeletedPayment(null), 6000);
    return () => clearTimeout(timer);
  }, [deletedPayment]);

  // 保存に失敗したときのメッセージ。楽観的更新の表示は自動で元に戻るので、何が起きたかを知らせる
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!saveError) return;
    const timer = setTimeout(() => setSaveError(""), 6000);
    return () => clearTimeout(timer);
  }, [saveError]);

  // Server Action を呼び、失敗したらメッセージを出す。成功したかどうかを返す
  const save = async (action) => {
    const result = await runServerAction(action);
    if (result.error) setSaveError(result.error);
    return !result.error;
  };

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
      await save(() => addPayment(project.id, formData));
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
      await save(() => editPayment(project.id, paymentId, formData));
    });
  };

  const handleToggleSettled = (paymentId, isSettled) => {
    startTransition(async () => {
      applyOptimistic({ type: "edit", id: paymentId, changes: { isSettled } });
      await save(() => toggleSettled(project.id, paymentId, isSettled));
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
      // 削除に失敗したら「元に戻す」は出さない（消えていないので）
      if (!(await save(() => deletePayment(project.id, payment.id)))) setDeletedPayment(null);
    });
  };

  const handleUndoDelete = () => {
    const payment = deletedPayment;
    if (!payment) return;
    setDeletedPayment(null);
    startTransition(async () => {
      applyOptimistic({ type: "restore", payment });
      await save(() => restorePayment(project.id, payment));
    });
  };

  // メンバーを外したときのエラー表示（支払い記録がある人は外せない）
  const [memberError, setMemberError] = useState("");

  const handleRemoveMember = (participant) => {
    const name = displayNames.get(participant.id);
    setMemberError("");
    if (payments.some((payment) => payment.payerId === participant.id)) {
      setMemberError(`${name}さんの支払い記録があるため外せません。先に支払いを編集するか削除してください。`);
      return;
    }
    if (!window.confirm(`${name}さんをメンバーから外しますか？\n外した人も、招待リンクからもう一度参加できます。`)) return;
    startTransition(async () => {
      const result = await runServerAction(() => removeParticipant(project.id, participant.id));
      if (result.error) setMemberError(result.error);
    });
  };

  const handleEditProject = (formData) => {
    startTransition(async () => {
      // 失敗したときは入力した内容が消えないよう、シートを開いたままにする
      if (await save(() => editProject(project.id, formData))) setIsEditingProject(false);
    });
  };

  const handleDeleteProject = () => {
    if (!window.confirm(`「${project.title}」を削除しますか？支払い記録もすべて削除されます。`)) return;
    startTransition(async () => {
      if (await save(() => deleteProject(project.id))) router.push("/projects");
    });
  };

  const displayNames = buildDisplayNames(project.participants);
  const { balances } = calculateSettlements(project.participants, payments);

  const myBalance = Math.round(balances.get(currentParticipantId) ?? 0);
  const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);

  const balanceLabel =
    myBalance > 0 ? "あなたが受け取る金額" : myBalance < 0 ? "あなたが支払う金額" : "あなたの精算";
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
            {/* スマホでは小さめにして、すぐ下の中身が最初の画面に入るようにする */}
            <h1 className="min-w-0 wrap-break-word heading text-[clamp(26px,5vw,42px)] leading-tight">
              {project.title}
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm font-medium text-ink-sub sm:text-base">
              <span>{project.destination || "目的地未定"}</span>
              <span>{formatTripPeriod(project)}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 max-lg:hidden">
            <button
              onClick={() => setisOpen(true)}
              className={`${primaryButtonClass} min-h-12 text-[15px]`}>
              <PlusIcon />
              支払いを記録
            </button>
          </div>
        </div>

        {/* PC用の切り替え（スマホは画面下のタブ） */}
        <div role="tablist" aria-label="表示の切り替え" className="grid w-fit grid-cols-3 rounded-xl bg-paper p-1 max-lg:hidden">
          {DESKTOP_TABS.map(({ id, label, Icon }) => {
            const selected = tab === id || (id === "payments" && tab === "members");
            return (
              <button
                key={id}
                role="tab"
                aria-selected={selected}
                onClick={() => selectTab(id)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-6 text-[15px] font-bold text-ink-sub transition-colors aria-selected:bg-primary aria-selected:text-white focus-visible:outline-2 focus-visible:outline-primary">
                <Icon />
                {label}
              </button>
            );
          })}
        </div>

        <section id="panel-schedule" role="tabpanel" aria-label="日程調整" className={tab === "schedule" ? "" : "hidden"}>
          <ScheduleSection
            project={project}
            currentParticipantId={currentParticipantId}
            isOwner={isOwner}
            displayNames={displayNames}
            save={save}
          />
        </section>

        <section id="panel-settle" role="tabpanel" aria-label="精算" className={tab === "settle" ? "" : "hidden"}>
          <SettlementReceipt
            participants={project.participants}
            payments={payments}
            displayNames={displayNames}
            currentParticipantId={currentParticipantId}
            onRecord={() => setisOpen(true)}
          />
        </section>

        <div className={`grid items-start gap-8 lg:grid-cols-[1fr_380px] lg:gap-10 ${onPaymentsView ? "" : "hidden"}`}>
          <section
            id="panel-payments"
            role="tabpanel"
            aria-labelledby="payments-heading"
            className={`flex min-w-0 flex-col gap-3.5 ${panelClass("payments")}`}>
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

          {/* メンバー。スマホは「メンバー」タブ、PCは「支払い」の右の列に出す */}
          <section
            id="panel-members"
            role="tabpanel"
            aria-labelledby="members-heading"
            className={`flex min-w-0 flex-col gap-3.5 ${panelClass("members")}`}>
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="members-heading" className="text-xl font-black">メンバー</h2>
              <span className="text-sm text-ink-sub">{project.participants.length}人</span>
            </div>
            <ul className="divide-y divide-sky-ground rounded-xl bg-paper">
              {project.participants.map((participant) => (
                <li key={participant.id} className="flex items-center gap-3 px-4 py-3.5">
                  <span
                    aria-hidden="true"
                    className={`grid size-9 shrink-0 place-items-center rounded-full font-bold ${
                      participant.id === currentParticipantId ? "bg-primary text-white" : "bg-sky-ground text-primary"
                    }`}>
                    {participant.name.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-bold">{displayNames.get(participant.id)}</span>
                  {participant.userId === project.ownerId && (
                    <span className="shrink-0 rounded-full bg-sky-ground px-2.5 py-0.5 text-xs font-bold text-ink-sub">作成者</span>
                  )}
                  {participant.id === currentParticipantId && (
                    <span className="shrink-0 rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-white">あなた</span>
                  )}
                  {/* 作成者だけが、自分以外のメンバーを外せる */}
                  {isOwner && participant.userId !== project.ownerId && (
                    <button
                      onClick={() => handleRemoveMember(participant)}
                      disabled={isPending}
                      aria-label={`${displayNames.get(participant.id)}さんをメンバーから外す`}
                      className={`${textButtonClass} -mr-2 shrink-0 hover:text-pay`}>
                      外す
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {memberError && (
              <p role="alert" className="rounded-lg bg-[#FCECE8] px-4 py-3 text-sm leading-relaxed font-bold text-pay">
                {memberError}
              </p>
            )}
            <div className="flex flex-col gap-2.5 rounded-xl border-2 border-dashed border-line-dashed px-4.5 py-4">
              <p className="text-sm leading-relaxed text-ink-sub">
                招待リンクを送ると、友達がログインしてメンバーになれます。
              </p>
              <button
                onClick={handleCopyInviteLink}
                className={`${secondaryButtonClass} min-h-12 text-[15px]`}>
                <LinkIcon />
                <span aria-live="polite">{copied ? "コピーしました！" : "招待リンクをコピー"}</span>
              </button>
            </div>
          </section>
        </div>
      </main>

      {/* スマホ用の下部。自分の収支と「記録」ボタンのバー、その下にタブ（PCでは出さない） */}
      <div className="sticky bottom-0 z-20 lg:hidden">
        <div className={`bg-ink text-white ${tab === "schedule" ? "hidden" : ""}`}>
          <div className="mx-auto flex w-full max-w-280 items-center justify-between gap-3 px-5 py-2.5 sm:px-6">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-xs font-bold text-line-soft">{balanceLabel}</span>
              <span className={`amount text-[24px] leading-none ${barBalanceClass}`}>
                {formatSignedYen(myBalance)}
              </span>
            </div>
            <button
              onClick={() => setisOpen(true)}
              className={`${primaryButtonClass} min-h-11 shrink-0 rounded-full px-5 text-[15px]`}>
              <PlusIcon />
              支払い記録
            </button>
          </div>
        </div>
        <nav
          role="tablist"
          aria-label="表示の切り替え"
          className="grid grid-cols-4 border-t border-line-soft bg-paper pb-[env(safe-area-inset-bottom)]">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              aria-controls={`panel-${id}`}
              onClick={() => selectTab(id)}
              className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-bold text-ink-faint transition-colors aria-selected:text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary">
              <Icon size={22} />
              {label}
            </button>
          ))}
        </nav>
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

      {/* 画面下のお知らせ（保存の失敗・削除の取り消し）。スマホでは下部バーとタブの上に出す */}
      {(saveError || deletedPayment) && (
        <div className="fixed inset-x-4 bottom-[calc(8.5rem+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-md flex-col gap-2 lg:bottom-8">
          {saveError && (
            <div
              role="alert"
              className="flex items-center justify-between gap-3 rounded-xl bg-pay py-2 pr-2 pl-4.5 text-sm font-bold text-white shadow-[0_12px_28px_rgb(16_53_74/0.35)]">
              <span className="min-w-0 py-1.5">{saveError}</span>
              <button
                onClick={() => setSaveError("")}
                aria-label="閉じる"
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white">
                <CloseIcon />
              </button>
            </div>
          )}
          {deletedPayment && (
            <div
              role="status"
              className="flex items-center justify-between gap-3 rounded-xl bg-ink py-2 pr-2 pl-4.5 text-sm text-white shadow-[0_12px_28px_rgb(16_53_74/0.35)]">
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
          <span className={`wrap-break-word text-[17px] font-bold ${isSettled ? "text-ink-faint line-through" : ""}`}>
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
