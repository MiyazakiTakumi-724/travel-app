"use client";
import { useEffect, useOptimistic, useState, useTransition } from "react";
import {
  answerTentative,
  cancelTentative,
  proposeSchedule,
  reopenSchedule,
  replaceAvailability,
  setAvailable,
  submitAvailability,
  unsubmitAvailability,
} from "./scheduleActions";
import { CheckIcon } from "@/components/icons";
import ItinerarySection from "./ItinerarySection";
import { fieldLabelClass, primaryButtonClass, textButtonClass, textFieldClass } from "@/components/ui";
import { addDays, daysBetween, dayKind, eachDay, formatDateRange, formatDays, formatShortDate, holidayName, parseDate } from "@/lib/dates";
import { availableCount, fitsInRange, schedulePhase, tallyAnswers, tripEndDate } from "@/lib/schedule";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
const KIND_TEXT = { holiday: "text-pay", saturday: "text-primary", weekday: "text-ink" };
// 狭い画面で2行になるときは、区切ったところ（「行ける日を／提出」）で改行する
const STEPS = [
  { phase: "collecting", label: ["行ける日を", "提出"] },
  { phase: "choosing", label: ["作成者が", "仮決定"] },
  { phase: "voting", label: ["全員が○で", "確定"] },
];

function SectionTitle({ children, note, id }) {
  return (
    <div className="flex flex-col gap-0.5">
      <h3 id={id} className="text-lg font-black">
        {children}
      </h3>
      {note && <p className="text-sm leading-relaxed text-ink-sub">{note}</p>}
    </div>
  );
}

// 「田中 太郎、はなこ」のように名前を並べる
const namesOf = (ids, displayNames) => ids.map((id) => displayNames.get(id)).join("、");

