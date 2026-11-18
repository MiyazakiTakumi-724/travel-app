"use client";
import { useOptimistic, useState, useTransition } from "react";
import { addItineraryItem, deleteItineraryItem, updateItineraryItem } from "./itineraryActions";
import { PlusIcon } from "@/components/icons";
import { primaryButtonClass, textButtonClass, textFieldClass } from "@/components/ui";
import { formatShortDate } from "@/lib/dates";
import { groupByDay } from "@/lib/itinerary";
import { LIMITS } from "@/lib/limits";

// 予定の変更を、サーバーの応答を待たずに画面へ反映する
function applyItemChange(items, change) {
  switch (change.type) {
    case "add":
      return [...items, change.item];
    case "update":
      return items.map((item) => (item.id === change.id ? { ...item, ...change.changes } : item));
    case "delete":
      return items.filter((item) => item.id !== change.id);
    default:
      return items;
  }
}

// 時刻と内容の入力欄（追加と編集で共通）
function ItemForm({ initial, submitLabel, onSubmit, onCancel, onDelete }) {
  const [time, setTime] = useState(initial?.time ?? "");
  const [text, setText] = useState(initial?.text ?? "");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (text.trim()) onSubmit({ time, text: text.trim() });
      }}
      className="flex flex-col gap-2.5 rounded-lg bg-sky-ground/60 p-3">
      <div className="flex gap-2">
        {/* 入力欄の共通スタイルは幅いっぱいなので、外側で幅を決める */}
        <div className="w-28 shrink-0">
          <input
            type="time"
            aria-label="時刻（なくてもよい）"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={`${textFieldClass} px-2.5 text-sm`}
          />
        </div>
        <input
          type="text"
          aria-label="予定"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={LIMITS.itinerary}
          required
          autoFocus
          placeholder="例：京都駅に集合"
          className={`${textFieldClass} min-w-0 flex-1 text-sm`}
        />
      </div>
      <div className="flex items-center gap-2">
        {onDelete && (
          <button type="button" onClick={onDelete} className={`${textButtonClass} -ml-2.5 hover:text-pay`}>
            削除
          </button>
        )}
        <button type="button" onClick={onCancel} className={`${textButtonClass} ml-auto hover:text-ink`}>
          キャンセル
        </button>
        <button type="submit" disabled={!text.trim()} className={`${primaryButtonClass} min-h-11 px-5 text-sm`}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

// 確定した日程の、日ごとの予定メモ。メンバーなら誰でも書ける
export default function ItinerarySection({ project, save }) {
  const [, startTransition] = useTransition();
  const [items, applyItem] = useOptimistic(project.itineraryItems ?? [], applyItemChange);
  // 開いている入力欄（{ dayIndex } なら追加、{ itemId } なら編集）
  const [open, setOpen] = useState(null);

  const run = (change, action) => {
    setOpen(null);
    startTransition(async () => {
      applyItem(change);
      await save(action);
    });
  };

  const days = groupByDay(items, { days: project.days, startDate: project.startDate });

  return (
    <section className="flex flex-col gap-3.5" aria-labelledby="itinerary">
      <div className="flex flex-col gap-0.5">
        <h3 id="itinerary" className="text-lg font-black">
          旅行の予定
        </h3>
        <p className="text-sm leading-relaxed text-ink-sub">集合時間や行きたい場所など、メンバーみんなで書き込めます。</p>
      </div>

      <ol className="flex flex-col gap-3">
        {days.map((day) => (
          <li key={day.dayIndex} className="rounded-xl bg-paper px-4 py-3.5">
            <p className="flex items-baseline gap-2">
              <span className="heading text-base">{day.dayIndex}日目</span>
              {day.date && <span className="text-sm font-bold text-ink-sub">{formatShortDate(day.date)}</span>}
            </p>

            {day.items.length > 0 && (
              <ul className="mt-2 flex flex-col">
                {day.items.map((item) =>
                  open?.itemId === item.id ? (
                    <li key={item.id} className="py-1">
                      <ItemForm
                        initial={item}
                        submitLabel="保存"
                        onCancel={() => setOpen(null)}
                        onSubmit={(changes) =>
                          run({ type: "update", id: item.id, changes }, () =>
                            updateItineraryItem(project.id, item.id, changes.time, changes.text)
                          )
                        }
                        onDelete={() =>
                          run({ type: "delete", id: item.id }, () => deleteItineraryItem(project.id, item.id))
                        }
                      />
                    </li>
                  ) : (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setOpen({ itemId: item.id })}
                        disabled={String(item.id).startsWith("pending-")}
                        aria-label={`「${item.text}」を編集`}
                        className="flex w-full items-baseline gap-3 rounded-lg px-1 py-2 text-left transition-colors hover:bg-sky-ground/60 focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60">
                        <span className="w-12 shrink-0 amount text-[15px] text-primary">{item.time || "・"}</span>
                        <span className="min-w-0 flex-1 wrap-break-word text-[15px]">{item.text}</span>
                      </button>
                    </li>
                  )
                )}
              </ul>
            )}

            {open?.dayIndex === day.dayIndex ? (
              <div className="mt-2">
                <ItemForm
                  submitLabel="追加"
                  onCancel={() => setOpen(null)}
                  onSubmit={({ time, text }) =>
                    run(
                      {
                        type: "add",
                        item: { id: `pending-${Date.now()}`, dayIndex: day.dayIndex, time, text, createdAt: new Date().toISOString() },
                      },
                      () => addItineraryItem(project.id, day.dayIndex, time, text)
                    )
                  }
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setOpen({ dayIndex: day.dayIndex })}
                className="mt-1.5 -ml-1 inline-flex min-h-10 items-center gap-1.5 rounded-lg px-1 text-sm font-bold text-primary transition-colors hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-primary">
                <PlusIcon size={16} />
                予定を追加
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
