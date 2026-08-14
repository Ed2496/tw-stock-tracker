import { eq, max } from "drizzle-orm";
import { getDb } from "../queries/connection";
import { dailyRecords, fetchLogs, stocks } from "@db/schema";
import { fetchStockRange, nextDay, taipeiToday, type DayRow } from "./finmind";

/** 無任何歷史資料時的預設回溯起點 */
export const DEFAULT_START = "2026-05-01";

/** 預設追蹤清單（股票清單為空時自動重建，確保自動蒐集永不空轉） */
const DEFAULT_STOCKS = [
  { stockId: "2330", name: "台積電" },
  { stockId: "2454", name: "聯發科" },
  { stockId: "2308", name: "台達電" },
];

async function ensureDefaultStocks() {
  const db = getDb();
  for (const s of DEFAULT_STOCKS) {
    await db
      .insert(stocks)
      .values({ ...s, isActive: true })
      .onDuplicateKeyUpdate({ set: { name: s.name } });
  }
}

let running = false;

export interface CollectResult {
  status: "success" | "partial" | "failed" | "skipped";
  records: number;
  message: string;
}

async function upsertRows(stockId: string, rows: DayRow[]): Promise<number> {
  const db = getDb();
  let n = 0;
  for (const r of rows) {
    await db
      .insert(dailyRecords)
      .values({ stockId, ...r, source: "finmind" })
      .onDuplicateKeyUpdate({
        set: {
          open: r.open,
          high: r.high,
          low: r.low,
          close: r.close,
          volume: r.volume,
          foreignNet: r.foreignNet,
          trustNet: r.trustNet,
          dealerNet: r.dealerNet,
          totalNet: r.totalNet,
          source: "finmind",
        },
      });
    n++;
  }
  return n;
}

/**
 * 對所有啟用股票執行增量蒐集：從資料庫最後一天 +1 補到台北今日。
 * 以 fetch_logs 記錄每次執行結果。同時間只允許一個任務。
 */
export async function collectAll(trigger: "cron" | "manual" | "startup"): Promise<CollectResult> {
  const db = getDb();
  if (running) {
    return { status: "skipped", records: 0, message: "已有同步任務進行中" };
  }
  running = true;
  const [log] = await db
    .insert(fetchLogs)
    .values({ triggerType: trigger, status: "failed", message: "執行中" })
    .$returningId();

  const today = taipeiToday();
  let total = 0;
  const notes: string[] = [];
  let failures = 0;

  try {
    await ensureDefaultStocks();
    const active = await db.select().from(stocks).where(eq(stocks.isActive, true));
    for (const s of active) {
      try {
        const [last] = await db
          .select({ lastDate: max(dailyRecords.date) })
          .from(dailyRecords)
          .where(eq(dailyRecords.stockId, s.stockId));
        const start = last?.lastDate ? nextDay(last.lastDate) : DEFAULT_START;
        if (start > today) {
          notes.push(`${s.stockId} ${s.name}：已是最新（至 ${last?.lastDate}）`);
          continue;
        }
        const rows = await fetchStockRange(s.stockId, start, today);
        if (rows.length === 0) {
          notes.push(`${s.stockId} ${s.name}：${start} 起無新資料（可能非交易日）`);
          continue;
        }
        const n = await upsertRows(s.stockId, rows);
        total += n;
        notes.push(`${s.stockId} ${s.name}：寫入 ${n} 筆（${rows[0].date} ~ ${rows[rows.length - 1].date}）`);
      } catch (e) {
        failures++;
        notes.push(`${s.stockId} ${s.name}：失敗 — ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    const status = failures === 0 ? "success" : total > 0 ? "partial" : "failed";
    const message = notes.join("\n");
    await db
      .update(fetchLogs)
      .set({ status, recordsUpserted: total, message, finishedAt: new Date() })
      .where(eq(fetchLogs.id, log.id));
    return { status, records: total, message };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await db
      .update(fetchLogs)
      .set({ status: "failed", message, finishedAt: new Date() })
      .where(eq(fetchLogs.id, log.id));
    return { status: "failed", records: total, message };
  } finally {
    running = false;
  }
}
