import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { startScheduler } from "./services/scheduler";
import { getDb } from "./queries/connection";
import { dailyRecords, stocks } from "@db/schema";
import { asc } from "drizzle-orm";

// 啟動每日自動蒐集排程（開機補齊缺口 + 台北平日 15:30 / 19:30）
startScheduler();

const app = new Hono<{ Bindings: HttpBindings }>();

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});
// 資料庫備份下載（CSV，含股票清單與全部每日紀錄）
app.get("/api/backup.csv", async (c) => {
  const db = getDb();
  const [stockRows, recordRows] = await Promise.all([
    db.select().from(stocks),
    db.select().from(dailyRecords).orderBy(asc(dailyRecords.stockId), asc(dailyRecords.date)),
  ]);

  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines: string[] = [];
  lines.push("# stocks");
  lines.push("stock_id,name,is_active");
  for (const s of stockRows) lines.push([s.stockId, s.name, s.isActive ? 1 : 0].map(esc).join(","));
  lines.push("");
  lines.push("# daily_records（單位：張；淨額＝買進 − 賣出）");
  lines.push("stock_id,date,open,high,low,close,volume,foreign_net,trust_net,dealer_net,total_net,source");
  for (const r of recordRows) {
    lines.push(
      [r.stockId, r.date, r.open, r.high, r.low, r.close, r.volume, r.foreignNet, r.trustNet, r.dealerNet, r.totalNet, r.source]
        .map(esc)
        .join(","),
    );
  }

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());
  return new Response("\uFEFF" + lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tw-institutional-backup-${today}.csv"`,
    },
  });
});

app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
