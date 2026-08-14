import cron from "node-cron";
import { collectAll } from "./collector";

let started = false;

/**
 * 啟動自動蒐集：
 * 1. 伺服器啟動時立即補齊缺口（冪等 upsert，無新資料時只會發少量請求）。
 * 2. 每個台北交易日 15:30 / 19:30 各抓一次（盤後法人資料陸續更新）。
 * 3. 每小時整點巡檢一次，若今日尚無資料則補抓（涵蓋伺服器重啟、假日誤判等情況）。
 */
export function startScheduler(): void {
  if (started) return;
  started = true;

  const safeRun = (trigger: "cron" | "startup") =>
    collectAll(trigger).then((r) => console.log(`[collector:${trigger}] ${r.status} ${r.records} 筆\n${r.message}`))
      .catch((e) => console.error("[collector] error", e));

  // 開機補齊
  void safeRun("startup");

  cron.schedule("30 15 * * 1-5", () => void safeRun("cron"), { timezone: "Asia/Taipei" });
  cron.schedule("30 19 * * 1-5", () => void safeRun("cron"), { timezone: "Asia/Taipei" });

  console.log("[scheduler] 已啟動：台北時間平日 15:30 / 19:30 自動蒐集");
}