export default function ScheduleSection({ project, currentParticipantId, isOwner, displayNames, save }) {
  const [, startTransition] = useTransition();
  const days = project.days;
  const participants = project.participants;
  const me = participants.find((p) => p.id === currentParticipantId);

  // 自分の行ける日・提出・○× の答えは、押した直後に画面へ反映する
  const [myDates, applyMyDate] = useOptimistic(me?.availableDays.map((d) => d.date) ?? [], (dates, change) => {
    if (change.replace) return change.replace;
    return change.available ? [...new Set([...dates, change.date])] : dates.filter((d) => d !== change.date);
  });
  const [mySubmitted, setMySubmitted] = useOptimistic(Boolean(me?.availabilitySubmitted));
  const [myAnswer, setMyAnswer] = useOptimistic(me?.tentativeAnswer ?? null);

  const people = participants.map((p) =>
    p.id === currentParticipantId
      ? { ...p, availableDays: myDates, availabilitySubmitted: mySubmitted, tentativeAnswer: myAnswer }
      : { ...p, availableDays: p.availableDays.map((d) => d.date) }
  );
  const phase = schedulePhase(project, people);

  // 全員の提出が終わった状態で作成者がページを開いたら、「日程を仮決定する」の欄から見せる
  // （開いたときだけ。途中で全員の提出がそろっても、画面は勝手に動かさない）
  const [scrollToChoose] = useState(() => phase === "choosing" && isOwner);
  useEffect(() => {
    const target = document.getElementById("choose");
    if (scrollToChoose && target?.offsetParent) target.scrollIntoView({ block: "start" });
  }, [scrollToChoose]);

  const run = (optimistic, action) => {
    startTransition(async () => {
      optimistic?.();
      await save(action);
    });
  };

  // 「全部」「土日祝だけ」「全部外す」で、行ける日をまとめて置き換える
  const replaceDates = (dates) => {
    run(() => applyMyDate({ replace: dates }), () => replaceAvailability(project.id, dates));
  };

  const toggleDate = (date) => {
    const available = !myDates.includes(date);
    run(() => applyMyDate({ date, available }), () => setAvailable(project.id, date, available));
  };

  const submit = () => {
    if (myDates.length === 0 && !window.confirm("行ける日が1日も付いていません。このまま提出しますか？")) return;
    run(() => setMySubmitted(true), () => submitAvailability(project.id));
  };

  const propose = (startDate) => {
    const range = formatDateRange(startDate, tripEndDate(startDate, days));
    if (!window.confirm(`${range} で仮決定しますか？`)) return;
    run(null, () => proposeSchedule(project.id, startDate));
  };

  // ---- 確定 ----
  if (phase === "decided") {
    const reopen = () => {
      if (!window.confirm("日程を決め直しますか？")) return;
      run(null, () => reopenSchedule(project.id));
    };
    const decidedDays = project.startDate && project.endDate ? daysBetween(project.startDate, project.endDate) + 1 : null;
    return (
      <div className="flex flex-col gap-8">
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
            <span className="font-bold text-ink">{formatDays(decidedDays)}</span>
            {isOwner && project.rangeStart && (
              <button onClick={reopen} className={`${textButtonClass} -mr-2.5 hover:text-pay`}>
                日程を決め直す
              </button>
            )}
          </div>
        </div>
        {decidedDays && <ItinerarySection project={{ ...project, days: decidedDays }} save={save} />}
      </div>
    );
  }

  // ---- 日数・期間が決まっていない（日程を決めずに作った古いプロジェクトなど） ----
  if (phase === "notStarted") {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl bg-paper px-6 py-10 text-center">
        <h3 className="font-black">日程調整が始まっていません</h3>
        <p className="text-sm leading-relaxed text-ink-sub">
          {isOwner
            ? "右上の「編集」で、日程を「これから決める」にして、旅行の日数と行ける日を聞く期間を入れてください。"
            : "作成者が旅行の日数と期間を決めると、日程調整が始まります。"}
        </p>
      </div>
    );
  }

  const submittedIds = people.filter((p) => p.availabilitySubmitted).map((p) => p.id);
  const notSubmittedIds = people.filter((p) => !p.availabilitySubmitted).map((p) => p.id);
  const stepIndex = STEPS.findIndex((s) => s.phase === phase);

  return (
    <div className="flex flex-col gap-8">
      {/* 今の段階 */}
      <div className="flex flex-col gap-3 rounded-xl bg-paper px-5 py-4.5">
        <p className="text-sm text-ink-sub">
          <b className="text-ink">{formatDays(days)}</b>・{formatDateRange(project.rangeStart, project.rangeEnd)} の中で調整中
        </p>
        <ol className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
          {STEPS.map((step, index) => (
            <li
              key={step.phase}
              aria-current={index === stepIndex ? "step" : undefined}
              className={`rounded-lg px-1.5 py-2 ${
                index === stepIndex ? "bg-primary text-white" : index < stepIndex ? "bg-line-soft text-primary" : "bg-sky-ground text-ink-faint"
              }`}>
              {index < stepIndex && <span aria-hidden="true">✓ </span>}
              {index + 1}.{" "}
              {step.label.map((part) => (
                <span key={part} className="inline-block">
                  {part}
                </span>
              ))}
            </li>
          ))}
        </ol>
      </div>

      {phase === "voting" && (
        <TentativeVote
          project={project}
          people={people}
          isOwner={isOwner}
          myAnswer={myAnswer}
          displayNames={displayNames}
          onAnswer={(answer) => run(() => setMyAnswer(answer), () => answerTentative(project.id, answer))}
          onCancel={() => {
            if (!window.confirm("仮決定を取り消して、日程を選び直しますか？\nみんなの ○× はリセットされます。")) return;
            run(null, () => cancelTentative(project.id));
          }}
        />
      )}

      {phase === "choosing" && !isOwner && (
        <div className="flex flex-col items-center gap-2 rounded-xl bg-paper px-6 py-8 text-center">
          <h3 className="font-black">全員の提出が終わりました</h3>
          <p className="text-sm leading-relaxed text-ink-sub">作成者がみんなの行ける日を見て、日程を仮決定するのを待っています。</p>
        </div>
      )}

      {/* 自分の行ける日（仮決定のあとは、表で見るだけ） */}
      {phase !== "voting" && (
        <section className="flex flex-col gap-3.5" aria-labelledby="my-calendar">
          <SectionTitle
            id="my-calendar"
            note={mySubmitted ? undefined : "行ける日をタップして選び、付け終わったら「提出する」を押してください。"}>
            自分の行ける日
          </SectionTitle>
          {!mySubmitted && (
            <QuickSelect
              dates={eachDay(project.rangeStart, project.rangeEnd)}
              onSelect={replaceDates}
            />
          )}
          <MonthCalendars
            rangeStart={project.rangeStart}
            rangeEnd={project.rangeEnd}
            available={myDates}
            locked={mySubmitted}
            onToggle={toggleDate}
          />
          {mySubmitted ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-line-soft/60 px-4.5 py-3">
              <span className="inline-flex items-center gap-1.5 font-bold text-primary">
                <CheckIcon />
                提出済み
              </span>
              <button
                onClick={() => run(() => setMySubmitted(false), () => unsubmitAvailability(project.id))}
                className={`${textButtonClass} -mr-2.5 hover:text-primary`}>
                修正する
              </button>
            </div>
          ) : (
            <button onClick={submit} className={`${primaryButtonClass} min-h-13 text-base`}>
              行ける日を提出する
            </button>
          )}
        </section>
      )}

      {/* 提出の状況とみんなの予定 */}
      <section className="flex flex-col gap-3.5" aria-labelledby="everyone">
        <SectionTitle id="everyone">
          みんなの行ける日
        </SectionTitle>
        {phase === "collecting" && (
          <p className="rounded-xl bg-paper px-4.5 py-3 text-sm text-ink-sub">
            提出済み <b className="amount text-base text-ink">{submittedIds.length}</b> / {people.length}人
            {notSubmittedIds.length > 0 && <>（まだ：{namesOf(notSubmittedIds, displayNames)}）</>}
          </p>
        )}
        <EveryoneTable
          dates={eachDay(project.rangeStart, project.rangeEnd)}
          people={people}
          displayNames={displayNames}
          currentParticipantId={currentParticipantId}
        />
      </section>

      {/* みんなの行ける日を見ながら選べるよう、表のすぐ下に置く */}
      {phase === "choosing" && isOwner && <ChooseSchedule project={project} onPropose={propose} />}
    </div>
  );
}

