import { IS_STATIC } from "./data";
import { staticSource } from "./source";
import { liveSource } from "./source-live";

/**
 * 依建置模式回傳對應的資料來源。
 * 兩個 source 都靜態 import（hooks 需要同步可用）。
 * 靜態模式下頁面只會呼叫 staticSource 的 hook；liveSource 的 tRPC hook 雖被定義，
 * 但 trpc client 的 fetch 只在真正有 enabled 的查詢時才發出，故不會誤發 API 請求。
 */
export function useSource() {
  return IS_STATIC ? staticSource : liveSource;
}
