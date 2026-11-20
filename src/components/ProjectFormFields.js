"use client";
import { useState } from "react";
import { fieldLabelClass, RequiredMark, textFieldClass } from "./ui";
import { LIMITS } from "@/lib/limits";
import { addDays, daysBetween, formatDays, isValidDate } from "@/lib/dates";
import { MAX_DAYS, MAX_RANGE_DAYS, MAX_TRIP_DAYS } from "@/lib/schedule";

const DATE_MODES = [
  { id: "undecided", label: "これから決める" },
  { id: "fixed", label: "決まっている" },
];

// 端末の日付（日本時間など）で「今日」を "YYYY-MM-DD" にする
const today = () => new Date().toLocaleDateString("sv-SE");

// 新規作成・編集で共通のプロジェクト入力欄（name属性はServer Actionと対応）
export default function ProjectFormFields({ project }) {
  // 日付が入っていれば「決まっている」。新しく作るときは、日程調整から始める「これから決める」
  const [dateMode, setDateMode] = useState(project?.startDate || project?.endDate || (project && !project.days) ? "fixed" : "undecided");
  // 決まっている日程の開始日・終了日（「2泊3日」のように日数を出すため）
  const [fixedStart, setFixedStart] = useState(project?.startDate ?? "");
  const [fixedEnd, setFixedEnd] = useState(project?.endDate ?? "");
  const fixedDays =
    isValidDate(fixedStart) && isValidDate(fixedEnd) && daysBetween(fixedStart, fixedEnd) >= 0 ? daysBetween(fixedStart, fixedEnd) + 1 : null;

  return (
    <>
      <label className="flex flex-col gap-1.5">
        <span className={fieldLabelClass}>
          タイトル
          <RequiredMark />
        </span>
        <input
          type="text"
          name="title"
          required
          maxLength={LIMITS.title}
          defaultValue={project?.title}
          placeholder="例：沖縄旅行"
          className={textFieldClass}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={fieldLabelClass}>目的地</span>
        <input
          type="text"
          name="destination"
          maxLength={LIMITS.destination}
          defaultValue={project?.destination}
          placeholder="例：那覇"
          className={textFieldClass}
        />
      </label>

      <fieldset className="flex min-w-0 flex-col">
        <legend className={`${fieldLabelClass} mb-2`}>日程</legend>
        {/* 決まっているかどうかを、2つに分かれたボタンで選ぶ */}
        <div className="grid grid-cols-2 rounded-lg bg-sky-ground p-1">
          {DATE_MODES.map((mode) => (
            <label
              key={mode.id}
              className="flex min-h-10 cursor-pointer items-center justify-center rounded-md text-sm font-bold text-ink-sub transition-colors has-checked:bg-paper has-checked:text-primary has-checked:shadow-sm has-focus-visible:outline-2 has-focus-visible:outline-primary">
              <input
                type="radio"
                name="dateMode"
                value={mode.id}
                checked={dateMode === mode.id}
                onChange={() => setDateMode(mode.id)}
                className="sr-only"
              />
              {mode.label}
            </label>
          ))}
        </div>

        {dateMode === "undecided" ? (
          <div className="mt-3 flex flex-col gap-3">
            <p className="text-sm leading-relaxed text-ink-sub">
              メンバーに行ける日を聞いて、日程を決めます。
            </p>
            <label className="flex flex-col gap-1.5">
              <span className={fieldLabelClass}>旅行の日数</span>
              <select name="days" defaultValue={project?.days ?? 2} className={textFieldClass}>
                {Array.from({ length: MAX_DAYS }, (_, index) => index + 1).map((days) => (
                  <option key={days} value={days}>
                    {formatDays(days)}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-col gap-1.5">
              <span className={fieldLabelClass}>行ける日を聞く期間（{MAX_RANGE_DAYS}日まで）</span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  name="rangeStart"
                  aria-label="期間の始まり"
                  required
                  defaultValue={project?.rangeStart ?? today()}
                  className={`${textFieldClass} flex-1 px-2.5 text-sm`}
                />
                <span aria-hidden="true" className="shrink-0 text-ink-muted">〜</span>
                <input
                  type="date"
                  name="rangeEnd"
                  aria-label="期間の終わり"
                  required
                  defaultValue={project?.rangeEnd ?? addDays(today(), 30)}
                  className={`${textFieldClass} flex-1 px-2.5 text-sm`}
                />
              </div>
              {project?.rangeStart && (
                <p className="text-xs leading-relaxed text-ink-muted">期間を変えると、全員に行ける日を提出し直してもらいます。</p>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <input
                type="date"
                name="startDate"
                aria-label="開始日"
                value={fixedStart}
                onChange={(e) => setFixedStart(e.target.value)}
                className={`${textFieldClass} flex-1 px-2.5 text-sm`}
              />
              <span aria-hidden="true" className="shrink-0 text-ink-muted">〜</span>
              <input
                type="date"
                name="endDate"
                aria-label="終了日"
                value={fixedEnd}
                onChange={(e) => setFixedEnd(e.target.value)}
                className={`${textFieldClass} flex-1 px-2.5 text-sm`}
              />
            </div>
            {fixedDays && (
              <p className={`text-xs leading-relaxed ${fixedDays > MAX_TRIP_DAYS ? "font-bold text-pay" : "text-ink-muted"}`}>
                {fixedDays > MAX_TRIP_DAYS ? `旅行の期間は${MAX_TRIP_DAYS}日以内にしてください` : `旅行の日数：${formatDays(fixedDays)}`}
              </p>
            )}
          </div>
        )}
      </fieldset>
    </>
  );
}
