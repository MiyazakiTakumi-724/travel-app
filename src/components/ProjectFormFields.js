"use client";
import { useState } from "react";
import { fieldLabelClass, textFieldClass } from "./ui";
import { LIMITS } from "@/lib/limits";
import { formatDays } from "@/lib/dates";
import { MAX_DAYS } from "@/lib/schedule";

const DATE_MODES = [
  { id: "undecided", label: "これから決める" },
  { id: "fixed", label: "決まっている" },
];

// 新規作成・編集で共通のプロジェクト入力欄（name属性はServer Actionと対応）
export default function ProjectFormFields({ project }) {
  // 日付が入っていれば「決まっている」。新しく作るときは、日程調整から始める「これから決める」
  const [dateMode, setDateMode] = useState(project?.startDate || project?.endDate || (project && !project.days) ? "fixed" : "undecided");

  return (
    <>
      <label className="flex flex-col gap-1.5">
        <span className={fieldLabelClass}>タイトル</span>
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
          <label className="mt-3 flex flex-col gap-1.5">
            <span className="text-sm text-ink-sub">旅行の日数（日程はメンバーの都合を聞いて決めます）</span>
            <select name="days" defaultValue={project?.days ?? 2} className={textFieldClass}>
              {Array.from({ length: MAX_DAYS }, (_, index) => index + 1).map((days) => (
                <option key={days} value={days}>
                  {formatDays(days)}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="mt-3 flex items-center gap-2">
            <input
              type="date"
              name="startDate"
              aria-label="開始日"
              defaultValue={project?.startDate}
              className={`${textFieldClass} flex-1 px-2.5 text-sm`}
            />
            <span aria-hidden="true" className="shrink-0 text-ink-muted">〜</span>
            <input
              type="date"
              name="endDate"
              aria-label="終了日"
              defaultValue={project?.endDate}
              className={`${textFieldClass} flex-1 px-2.5 text-sm`}
            />
          </div>
        )}
      </fieldset>
    </>
  );
}
