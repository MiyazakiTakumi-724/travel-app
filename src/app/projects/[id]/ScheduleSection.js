"use client";
import { useOptimistic, useState, useTransition } from "react";
import {
  addCandidate,
  decideSchedule,
  deleteCandidate,
  reopenSchedule,
  setScheduleRange,
  setUnavailable,
  voteCandidate,
} from "./scheduleActions";
import { CheckIcon } from "@/components/icons";
import { fieldLabelClass, primaryButtonClass, secondaryButtonClass, textButtonClass, textFieldClass } from "@/components/ui";
import { addDays, daysBetween, dayKind, eachDay, formatDateRange, formatDays, formatShortDate, holidayName, parseDate } from "@/lib/dates";
import {
  ANSWERS,
  availableCount,
  bestCandidateId,
  findBestWindows,
  MAX_RANGE_DAYS,
  tallyVotes,
  tripEndDate,
} from "@/lib/schedule";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
const KIND_TEXT = { holiday: "text-pay", saturday: "text-primary", weekday: "text-ink" };

// 端末の日付（日本時間など）で「今日」を "YYYY-MM-DD" にする
const today = () => new Date().toLocaleDateString("sv-SE");

// 候補への変更を、サーバーの応答を待たずに画面へ反映する
function applyCandidateChange(candidates, change) {
  switch (change.type) {
    case "vote":
      return candidates.map((c) =>
        c.id === change.candidateId
          ? {
              ...c,
              votes: [
                ...c.votes.filter((v) => v.participantId !== change.participantId),
                { participantId: change.participantId, answer: change.answer },
              ],
            }
          : c
      );
    case "add":
      if (candidates.some((c) => c.startDate === change.startDate)) return candidates;
      return [...candidates, { id: `pending-${change.startDate}`, startDate: change.startDate, votes: [] }].sort((a, b) =>
        a.startDate.localeCompare(b.startDate)
      );
    case "delete":
      return candidates.filter((c) => c.id !== change.candidateId);
    default:
      return candidates;
  }
}

function SectionTitle({ step, children, note }) {
  return (
    <div className="flex flex-col gap-0.5">
      <h3 className="flex items-center gap-2 text-lg font-black">
        {step && (
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary amount text-sm text-white">{step}</span>
        )}
        {children}
      </h3>
      {note && <p className="text-sm leading-relaxed text-ink-sub">{note}</p>}
    </div>
  );
}

