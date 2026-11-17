"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// ほかのメンバーが記録した支払いも再読み込みせずに見えるよう、サーバーのデータを読み直す。
// ・画面に戻ってきたとき（タブ切り替え・ホーム画面のアプリから戻ったとき）
// ・画面を開いている間は一定間隔で
// paused が true の間（保存中など）は読み直さない
export function useAutoRefresh({ intervalMs = 20000, paused = false } = {}) {
  const router = useRouter();
  const lastRefreshRef = useRef(0);
  const pausedRef = useRef(paused);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible" || pausedRef.current) return;
      // focus と visibilitychange が続けて来ることがあるので、短い間に何度も読み直さない
      const now = Date.now();
      if (now - lastRefreshRef.current < 3000) return;
      lastRefreshRef.current = now;
      router.refresh();
    };

    const timer = setInterval(refresh, intervalMs);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [router, intervalMs]);
}