// 作成者が、提出された行ける日（上の表）を見て、出発日を選んで仮決定する
function ChooseSchedule({ project, onPropose }) {
  const lastStart = addDays(project.rangeEnd, -(project.days - 1));
  const [startDate, setStartDate] = useState(project.rangeStart);
  const valid = Boolean(parseDate(startDate)) && fitsInRange(startDate, project);

  return (
    <section className="flex scroll-mt-4 flex-col gap-3.5" aria-labelledby="choose">
      <SectionTitle id="choose" note="全員の提出が終わりました。上の表でみんなの行ける日を見て、出発日を選んでください。">
        日程を仮決定する
      </SectionTitle>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) onPropose(startDate);
        }}
        className="flex flex-col gap-3 rounded-xl bg-paper px-4.5 py-4">
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabelClass}>出発日</span>
          <input
            type="date"
            value={startDate}
            min={project.rangeStart}
            max={lastStart}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className={textFieldClass}
          />
        </label>
        {valid ? (
          <p className="font-bold">
            {formatDateRange(startDate, tripEndDate(startDate, project.days))}
            <span className="ml-2 text-sm font-medium text-ink-sub">{formatDays(project.days)}</span>
          </p>
        ) : (
          <p className="text-sm font-bold text-pay">期間の中に収まる出発日を選んでください</p>
        )}
        <button type="submit" disabled={!valid} className={`${primaryButtonClass} min-h-12`}>
          この日程で仮決定する
        </button>
      </form>
    </section>
  );
}

