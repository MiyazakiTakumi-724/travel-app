"use client";
import { useEffect, useId, useRef } from "react";
import { CloseIcon } from "./icons";
import { primaryButtonClass } from "./ui";

const FIRST_FIELD =
  'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), select, textarea';

// スマホは下から出るシート、sm以上は中央のモーダル。
// onClose を渡さない場合は閉じられないモーダルになる（ニックネーム設定など）。
export default function Modal({ title, onClose, children }) {
  const titleId = useId();
  const panelRef = useRef(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector(FIRST_FIELD)?.focus();

    return () => {
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  useEffect(() => {
    if (!onClose) return;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} aria-hidden="true" />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto rounded-t-2xl bg-white px-5 pt-3 pb-6 shadow-xl sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-[calc(100%-2rem)] sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:p-7"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-200 sm:hidden" aria-hidden="true" />

        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-lg font-bold text-gray-900">
            {title}
          </h2>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="閉じる"
              className="-mr-2 flex size-10 items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              <CloseIcon />
            </button>
          )}
        </div>

        {children}
      </div>
    </>
  );
}

export function SubmitButton({ children, disabled }) {
  return (
    <button type="submit" disabled={disabled} className={`${primaryButtonClass} mt-1 min-h-12 w-full`}>
      {children}
    </button>
  );
}
