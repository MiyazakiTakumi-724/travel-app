"use client";
import { useEffect, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { addPayment, deletePayment, deleteProject, editPayment, editProject, restorePayment } from "./actions";
import Modal, { ModalActions } from "@/components/Modal";
import { useConfirm } from "@/components/ConfirmDialog";
import ProjectFormFields from "@/components/ProjectFormFields";
import { CloseIcon, CalendarIcon, ListIcon, PlusIcon, ReceiptIcon, UsersIcon } from "@/components/icons";
import { primaryButtonClass, textButtonClass } from "@/components/ui";
import { formatTripPeriod, formatYen } from "@/lib/format";
import ScheduleSection from "./ScheduleSection";
import SettlementReceipt from "./SettlementReceipt";
import MembersPanel from "./MembersPanel";
import PaymentFormModal from "./PaymentFormModal";
import PaymentRow from "./PaymentRow";
import { buildDisplayNames, calculateSettlements } from "@/lib/settlement";
import { applyPaymentChange, filterPayments } from "@/lib/payments";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import { runServerAction } from "@/lib/runServerAction";
import { myScheduleTodo } from "@/lib/schedule";

// 日程タブに付ける赤い点（自分がやることがあるとき）
function TodoDot() {
  return (
    <>
      <span aria-hidden="true" className="absolute top-1.5 right-[calc(50%-18px)] size-2.5 rounded-full border-2 border-paper bg-pay" />
      <span className="sr-only">（やることがあります）</span>
    </>
  );
}

// スマホで下に並べるタブ（PCは「日程・支払い・精算」の3つに分け、メンバーは支払いの横に並べる）
const TABS = [
  { id: "schedule", label: "日程", Icon: CalendarIcon },
  { id: "payments", label: "支払い", Icon: ListIcon },
  { id: "settle", label: "精算", Icon: ReceiptIcon },
  { id: "members", label: "メンバー", Icon: UsersIcon },
];
const DESKTOP_TABS = [
  { id: "schedule", label: "日程", Icon: CalendarIcon },
  { id: "payments", label: "支払い", Icon: ListIcon },
  { id: "settle", label: "精算", Icon: ReceiptIcon },
];

export default function PaymentsClient({ project, currentParticipantId, isOwner, isGuest = false }) {
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

  // 支払いを記録するシートを開いているか
  const [isOpen, setIsOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [confirmDialog, confirm] = useConfirm();
  // 保存中に読み直すと楽観的更新の表示が揺れるので、その間は止める
  useAutoRefresh({ paused: isPending });
  // 直前に削除した支払い。「元に戻す」を出している間だけ持つ
  const [deletedPayment, setDeletedPayment] = useState(null);

  useEffect(() => {
    if (!deletedPayment) return;
    const timer = setTimeout(() => setDeletedPayment(null), 6000);
    return () => clearTimeout(timer);
  }, [deletedPayment]);

  // Google への引き継ぎから戻ってきたときの結果（?claim=）。読み込み直したときにまた出ないよう、URL からは消す
  const [claimResult] = useState(() => searchParams.get("claim"));
  useEffect(() => {
    if (!claimResult) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("claim");
    window.history.replaceState(null, "", url);
  }, [claimResult]);

  // 保存に失敗したときのメッセージ。楽観的更新の表示は自動で元に戻るので、何が起きたかを知らせる
  const [saveError, setSaveError] = useState(
    claimResult === "conflict" ? "このGoogleアカウントは、すでにこのプロジェクトのメンバーです。ゲストの分は引き継げませんでした" : ""
  );

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

  // サーバーの返事を待たずに支払い一覧へ先に反映する。処理が終わると最新のデータに置き換わる
  const [payments, applyOptimistic] = useOptimistic(project.payments, applyPaymentChange);

  const handleAddPayment = (formData) => {
    setIsOpen(false);
    startTransition(async () => {
      applyOptimistic({
        type: "add",
        payments: [
          {
            id: `pending-${Date.now()}`,
            payerId: formData.get("payerId")?.toString(),
            memo: formData.get("memo")?.toString().trim(),
            amount: Number(formData.get("amount")),
          },
        ],
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

  const handleEditProject = (formData) => {
    startTransition(async () => {
      // 失敗したときは入力した内容が消えないよう、シートを開いたままにする
      if (await save(() => editProject(project.id, formData))) setIsEditingProject(false);
    });
  };

  const handleDeleteProject = async () => {
    const ok = await confirm({
      title: `「${project.title}」を削除しますか？`,
      message: "支払い記録・日程・旅行の予定もすべて削除され、元に戻せません。",
      confirmLabel: "削除する",
      danger: true,
    });
    if (!ok) return;
    startTransition(async () => {
      if (await save(() => deleteProject(project.id))) router.push(isGuest ? "/" : "/projects");
    });
  };

  const displayNames = buildDisplayNames(project.participants);
  // 日程調整で自分がやること（行ける日の提出・仮決定・○×の回答）があれば、日程タブに印を付ける
  const scheduleTodo = myScheduleTodo(project, project.participants, currentParticipantId, isOwner);
  const { balances } = calculateSettlements(project.participants, payments);

  const myBalance = balances.get(currentParticipantId) ?? 0;
  // 支払い記録の絞り込み（支払った人で見る。複数人を選べ、だれも選ばなければ全員分）
  const [payerFilter, setPayerFilter] = useState([]);
  const togglePayerFilter = (id) =>
    setPayerFilter((current) => (current.includes(id) ? current.filter((p) => p !== id) : [...current, id]));
  const visiblePayments = filterPayments(payments, { payerIds: payerFilter });
  const isFiltered = payerFilter.length > 0;
  const totalAmount = visiblePayments.reduce((sum, payment) => sum + payment.amount, 0);

  const balanceLabel =
    myBalance > 0 ? "あなたが受け取る金額" : myBalance < 0 ? "あなたが支払う金額" : "あなたの精算";
  const barBalanceClass =
    myBalance > 0 ? "text-primary-light" : myBalance < 0 ? "text-pay-light" : "text-line-soft";

  return (
    <div className="flex min-h-screen flex-col">
      {/* スマホアプリと同じく、戻るは左上・プロジェクトの操作は右上に置く */}
      <header className="mx-auto flex w-full max-w-280 items-center justify-between gap-2 px-2.5 pt-2 sm:px-6 sm:pt-4">
        {/* ゲストはマイプロジェクトを使えないので、トップに戻す */}
        <Link
          href={isGuest ? "/" : "/projects"}
          className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2.5 text-[15px] font-bold text-primary transition-colors hover:bg-paper focus-visible:outline-2 focus-visible:outline-primary">
          <span aria-hidden="true" className="text-xl leading-none">‹</span>
          {isGuest ? "トップ" : "一覧"}
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
              onClick={() => setIsOpen(true)}
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
                className="relative inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-6 text-[15px] font-bold text-ink-sub transition-colors aria-selected:bg-primary aria-selected:text-white focus-visible:outline-2 focus-visible:outline-primary">
                <Icon />
                {label}
                {id === "schedule" && scheduleTodo && (
                  <>
                    <span aria-hidden="true" className="size-2 rounded-full bg-pay" />
                    <span className="sr-only">（やることがあります）</span>
                  </>
                )}
              </button>
            );
          })}
        </div>

        <section id="panel-schedule" role="tabpanel" aria-label="日程" className={tab === "schedule" ? "" : "hidden"}>
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
            onRecord={() => setIsOpen(true)}
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
              <span className="text-sm text-ink-sub">
                {isFiltered && `${visiblePayments.length}件・`}合計 {formatYen(totalAmount)}
              </span>
            </div>

            {payments.length > 0 && (
              <div className="flex flex-col gap-2.5">
                {/* 支払った人で絞り込む。複数人を選べる。「全員」で選択をすべて外す */}
                <div role="group" aria-label="支払った人で絞り込む" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-0.5 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
                  {[{ id: null, name: "全員" }, ...project.participants.map((p) => ({ id: p.id, name: displayNames.get(p.id) }))].map(
                    (option) => (
                      <button
                        key={option.id ?? "all"}
                        type="button"
                        aria-pressed={option.id === null ? payerFilter.length === 0 : payerFilter.includes(option.id)}
                        onClick={() => (option.id === null ? setPayerFilter([]) : togglePayerFilter(option.id))}
                        className="inline-flex min-h-9 shrink-0 items-center rounded-full border-[1.5px] border-line-dashed bg-paper px-3.5 text-sm font-bold whitespace-nowrap text-ink-sub transition-colors aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-white focus-visible:outline-2 focus-visible:outline-primary">
                        {option.name}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

            {payments.length === 0 ? (
              <button
                onClick={() => setIsOpen(true)}
                className="flex min-h-45 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-dashed font-bold text-primary transition-colors hover:bg-paper focus-visible:outline-2 focus-visible:outline-primary">
                <PlusIcon size={24} />
                最初の支払いを記録
              </button>
            ) : visiblePayments.length === 0 ? (
              <div className="flex flex-col items-center gap-1 rounded-xl bg-paper px-6 py-8 text-center">
                <p className="font-bold">条件に合う支払いはありません</p>
                <button
                  onClick={() => setPayerFilter([])}
                  className={`${textButtonClass} hover:text-primary`}>
                  絞り込みをやめる
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-sky-ground rounded-xl bg-paper">
                {visiblePayments.map((payment) => (
                  <PaymentRow
                    key={payment.id}
                    payment={payment}
                    payerName={displayNames.get(payment.payerId) ?? "不明"}
                    onEdit={setEditingPayment}
                  />
                ))}
              </ul>
            )}
          </section>

          {/* メンバー。スマホは「メンバー」タブ、PCは「支払い」の右の列に出す */}
          <MembersPanel
            className={`flex min-w-0 flex-col gap-3.5 ${panelClass("members")}`}
            project={project}
            displayNames={displayNames}
            payments={payments}
            currentParticipantId={currentParticipantId}
            isOwner={isOwner}
            isGuest={isGuest}
            claimResult={claimResult}
          />
        </div>
      </main>

      {/* スマホ用の下部。自分の収支と「記録」ボタンのバー、その下にタブ（PCでは出さない） */}
      <div className="sticky bottom-0 z-20 lg:hidden">
        <div className={`bg-ink text-white ${tab === "schedule" ? "hidden" : ""}`}>
          <div className="mx-auto flex w-full max-w-280 items-center justify-between gap-3 px-5 py-2.5 sm:px-6">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-xs font-bold text-line-soft">{balanceLabel}</span>
              {/* 「支払う金額」「受け取る金額」と書いてあるので、金額に＋−は付けない */}
              <span className={`amount text-[24px] leading-none ${barBalanceClass}`}>{formatYen(Math.abs(myBalance))}</span>
            </div>
            <button
              onClick={() => setIsOpen(true)}
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
              className="relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-bold text-ink-faint transition-colors aria-selected:text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary">
              <Icon size={22} />
              {label}
              {id === "schedule" && scheduleTodo && <TodoDot />}
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
          onCancel={() => setIsOpen(false)}
          isPending={isPending}
          submitLabel="記録する"
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

      {confirmDialog}

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