export default function ScheduleSection({ project, currentParticipantId, isOwner, displayNames, save }) {
  const [, startTransition] = useTransition();
  const days = project.days;
  const isDecided = Boolean(project.startDate || project.endDate);
  const hasRange = Boolean(project.rangeStart && project.rangeEnd);
  const participantIds = project.participants.map((p) => p.id);

  // 自分の行けない日（楽観的更新）
  const myBaseDates = project.participants.find((p) => p.id === currentParticipantId)?.unavailableDays.map((d) => d.date) ?? [];
  const [myDates, applyMyDate] = useOptimistic(myBaseDates, (dates, { date, unavailable }) =>
    unavailable ? [...new Set([...dates, date])] : dates.filter((d) => d !== date)
  );
  const [candidates, applyCandidate] = useOptimistic(project.candidates, applyCandidateChange);

  // 計算用：メンバーごとの行けない日（自分の分は押した直後の状態を使う）
  const schedules = project.participants.map((p) => ({
    id: p.id,
    unavailableDays: p.id === currentParticipantId ? myDates : p.unavailableDays.map((d) => d.date),
  }));

  const toggleDate = (date) => {
    const unavailable = !myDates.includes(date);
    startTransition(async () => {
      applyMyDate({ date, unavailable });
      await save(() => setUnavailable(project.id, date, unavailable));
    });
  };

  const vote = (candidateId, answer) => {
    startTransition(async () => {
      applyCandidate({ type: "vote", candidateId, participantId: currentParticipantId, answer });
      await save(() => voteCandidate(project.id, candidateId, answer));
    });
  };

  const addToCandidates = (startDate) => {
    startTransition(async () => {
      applyCandidate({ type: "add", startDate });
      await save(() => addCandidate(project.id, startDate));
    });
  };

  const removeCandidate = (candidateId) => {
    startTransition(async () => {
      applyCandidate({ type: "delete", candidateId });
      await save(() => deleteCandidate(project.id, candidateId));
    });
  };

  const decide = (candidate) => {
    const range = formatDateRange(candidate.startDate, tripEndDate(candidate.startDate, days));
    if (!window.confirm(`${range} に決定しますか？\nメンバー全員に、決まった日程が表示されます。`)) return;
    startTransition(async () => {
      await save(() => decideSchedule(project.id, candidate.id));
    });
  };

  const reopen = () => {
    if (!window.confirm("日程を決め直しますか？\n候補と投票はそのまま残ります。")) return;
    startTransition(async () => {
      await save(() => reopenSchedule(project.id));
    });
  };

  // ---- 日程が決まっているとき ----
  if (isDecided) {
    return (
      <div className="flex flex-col gap-4">
        <div className="drop-shadow-[0_14px_20px_rgb(21_128_196/0.15)]">
          <div className="ticket-top px-6.5 pt-5.5 pb-4">
            <p className="text-sm font-bold text-ink-sub">日程が決まりました</p>
            <p className="mt-1 amount text-[34px] leading-tight text-primary sm:text-[40px]">
              {project.startDate && project.endDate
                ? formatDateRange(project.startDate, project.endDate)
                : project.startDate || project.endDate}
            </p>
          </div>
          <div className="ticket-bottom flex items-center justify-between gap-3 px-6.5 pt-4 pb-5 text-sm text-ink-sub">
            <span className="font-bold text-ink">
              {formatDays(project.startDate && project.endDate ? daysBetween(project.startDate, project.endDate) + 1 : null)}
            </span>
            {isOwner && (
              <button onClick={reopen} className={`${textButtonClass} -mr-2.5 hover:text-pay`}>
                日程を決め直す
              </button>
            )}
          </div>
        </div>
        <p className="text-sm text-ink-sub">支払いの記録と精算は「支払い・精算」から。</p>
      </div>
    );
  }

  // ---- 日数が決まっていない（古いプロジェクトなど） ----
  if (!days) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl bg-paper px-6 py-10 text-center">
        <h3 className="font-black">旅行の日数が決まっていません</h3>
        <p className="text-sm leading-relaxed text-ink-sub">
          {isOwner
            ? "右上の「編集」で、日程を「これから決める」にして旅行の日数を選ぶと、日程調整を始められます。"
            : "作成者が旅行の日数を決めると、日程調整を始められます。"}
        </p>
      </div>
    );
  }

  const windows = hasRange
    ? findBestWindows({ rangeStart: project.rangeStart, rangeEnd: project.rangeEnd, days, participants: schedules })
    : [];
  const best = bestCandidateId(candidates, participantIds);
  const candidateStarts = new Set(candidates.map((c) => c.startDate));

  return (
    <div className="flex flex-col gap-8">
      {/* 今の状態 */}
      <div className="flex flex-col gap-3 rounded-xl bg-paper px-5 py-4.5">
        <p className="text-sm font-bold text-ink-sub">
          日程調整中・<span className="text-ink">{formatDays(days)}</span>
        </p>
        <ol className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
          {["行けない日を付ける", "候補に投票", "作成者が決定"].map((label, index) => {
            const current = index === (candidates.length > 0 ? 1 : 0);
            return (
              <li
                key={label}
                className={`rounded-lg px-1.5 py-2 ${current ? "bg-primary text-white" : "bg-sky-ground text-ink-sub"}`}>
                {index + 1}. {label}
              </li>
            );
          })}
        </ol>
      </div>

      {/* 期間 */}
      <RangeSection project={project} isOwner={isOwner} hasRange={hasRange} save={save} />

      {hasRange && (
        <>
          <section className="flex flex-col gap-3.5" aria-labelledby="my-calendar">
            <SectionTitle step={1} note="行けない日をタップすると × が付きます。もう一度押すと外れます。">
              <span id="my-calendar">自分の行けない日</span>
            </SectionTitle>
            <MonthCalendars
              rangeStart={project.rangeStart}
              rangeEnd={project.rangeEnd}
              unavailable={myDates}
              onToggle={toggleDate}
            />
          </section>

          <section className="flex flex-col gap-3.5" aria-labelledby="everyone">
            <SectionTitle note="× は行けない日です。表は横にスクロールできます。">
              <span id="everyone">みんなの予定</span>
            </SectionTitle>
            <EveryoneTable
              dates={eachDay(project.rangeStart, project.rangeEnd)}
              participants={project.participants}
              schedules={schedules}
              displayNames={displayNames}
              currentParticipantId={currentParticipantId}
            />
          </section>

          <section className="flex flex-col gap-3.5" aria-labelledby="suggestions">
            <SectionTitle
              note={isOwner ? "行けない人が少ない順です。「候補に追加」で投票の候補にできます。" : "行けない人が少ない順です。作成者がここから候補を選びます。"}>
              <span id="suggestions">おすすめの日程</span>
            </SectionTitle>
            {windows.length === 0 ? (
              <p className="rounded-xl bg-paper px-4 py-3.5 text-sm text-ink-sub">期間が旅行の日数より短いため、日程を探せません。</p>
            ) : (
              <ul className="divide-y divide-sky-ground rounded-xl bg-paper">
                {windows.slice(0, 5).map((w) => (
                  <li key={w.startDate} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3">
                    <div className="flex min-w-0 flex-col">
                      <span className="font-bold">{formatDateRange(w.startDate, w.endDate)}</span>
                      <span className={`text-sm ${w.absentIds.length === 0 ? "font-bold text-primary" : "text-ink-sub"}`}>
                        {w.absentIds.length === 0
                          ? "全員行ける"
                          : `${w.absentIds.length}人行けない（${w.absentIds.map((id) => displayNames.get(id)).join("、")}）`}
                      </span>
                    </div>
                    {isOwner &&
                      (candidateStarts.has(w.startDate) ? (
                        <span className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-ink-faint">
                          <CheckIcon />
                          候補に追加済み
                        </span>
                      ) : (
                        <button onClick={() => addToCandidates(w.startDate)} className={`${secondaryButtonClass} min-h-11 px-4 text-sm`}>
                          候補に追加
                        </button>
                      ))}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {/* 候補の投票（期間を決める前に追加された候補も、ここで投票できる） */}
      {(hasRange || candidates.length > 0) && (
        <section className="flex flex-col gap-3.5" aria-labelledby="candidates">
          <SectionTitle step={2} note={isOwner ? "みんなの投票を見て、「この日程に決定」を押してください。" : "それぞれの候補に ○△× で答えてください。日程は作成者が決めます。"}>
            <span id="candidates">候補日の投票</span>
          </SectionTitle>
          {candidates.length === 0 ? (
            <p className="rounded-xl border-2 border-dashed border-line-dashed px-4 py-5 text-center text-sm text-ink-sub">
              {isOwner ? "「おすすめの日程」から候補を追加してください。" : "作成者が候補を選ぶと、ここで投票できます。"}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {candidates.map((candidate) => (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  days={days}
                  participantIds={participantIds}
                  displayNames={displayNames}
                  myAnswer={candidate.votes.find((v) => v.participantId === currentParticipantId)?.answer}
                  isBest={candidate.id === best}
                  isOwner={isOwner}
                  onVote={(answer) => vote(candidate.id, answer)}
                  onDecide={() => decide(candidate)}
                  onDelete={() => removeCandidate(candidate.id)}
                />
              ))}
            </ul>
          )}
          {isOwner && hasRange && <AddOtherCandidate project={project} onAdd={addToCandidates} />}
        </section>
      )}
    </div>
  );
}

// 作成者が、行けない日を聞く期間を決める（決まるまで、ほかのメンバーには待ってもらう）
function RangeSection({ project, isOwner, hasRange, save }) {
  const [editing, setEditing] = useState(!hasRange);
  const [rangeStart, setRangeStart] = useState(project.rangeStart ?? today());
  const [rangeEnd, setRangeEnd] = useState(project.rangeEnd ?? addDays(today(), 30));
  const [isPending, startTransition] = useTransition();

  if (!isOwner && !hasRange) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl bg-paper px-6 py-8 text-center">
        <h3 className="font-black">作成者が期間を決めるのを待っています</h3>
        <p className="text-sm leading-relaxed text-ink-sub">期間が決まると、行けない日を付けられるようになります。</p>
      </div>
    );
  }

  if (!isOwner || !editing) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-paper px-5 py-3.5">
        <p className="text-sm text-ink-sub">
          候補を探す期間：<b className="text-ink">{formatDateRange(project.rangeStart, project.rangeEnd)}</b>
        </p>
        {isOwner && (
          <button onClick={() => setEditing(true)} className={`${textButtonClass} -mr-2.5 hover:text-primary`}>
            変更
          </button>
        )}
      </div>
    );
  }

  const submit = (event) => {
    event.preventDefault();
    startTransition(async () => {
      if (await save(() => setScheduleRange(project.id, rangeStart, rangeEnd))) setEditing(false);
    });
  };

  const span = parseDate(rangeStart) && parseDate(rangeEnd) ? daysBetween(rangeStart, rangeEnd) + 1 : 0;

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl bg-paper px-5 py-4.5">
      <SectionTitle note={`この期間の中で、${formatDays(project.days)}の日程を探します（${MAX_RANGE_DAYS}日まで）。`}>
        候補を探す期間
      </SectionTitle>
      <div className="flex items-center gap-2">
        <input
          type="date"
          aria-label="期間の始まり"
          value={rangeStart}
          onChange={(e) => setRangeStart(e.target.value)}
          required
          className={`${textFieldClass} flex-1 px-2.5 text-sm`}
        />
        <span aria-hidden="true" className="shrink-0 text-ink-muted">〜</span>
        <input
          type="date"
          aria-label="期間の終わり"
          value={rangeEnd}
          min={rangeStart}
          onChange={(e) => setRangeEnd(e.target.value)}
          required
          className={`${textFieldClass} flex-1 px-2.5 text-sm`}
        />
      </div>
      {span > MAX_RANGE_DAYS && <p className="text-sm font-bold text-pay">期間は{MAX_RANGE_DAYS}日以内にしてください</p>}
      <div className="flex gap-3">
        {hasRange && (
          <button type="button" onClick={() => setEditing(false)} className={`${textButtonClass} hover:text-ink`}>
            キャンセル
          </button>
        )}
        <button type="submit" disabled={isPending || span < 1 || span > MAX_RANGE_DAYS} className={`${primaryButtonClass} min-h-12 flex-1`}>
          この期間で行けない日を聞く
        </button>
      </div>
    </form>
  );
}

// 期間を月ごとのカレンダーにして、自分の行けない日をタップで付け外しする
function MonthCalendars({ rangeStart, rangeEnd, unavailable, onToggle }) {
  const months = [];
  // 1日から32日進めると必ず翌月に入るので、その月の1日を次の月とする
  for (let first = `${rangeStart.slice(0, 7)}-01`; first <= rangeEnd; first = `${addDays(first, 32).slice(0, 7)}-01`) {
    months.push(first);
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {months.map((first) => {
        const start = parseDate(first);
        const lastDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
        const blanks = start.getUTCDay();
        const dates = Array.from({ length: lastDay }, (_, index) => addDays(first, index));
        return (
          <div key={first} className="rounded-xl bg-paper p-3.5">
            <p className="mb-2 px-1 font-bold">
              {start.getUTCFullYear()}年{start.getUTCMonth() + 1}月
            </p>
            <div className="grid grid-cols-7 gap-1 text-center">
              {WEEKDAY_LABELS.map((label, index) => (
                <span
                  key={label}
                  className={`pb-1 text-xs font-bold ${index === 0 ? "text-pay" : index === 6 ? "text-primary" : "text-ink-muted"}`}>
                  {label}
                </span>
              ))}
              {Array.from({ length: blanks }, (_, index) => (
                <span key={`blank-${index}`} />
              ))}
              {dates.map((date) => {
                const inRange = date >= rangeStart && date <= rangeEnd;
                const off = unavailable.includes(date);
                const holiday = holidayName(date);
                if (!inRange) {
                  return (
                    <span key={date} className="grid aspect-square place-items-center text-sm text-line-dashed">
                      {Number(date.slice(8))}
                    </span>
                  );
                }
                return (
                  <button
                    key={date}
                    type="button"
                    aria-pressed={off}
                    aria-label={`${formatShortDate(date)}${holiday ? ` ${holiday}` : ""}${off ? "（行けない）" : ""}`}
                    title={holiday ?? undefined}
                    onClick={() => onToggle(date)}
                    className={`relative grid aspect-square place-items-center rounded-lg text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
                      off ? "bg-pay text-white" : `bg-sky-ground/70 hover:bg-line-soft ${KIND_TEXT[dayKind(date)]}`
                    }`}>
                    {Number(date.slice(8))}
                    {off && (
                      <span aria-hidden="true" className="absolute top-0.5 right-1 text-[10px] leading-none">
                        ×
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// メンバー × 日付の表。× が行けない日、一番下は行ける人数
function EveryoneTable({ dates, participants, schedules, displayNames, currentParticipantId }) {
  const offByPerson = new Map(schedules.map((s) => [s.id, new Set(s.unavailableDays)]));
  const counts = dates.map((date) => availableCount(date, schedules));
  const maxCount = Math.max(...counts);

  return (
    <div className="overflow-x-auto rounded-xl bg-paper">
      <table className="border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 min-w-24 bg-paper px-3 py-2 text-left text-xs font-bold text-ink-muted">メンバー</th>
            {dates.map((date) => (
              <th key={date} className={`min-w-10 px-1 py-2 text-center text-xs font-bold ${KIND_TEXT[dayKind(date)]}`}>
                <span className="block amount text-sm">{Number(date.slice(5, 7))}/{Number(date.slice(8))}</span>
                {WEEKDAY_LABELS[parseDate(date).getUTCDay()]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {participants.map((participant) => (
            <tr key={participant.id}>
              <th
                scope="row"
                className={`sticky left-0 z-10 max-w-32 truncate border-t border-sky-ground bg-paper px-3 py-2 text-left font-bold ${
                  participant.id === currentParticipantId ? "text-primary" : ""
                }`}>
                {displayNames.get(participant.id)}
              </th>
              {dates.map((date) => {
                const off = offByPerson.get(participant.id)?.has(date);
                return (
                  <td
                    key={date}
                    className={`border-t border-sky-ground py-2 text-center font-bold ${off ? "bg-pay/10 text-pay" : "text-line-dashed"}`}>
                    {off ? "×" : "・"}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr>
            <th scope="row" className="sticky left-0 z-10 border-t-2 border-line-soft bg-paper px-3 py-2 text-left text-xs font-bold text-ink-sub">
              行ける人数
            </th>
            {counts.map((count, index) => (
              <td
                key={dates[index]}
                className={`border-t-2 border-line-soft py-2 text-center amount ${
                  count === maxCount && count > 0 ? "bg-primary/10 text-primary" : "text-ink-sub"
                }`}>
                {count}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function CandidateCard({ candidate, days, participantIds, displayNames, myAnswer, isBest, isOwner, onVote, onDecide, onDelete }) {
  const { byAnswer, notVoted } = tallyVotes(candidate, participantIds);
  const isPending = candidate.id.startsWith("pending-");
  const names = (ids) => ids.map((id) => displayNames.get(id)).join("、");

  return (
    <li className={`flex flex-col gap-3 rounded-xl bg-paper px-4.5 py-4 ${isBest ? "ring-2 ring-primary" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[17px] font-bold">{formatDateRange(candidate.startDate, tripEndDate(candidate.startDate, days))}</span>
        {isBest && <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-white">いちばん人気</span>}
      </div>

      {/* 自分の答え */}
      <div role="group" aria-label="あなたの答え" className="grid grid-cols-3 gap-2">
        {ANSWERS.map((answer) => {
          const selected = myAnswer === answer.id;
          return (
            <button
              key={answer.id}
              type="button"
              aria-pressed={selected}
              disabled={isPending}
              onClick={() => onVote(answer.id)}
              className={`flex min-h-12 items-center justify-center gap-1.5 rounded-lg border-[1.5px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60 ${
                selected
                  ? answer.id === "no"
                    ? "border-pay bg-pay text-white"
                    : "border-primary bg-primary text-white"
                  : "border-line-dashed bg-paper text-ink hover:bg-sky-ground"
              }`}>
              <span className="text-lg leading-none">{answer.label}</span>
              <span className="text-sm">{answer.text}</span>
            </button>
          );
        })}
      </div>

      {/* みんなの答え */}
      <dl className="grid gap-1 text-sm">
        {ANSWERS.map((answer) => (
          <div key={answer.id} className="flex gap-2">
            <dt className="w-14 shrink-0 font-bold text-ink-sub">
              {answer.label} {byAnswer[answer.id].length}人
            </dt>
            <dd className="min-w-0 text-ink-sub">{names(byAnswer[answer.id]) || "—"}</dd>
          </div>
        ))}
        {notVoted.length > 0 && (
          <div className="flex gap-2 text-ink-faint">
            <dt className="w-14 shrink-0 font-bold">未回答</dt>
            <dd className="min-w-0">{names(notVoted)}</dd>
          </div>
        )}
      </dl>

      {isOwner && (
        <div className="flex items-center justify-between gap-3 border-t-2 border-dashed border-line-soft pt-3">
          <button onClick={onDelete} disabled={isPending} className={`${textButtonClass} -ml-2.5 hover:text-pay`}>
            候補から外す
          </button>
          <button onClick={onDecide} disabled={isPending} className={`${primaryButtonClass} min-h-11 px-4.5 text-sm`}>
            この日程に決定
          </button>
        </div>
      )}
    </li>
  );
}

// おすすめ以外の日を、作成者が自分で候補にする
function AddOtherCandidate({ project, onAdd }) {
  const lastStart = addDays(project.rangeEnd, -(project.days - 1));
  const [startDate, setStartDate] = useState(project.rangeStart);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (startDate) onAdd(startDate);
      }}
      className="flex flex-col gap-2 rounded-xl border-2 border-dashed border-line-dashed px-4 py-3.5">
      <label className="flex flex-col gap-1.5">
        <span className={fieldLabelClass}>ほかの日を候補にする（出発日）</span>
        <input
          type="date"
          value={startDate}
          min={project.rangeStart}
          max={lastStart >= project.rangeStart ? lastStart : undefined}
          onChange={(e) => setStartDate(e.target.value)}
          className={`${textFieldClass} text-sm`}
        />
      </label>
      {startDate && parseDate(startDate) && (
        <p className="text-sm text-ink-sub">{formatDateRange(startDate, tripEndDate(startDate, project.days))}</p>
      )}
      <button type="submit" className={`${secondaryButtonClass} min-h-11 text-sm`}>
        候補に追加
      </button>
    </form>
  );
}
