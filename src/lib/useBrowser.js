"use client";
import { useSyncExternalStore } from "react";
import { canShare } from "./share";

// 端末の機能やサイトのURLは開いている間に変わらないので、変化を知らせる仕組みはいらない
const noopSubscribe = () => () => {};

// このサイトのURLの始まり（https://〜）。サーバーで描画するときは空にして、食い違いを防ぐ
export function useOrigin() {
  return useSyncExternalStore(noopSubscribe, () => window.location.origin, () => "");
}

// 共有メニューが使える端末（スマホなど）か。サーバーで描画するときは false
export function useCanShare() {
  return useSyncExternalStore(noopSubscribe, canShare, () => false);
}
