import {
  mysqlTable,
  serial,
  varchar,
  text,
  int,
  bigint,
  double,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/mysql-core";

// 追蹤的股票清單
export const stocks = mysqlTable("stocks", {
  id: serial("id").primaryKey(),
  stockId: varchar("stock_id", { length: 8 }).notNull().unique(),
  name: varchar("name", { length: 32 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 每日行情 × 三大法人買賣超（淨額與成交量皆以「張」儲存，1 張 = 1000 股）
export const dailyRecords = mysqlTable(
  "daily_records",
  {
    id: serial("id").primaryKey(),
    stockId: varchar("stock_id", { length: 8 }).notNull(),
    date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
    open: double("open"),
    high: double("high"),
    low: double("low"),
    close: double("close"),
    volume: bigint("volume", { mode: "number" }), // 成交量（張）
    foreignNet: bigint("foreign_net", { mode: "number" }), // 外資淨買賣（張）
    trustNet: bigint("trust_net", { mode: "number" }), // 投信淨買賣（張）
    dealerNet: bigint("dealer_net", { mode: "number" }), // 自營商淨買賣（張，含自行+避險）
    totalNet: bigint("total_net", { mode: "number" }), // 三大法人合計（張）
    source: varchar("source", { length: 24 }).notNull().default("finmind"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex("daily_records_stock_date_uniq").on(table.stockId, table.date),
    index("daily_records_date_idx").on(table.date),
  ],
);

// 每日蒐集任務日誌
export const fetchLogs = mysqlTable("fetch_logs", {
  id: serial("id").primaryKey(),
  triggerType: varchar("trigger_type", { length: 16 }).notNull(), // cron / manual / startup / seed
  status: varchar("status", { length: 16 }).notNull(), // success / partial / failed
  recordsUpserted: int("records_upserted").notNull().default(0),
  message: text("message"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  finishedAt: timestamp("finished_at"),
});

export type Stock = typeof stocks.$inferSelect;
export type DailyRecord = typeof dailyRecords.$inferSelect;
export type FetchLog = typeof fetchLogs.$inferSelect;