// 仮決定の日程に ○× で答える。全員が ○ なら自動で確定する
function TentativeVote({ project, people, isOwner, myAnswer, displayNames, onAnswer, onCancel }) {
  const { yes, no, waiting } = tallyAnswers(people);
  const range = formatDateRange(project.tentativeStart, tripEndDate(project.tentativeStart, project.days));

  return (
    <section className="flex flex-col gap-3.5" aria-labelledby="tentative">
      <div className="drop-shadow-[0_14px_20px_rgb(21_128_196/0.15)]">
        <div className="ticket-top px-6 pt-5 pb-4">
          <p id="tentative" className="text-sm font-bold text-ink-sub">
            仮決定の日程
          </p>
          <p className="mt-1 amount text-[30px] leading-tight text-primary sm:text-[36px]">{range}</p>
          <p className="mt-1 text-sm text-ink-sub">全員が ○ と答えると、この日程に決まります。</p>
        </div>
        <div className="ticket-bottom flex flex-col gap-4 px-6 pt-4.5 pb-5">
          <div role="group" aria-label="あなたの答え" className="grid grid-cols-2 gap-2.5">
            {[
              { id: "yes", label: "○", text: "行ける" },
              { id: "no", label: "×", text: "行けない" },
            ].map((answer) => {
              const selected = myAnswer === answer.id;
              return (
                <button
                  key={answer.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onAnswer(answer.id)}
                  className={`flex min-h-13 items-center justify-center gap-2 rounded-lg border-[1.5px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
                    selected
                      ? answer.id === "no"
                        ? "border-pay bg-pay text-white"
                        : "border-primary bg-primary text-white"
                      : "border-line-dashed bg-paper text-ink hover:bg-sky-ground"
                  }`}>
                  <span className="text-xl leading-none">{answer.label}</span>
                  {answer.text}
                </button>
              );
            })}
          </div>

          <dl className="grid gap-1 text-sm">
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 font-bold text-primary">○ {yes.length}人</dt>
              <dd className="min-w-0 text-ink-sub">{namesOf(yes, displayNames) || "—"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 font-bold text-pay">× {no.length}人</dt>
              <dd className="min-w-0 text-ink-sub">{namesOf(no, displayNames) || "—"}</dd>
            </div>
            {waiting.length > 0 && (
              <div className="flex gap-2 text-ink-faint">
                <dt className="w-16 shrink-0 font-bold">まだ {waiting.length}人</dt>
                <dd className="min-w-0">{namesOf(waiting, displayNames)}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {no.length > 0 && (
        <p role="status" className="rounded-xl bg-[#FCECE8] px-4.5 py-3 text-sm leading-relaxed font-bold text-pay">
          {isOwner
            ? "× の人がいます。日程を選び直す場合は「仮決定を取り消す」を押してください。"
            : "× の人がいるため、作成者が日程を選び直すかもしれません。"}
        </p>
      )}
      {isOwner && (
        <button onClick={onCancel} className={`${textButtonClass} self-center hover:text-pay`}>
          仮決定を取り消して選び直す
        </button>
      )}
    </section>
  );
}

// 行ける日をまとめて選ぶボタン。1日ずつタップする手間を減らす
function QuickSelect({ dates, onSelect }) {
  const options = [
    { label: "全部", dates },
    { label: "土日祝だけ", dates: dates.filter((date) => dayKind(date) !== "weekday") },
    { label: "全部外す", dates: [] },
  ];
  return (
    <div role="group" aria-label="まとめて選ぶ" className="grid grid-cols-3 gap-2">
      {options.map((option) => (
        <button
          key={option.label}
          type="button"
          onClick={() => onSelect(option.dates)}
          className="inline-flex min-h-10 items-center justify-center rounded-full border-[1.5px] border-line-dashed bg-paper px-2 text-sm font-bold text-ink transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-primary">
          {option.label}
        </button>
      ))}
    </div>
  );
}

// 期間を月ごとのカレンダーにして、自分の行ける日をタップで付け外しする
function MonthCalendars({ rangeStart, rangeEnd, available, locked, onToggle }) {
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
              {Array.from({ length: start.getUTCDay() }, (_, index) => (
                <span key={`blank-${index}`} />
              ))}
              {dates.map((date) => {
                if (date < rangeStart || date > rangeEnd) {
                  return (
                    <span key={date} className="grid aspect-square place-items-center text-sm text-line-dashed">
                      {Number(date.slice(8))}
                    </span>
                  );
                }
                const on = available.includes(date);
                const holiday = holidayName(date);
                return (
                  <button
                    key={date}
                    type="button"
                    aria-pressed={on}
                    aria-label={`${formatShortDate(date)}${holiday ? ` ${holiday}` : ""}${on ? "（行ける）" : ""}`}
                    title={holiday ?? undefined}
                    disabled={locked}
                    onClick={() => onToggle(date)}
                    className={`grid aspect-square place-items-center rounded-lg text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-default ${
                      on ? "bg-primary text-white" : `bg-sky-ground/70 enabled:hover:bg-line-soft ${KIND_TEXT[dayKind(date)]}`
                    } ${locked && !on ? "opacity-60" : ""}`}>
                    {Number(date.slice(8))}
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

// メンバー × 日付の表。○ が行ける日、一番下は行ける人数。まだ提出していない人は薄く表示する
function EveryoneTable({ dates, people, displayNames, currentParticipantId }) {
  const counts = dates.map((date) => availableCount(date, people));
  const maxCount = Math.max(...counts);

  return (
    <div className="overflow-x-auto rounded-xl bg-paper">
      <table className="border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 min-w-28 bg-paper px-3 py-2 text-left text-xs font-bold text-ink-muted">メンバー</th>
            {dates.map((date) => (
              <th key={date} className={`min-w-10 px-1 py-2 text-center text-xs font-bold ${KIND_TEXT[dayKind(date)]}`}>
                <span className="block amount text-sm">
                  {Number(date.slice(5, 7))}/{Number(date.slice(8))}
                </span>
                {WEEKDAY_LABELS[parseDate(date).getUTCDay()]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {people.map((person) => {
            const dateSet = new Set(person.availableDays);
            return (
              <tr key={person.id} className={person.availabilitySubmitted ? "" : "opacity-50"}>
                <th
                  scope="row"
                  className={`sticky left-0 z-10 max-w-36 truncate border-t border-sky-ground bg-paper px-3 py-2 text-left font-bold ${
                    person.id === currentParticipantId ? "text-primary" : ""
                  }`}>
                  {displayNames.get(person.id)}
                  {!person.availabilitySubmitted && <span className="ml-1 text-xs font-medium text-ink-faint">未提出</span>}
                </th>
                {dates.map((date) => {
                  const on = dateSet.has(date);
                  return (
                    <td
                      key={date}
                      className={`border-t border-sky-ground py-2 text-center font-bold ${on ? "bg-primary/10 text-primary" : "text-line-dashed"}`}>
                      {on ? "○" : "・"}
                    </td>
                  );
                })}
              </tr>
            );
          })}
          <tr>
            <th scope="row" className="sticky left-0 z-10 border-t-2 border-line-soft bg-paper px-3 py-2 text-left text-xs font-bold text-ink-sub">
              行ける人数
            </th>
            {counts.map((count, index) => (
              <td
                key={dates[index]}
                className={`border-t-2 border-line-soft py-2 text-center amount ${
                  count === maxCount && count > 0 ? "bg-primary/15 text-primary" : "text-ink-sub"
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
