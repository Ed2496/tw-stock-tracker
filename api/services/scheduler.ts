import cron from "node-cron";
import { collectAll } from "./collector";

let started = false;

/**
 * 啟動自動蒐集：
 * 1. 伺服器啟動時立即補齊缺口（冪等 upsert，無新資料時只會發少量請求）。
 * 2. 每日台北時間 21:10 自動抓取當日行情與三大法人買賣超（每日執行，假日無新資料時自動略過）。
 */
export function startScheduler(): void {
  if (started) return;
  started = true;

  const safeRun = (trigger: "cron" | "startup") =>
    collectAll(trigger).then((r) => console.log(`[collector:${trigger}] ${r.status} ${r.records} 筆\n${r.message}`))
      .catch((e) => console.error("[collector] error", e));

  // 開機補齊
  void safeRun("startup");

  cron.schedule("10 21 * * *", () => void safeRun("cron"), { timezone: "Asia/Taipei" });

  console.log("[scheduler] 已啟動：台北時間每日 21:10 自動蒐集");
}
