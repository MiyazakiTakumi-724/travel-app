"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import { useConfirm } from "@/components/ConfirmDialog";
import { LinkIcon } from "@/components/icons";
import { secondaryButtonClass, textButtonClass } from "@/components/ui";
import { GuestCodeDetails } from "@/components/GuestCodePanel";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { logoutGuest, reissueGuestCode, startGuestClaim } from "@/app/guestActions";
import { leaveProject, makeOrganizer, removeParticipant, resetInviteLink, stepDownOrganizer } from "./actions";
import { runServerAction } from "@/lib/runServerAction";
import { shareOrCopy } from "@/lib/share";
import { useCanShare, useOrigin } from "@/lib/useBrowser";

const BADGE_CLASS = {
  organizer: "bg-sky-ground text-ink-sub",
  guest: "border border-line-dashed text-ink-muted",
  retired: "bg-line-soft/60 text-ink-muted",
  me: "bg-primary text-white",
};

function Badge({ kind, children }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${BADGE_CLASS[kind]}`}>{children}</span>;
}

// シートの中の操作ボタン
function SheetButton({ danger, children, ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={`flex min-h-13 w-full items-center justify-center rounded-lg border-[1.5px] px-4 font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60 ${
        danger
          ? "border-pay/40 text-pay hover:bg-[#FCECE8] focus-visible:outline-pay"
          : "border-primary text-primary hover:bg-sky-ground focus-visible:outline-primary"
      }`}>
      {children}
    </button>
  );
}

// メンバーの画面。スマホは「メンバー」タブ、PCは「支払い」の右の列に出す。
// 幹事は、メンバーをタップすると「幹事にする」「コードを発行し直す」「メンバーから外す」を選べる
export default function MembersPanel({ project, displayNames, payments, currentParticipantId, isOwner, isGuest, claimResult, className = "" }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmDialog, confirm] = useConfirm();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  // 下の方のボタン（抜ける など）を押したときも見えるよう、お知らせが出たらそこまで画面を動かす
  const messageRef = useRef(null);
  useEffect(() => {
    if (error || notice) messageRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [error, notice]);
  // 操作を選んでいるメンバー（シートを開いている）
  const [selected, setSelected] = useState(null);
  // 発行し直した復帰用コード（モーダルで見せる）
  const [reissued, setReissued] = useState(null);
  const [copied, setCopied] = useState(false);
  // 共有メニューが使える端末（スマホなど）か。サーバーで描画するときは false にして、食い違いを防ぐ
  const shareable = useCanShare();
  // 招待リンクは、コピーできない環境でも使えるよう、画面にも文字で出す
  const origin = useOrigin();
  const inviteUrl = origin ? `${origin}/invite/${project.inviteToken}` : "";

  const participants = project.participants;
  const me = participants.find((p) => p.id === currentParticipantId);
  const organizerCount = participants.filter((p) => p.isOwner && !p.retired).length;
  const hasPayments = (participantId) => payments.some((payment) => payment.payerId === participantId);
  const nameOf = (participant) => displayNames.get(participant.id);

  // サーバー処理を呼ぶ。失敗したらメッセージを出し、成功したら onDone を呼ぶ
  const run = (action, onDone) => {
    setError("");
    setNotice("");
    startTransition(async () => {
      const result = await runServerAction(action);
      if (result.error) setError(result.error);
      else onDone?.(result);
    });
  };

  // そのメンバーに対して、幹事ができる操作
  const actionsFor = (participant) => {
    if (!isOwner || participant.id === currentParticipantId || participant.retired) return [];
    return [
      !participant.isOwner && "organizer",
      participant.isGuest && "reissue",
      !participant.isOwner && "remove",
    ].filter(Boolean);
  };

  const handleMakeOrganizer = async (participant) => {
    const name = nameOf(participant);
    setSelected(null);
    const ok = await confirm({
      title: `${name}さんを幹事にしますか？`,
      message: "幹事は、編集・削除・日程の仮決定・メンバーを外す・コードの再発行ができます。",
      confirmLabel: "幹事にする",
    });
    if (!ok) return;
    run(() => makeOrganizer(project.id, participant.id), () => setNotice(`${name}さんを幹事にしました`));
  };

  const handleReissue = async (participant) => {
    const isSelf = participant.id === currentParticipantId;
    const name = nameOf(participant);
    setSelected(null);
    const ok = await confirm(
      isSelf
        ? { title: "コードを発行し直しますか？", message: "前のコードと専用リンクは使えなくなります。", confirmLabel: "発行し直す" }
        : {
            title: `${name}さんのコードを発行し直しますか？`,
            message: `前のコードは使えなくなるので、新しいコードを${name}さんに伝えてください。`,
            confirmLabel: "発行し直す",
          }
    );
    if (!ok) return;
    run(() => reissueGuestCode(project.id, participant.id), (result) => setReissued({ ...result, isSelf }));
  };

  const handleRemove = async (participant) => {
    const name = nameOf(participant);
    setSelected(null);
    if (hasPayments(participant.id)) {
      setError(`${name}さんの支払い記録があるため外せません。先に支払いを編集するか削除してください。`);
      return;
    }
    const ok = await confirm({
      title: `${name}さんをメンバーから外しますか？`,
      message: "外した人も、招待リンクからもう一度参加できます。",
      confirmLabel: "外す",
      danger: true,
    });
    if (!ok) return;
    run(() => removeParticipant(project.id, participant.id));
  };

  const handleStepDown = async () => {
    const ok = await confirm({
      title: "幹事をやめますか？",
      message: "もう一度幹事になるには、ほかの幹事に頼む必要があります。",
      confirmLabel: "やめる",
    });
    if (!ok) return;
    run(() => stepDownOrganizer(project.id), () => setNotice("幹事をやめました"));
  };

  const handleLeave = async () => {
    if (hasPayments(currentParticipantId)) {
      setError("あなたの支払い記録があるため抜けられません。先に支払いを編集するか削除してください。");
      return;
    }
    const ok = await confirm({
      title: `「${project.title}」から抜けますか？`,
      message: "あなたの行ける日や回答も消えます。もう一度参加するには、招待リンクが必要です。",
      confirmLabel: "抜ける",
      danger: true,
    });
    if (!ok) return;
    run(() => leaveProject(project.id), () => router.push(isGuest ? "/" : "/projects"));
  };

  const handleGuestLogout = async () => {
    const ok = await confirm({
      title: "このブラウザからログアウトしますか？",
      message: "もう一度開くには、復帰用コードか専用リンクが必要です。",
      confirmLabel: "ログアウト",
    });
    if (!ok) return;
    startTransition(async () => {
      await logoutGuest(project.id);
    });
  };

  const handleCopyInviteLink = async () => {
    const result = await shareOrCopy({
      title: `${project.title}の招待`,
      text: `旅行清算アプリの「${project.title}」に参加してください`,
      url: inviteUrl,
    });
    if (result === "copied") {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else if (result === "failed") {
      setError("リンクをコピーできませんでした");
    }
  };

  const handleResetInvite = async () => {
    const ok = await confirm({
      title: "招待リンクを作り直しますか？",
      message: "今の招待リンクは使えなくなります（参加済みのメンバーはそのままです）。",
      confirmLabel: "作り直す",
    });
    if (!ok) return;
    run(() => resetInviteLink(project.id), () => setNotice("新しい招待リンクにしました。参加してほしい人には、新しいリンクを送ってください"));
  };

  const selectedActions = selected ? actionsFor(selected) : [];

  return (
    <section id="panel-members" role="tabpanel" aria-labelledby="members-heading" className={className}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="members-heading" className="text-xl font-black">メンバー</h2>
        <span className="text-sm text-ink-sub">{participants.length}人</span>
      </div>

      <ul className="divide-y divide-sky-ground rounded-xl bg-paper">
        {participants.map((participant) => {
          const isMe = participant.id === currentParticipantId;
          const actions = actionsFor(participant);
          const content = (
            <>
              <span
                aria-hidden="true"
                className={`grid size-9 shrink-0 place-items-center rounded-full font-bold ${
                  isMe ? "bg-primary text-white" : participant.retired ? "bg-line-soft/60 text-ink-faint" : "bg-sky-ground text-primary"
                }`}>
                {participant.name.slice(0, 1)}
              </span>
              {/* 名前と印。幅が足りないときは印を名前の下に回し、名前が「あ…」のように切れないようにする */}
              <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                <span className={`min-w-0 font-bold wrap-break-word ${participant.retired ? "text-ink-muted" : ""}`}>{nameOf(participant)}</span>
                <span className="flex shrink-0 gap-1.5">
                  {participant.isOwner && <Badge kind="organizer">幹事</Badge>}
                  {participant.isGuest && <Badge kind="guest">ゲスト</Badge>}
                  {participant.retired && <Badge kind="retired">退会済み</Badge>}
                  {isMe && <Badge kind="me">あなた</Badge>}
                </span>
              </span>
            </>
          );
          return (
            <li key={participant.id}>
              {actions.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setSelected(participant)}
                  disabled={isPending}
                  aria-label={`${nameOf(participant)}さんの操作`}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-colors hover:bg-sky-ground/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary disabled:opacity-60">
                  {content}
                  <span aria-hidden="true" className="shrink-0 text-lg text-ink-faint">›</span>
                </button>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3.5">{content}</div>
              )}
            </li>
          );
        })}
      </ul>

      {(error || notice) && (
        <div ref={messageRef} className="flex scroll-my-24 flex-col gap-2">
          {error && (
            <p role="alert" className="rounded-lg bg-[#FCECE8] px-4 py-3 text-sm leading-relaxed font-bold text-pay">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="rounded-lg bg-line-soft/70 px-4 py-3 text-sm leading-relaxed font-bold text-primary">
              {notice}
            </p>
          )}
        </div>
      )}
      {claimResult === "done" && !isGuest && (
        <p role="status" className="rounded-lg bg-line-soft/70 px-4 py-3 text-sm font-bold text-primary">
          Googleアカウントに引き継ぎました。マイプロジェクトからも開けます。
        </p>
      )}

      {isGuest && (
        <div className="flex flex-col gap-3 rounded-xl bg-paper px-4.5 py-4">
          <p className="font-bold">ゲストとして参加しています</p>
          <p className="text-sm leading-relaxed text-ink-sub">
            別のスマホやブラウザで開くときは、復帰用コードが必要です。コードをなくしたときは、ここで発行し直せます。
          </p>
          {me?.isOwner && organizerCount === 1 && participants.length > 1 && (
            <p className="rounded-lg bg-sky-ground px-3.5 py-2.5 text-sm leading-relaxed text-ink-sub">
              幹事があなただけなので、コードをなくすと発行し直せる人がいなくなります。ほかのメンバーも幹事にしておくと安心です。
            </p>
          )}
          {/* PCではメンバーの欄が細いので、ボタンは横に並べず縦に積む */}
          <div className="grid gap-2">
            <Link href={`/projects/${project.id}/welcome`} className={`${secondaryButtonClass} min-h-12 text-[15px]`}>
              復帰用コードを見る
            </Link>
            <button
              type="button"
              onClick={() => handleReissue({ id: currentParticipantId })}
              disabled={isPending}
              className={`${secondaryButtonClass} min-h-12 text-[15px]`}>
              コードを発行し直す
            </button>
          </div>
          <div className="border-t-2 border-dashed border-line-soft pt-3">
            <p className="text-sm leading-relaxed text-ink-sub">
              Googleでログインすると、ここまでの記録をそのまま引き継げます。マイプロジェクトからも開けるようになります。
            </p>
            <div className="mt-2.5">
              <GoogleSignInButton action={startGuestClaim.bind(null, project.id)} label="Googleでログインして引き継ぐ" />
            </div>
          </div>
          <button type="button" onClick={handleGuestLogout} disabled={isPending} className={`${textButtonClass} self-center hover:text-ink`}>
            このブラウザからログアウト
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2.5 rounded-xl border-2 border-dashed border-line-dashed px-4.5 py-4">
        <p className="phrase text-sm leading-relaxed text-ink-sub">
          招待リンクを送ると、友達がGoogleでログインするか、ゲストとしてメンバーになれます。
        </p>
        {/* 招待リンクの URL とボタンを1行に。コピーできない環境でも、URL を長押しや選択で写せる */}
        <div className="flex items-center gap-2 rounded-lg border-[1.5px] border-line-dashed bg-paper py-1.5 pr-1.5 pl-3">
          <a
            href={inviteUrl || undefined}
            aria-label="招待リンク"
            className="min-w-0 flex-1 truncate text-sm text-primary underline select-all">
            {inviteUrl || "招待リンク"}
          </a>
          <button
            onClick={handleCopyInviteLink}
            className={`${secondaryButtonClass} min-h-10 shrink-0 gap-1.5 px-3 text-sm whitespace-nowrap`}>
            <LinkIcon className="shrink-0" />
            <span aria-live="polite">{copied ? "コピーしました" : shareable ? "送る" : "コピー"}</span>
          </button>
        </div>
        {isOwner && (
          <button type="button" onClick={handleResetInvite} disabled={isPending} className={`${textButtonClass} self-center hover:text-ink`}>
            招待リンクを作り直す
          </button>
        )}
      </div>

      {/* 自分のこと（幹事をやめる・プロジェクトを抜ける）。押し間違えないよう、区切って下の方に小さく置く */}
      <div className="mt-6 flex flex-wrap justify-center gap-x-2 border-t border-line-soft pt-3">
        {me?.isOwner && organizerCount > 1 && (
          <button type="button" onClick={handleStepDown} disabled={isPending} className={`${textButtonClass} text-xs hover:text-ink`}>
            幹事をやめる
          </button>
        )}
        <button type="button" onClick={handleLeave} disabled={isPending} className={`${textButtonClass} text-xs hover:text-pay`}>
          このプロジェクトを抜ける
        </button>
      </div>

      {selected && (
        <Modal title={`${nameOf(selected)}さん`} onClose={() => setSelected(null)}>
          <div className="flex flex-col gap-2.5">
            {selectedActions.includes("organizer") && (
              <SheetButton onClick={() => handleMakeOrganizer(selected)} disabled={isPending}>
                幹事にする
              </SheetButton>
            )}
            {selectedActions.includes("reissue") && (
              <SheetButton onClick={() => handleReissue(selected)} disabled={isPending}>
                復帰用コードを発行し直す
              </SheetButton>
            )}
            {selectedActions.includes("remove") && (
              <SheetButton danger onClick={() => handleRemove(selected)} disabled={isPending}>
                メンバーから外す
              </SheetButton>
            )}
          </div>
        </Modal>
      )}

      {confirmDialog}

      {reissued && (
        <Modal
          title={reissued.isSelf ? "新しい復帰用コード" : `${reissued.name}さんの新しいコード`}
          description={
            reissued.isSelf
              ? "前のコードと専用リンクは使えなくなりました。このブラウザでは、そのまま使い続けられます。"
              : `前のコードは使えなくなりました。このコードを${reissued.name}さんに伝えてください。`
          }
          onClose={() => setReissued(null)}>
          <GuestCodeDetails code={reissued.code} projectTitle={project.title} />
        </Modal>
      )}
    </section>
  );
}
