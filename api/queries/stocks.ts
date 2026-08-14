import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { getDb } from "./connection";
import { dailyRecords, fetchLogs, stocks } from "@db/schema";

export function listActiveStocks() {
  return getDb().select().from(stocks).where(eq(stocks.isActive, true));
}

export function getRecords(stockId: string, start?: string, end?: string) {
  const conds = [eq(dailyRecords.stockId, stockId)];
  if (start) conds.push(gte(dailyRecords.date, start));
  if (end) conds.push(lte(dailyRecords.date, end));
  return getDb()
    .select()
    .from(dailyRecords)
    .where(and(...conds))
    .orderBy(asc(dailyRecords.date));
}

export function recentLogs(limit = 20) {
  return getDb().select().from(fetchLogs).orderBy(desc(fetchLogs.id)).limit(limit);
}

export function lastRecordOf(stockId: string) {
  return getDb()
    .select()
    .from(dailyRecords)
    .where(eq(dailyRecords.stockId, stockId))
    .orderBy(desc(dailyRecords.date))
    .limit(1);
}
