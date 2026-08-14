import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getDb } from "../api/queries/connection";
import { dailyRecords, fetchLogs, stocks } from "./schema";

interface SeedPayload {
  generated: string;
  stocks: {
    id: string;
    name: string;
    rows: {
      date: string;
      close: number;
      open: number;
      high: number;
      low: number;
      vol: number; // 張
      foreign: number; // 張
      trust: number;
      dealer: number;
      total: number;
    }[];
  }[];
}

async function seed() {
  const db = getDb();
  const file = join(dirname(fileURLToPath(import.meta.url)), "seed-data.json");
  const payload = JSON.parse(readFileSync(file, "utf-8")) as SeedPayload;

  console.log("Seeding database...");
  let n = 0;

  for (const s of payload.stocks) {
    await db
      .insert(stocks)
      .values({ stockId: s.id, name: s.name })
      .onDuplicateKeyUpdate({ set: { name: s.name, isActive: true } });

    for (const r of s.rows) {
      await db
        .insert(dailyRecords)
        .values({
          stockId: s.id,
          date: r.date,
          open: r.open,
          high: r.high,
          low: r.low,
          close: r.close,
          volume: r.vol,
          foreignNet: r.foreign,
          trustNet: r.trust,
          dealerNet: r.dealer,
          totalNet: r.total,
          source: "seed",
        })
        .onDuplicateKeyUpdate({
          set: {
            open: r.open,
            high: r.high,
            low: r.low,
            close: r.close,
            volume: r.vol,
            foreignNet: r.foreign,
            trustNet: r.trust,
            dealerNet: r.dealer,
            totalNet: r.total,
          },
        });
      n++;
    }
    console.log(`  ${s.id} ${s.name}：${s.rows.length} 筆`);
  }

  await db.insert(fetchLogs).values({
    triggerType: "seed",
    status: "success",
    recordsUpserted: n,
    message: `匯入既有歷史資料（${payload.generated} 產生之報表）`,
    finishedAt: new Date(),
  });

  console.log(`Done. 共 ${n} 筆。`);
  process.exit(0);
}

seed();
