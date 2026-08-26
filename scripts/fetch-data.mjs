#!/usr/bin/env node
/**
 * GitHub Actions 每日資料蒐集腳本（純 Node，無外部依賴）
 * 從 FinMind 抓取三雄行情 + 三大法人買賣超，輸出成 public/data/*.json
 * 供 GitHub Pages 靜態站直接讀取。增量更新：保留既有歷史，只補新日期。
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "public", "data");
const STOCKS = [
  { stockId: "2330", name: "台積電" },
  { stockId: "2454", name: "聯發科" },
  { stockId: "2308", name: "台達電" },
];
const DEFAULT_START = "2026-05-01";
const API = "https://api.finmindtrade.com/api/v4/data";

const taipeiToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());

const nextDay = (d) => {
  const dt = new Date(`${d}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().slice(0, 10);
};

const toZhang = (shares) => Math.round(shares / 1000);

async function fetchDataset(dataset, stockId, startDate, endDate) {
  const url = `${API}?dataset=${dataset}&data_id=${stockId}&start_date=${startDate}&end_date=${endDate}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`FinMind HTTP ${res.status}`);
  const json = await res.json();
  if (json.msg !== "success") throw new Error(`FinMind: ${json.msg}`);
  return json.data ?? [];
}

async function fetchRange(stockId, startDate, endDate) {
  const [prices, inst] = await Promise.all([
    fetchDataset("TaiwanStockPrice", stockId, startDate, endDate),
    fetchDataset("TaiwanStockInstitutionalInvestorsBuySell", stockId, startDate, endDate),
  ]);
  const instByDate = new Map();
  for (const r of inst) {
    const net = toZhang((r.buy ?? 0) - (r.sell ?? 0));
    const acc = instByDate.get(r.date) ?? { foreign: 0, trust: 0, dealer: 0 };
    if (r.name === "Foreign_Investor") acc.foreign += net;
    else if (r.name === "Investment_Trust") acc.trust += net;
    else if (r.name === "Dealer_self" || r.name === "Dealer_Hedging") acc.dealer += net;
    instByDate.set(r.date, acc);
  }
  const dates = new Set([...prices.map((p) => p.date), ...instByDate.keys()]);
  return [...dates].sort().map((date) => {
    const p = prices.find((x) => x.date === date);
    const t = instByDate.get(date) ?? { foreign: 0, trust: 0, dealer: 0 };
    return {
      date,
      open: p?.open ?? null,
      high: p?.max ?? null,
      low: p?.min ?? null,
      close: p?.close ?? null,
      volume: p ? toZhang(p.Trading_Volume ?? 0) : null,
      foreignNet: t.foreign,
      trustNet: t.trust,
      dealerNet: t.dealer,
      totalNet: t.foreign + t.trust + t.dealer,
    };
  });
}

function loadExisting(file) {
  if (!existsSync(file)) return [];
  try {
    return JSON.parse(readFileSync(file, "utf-8")).rows ?? [];
  } catch {
    return [];
  }
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const today = taipeiToday();
  const index = { generated: today, stocks: [] };
  let failures = 0;

  for (const s of STOCKS) {
    try {
      const file = join(OUT_DIR, `${s.stockId}.json`);
      const existing = loadExisting(file);
      const lastDate = existing.length ? existing[existing.length - 1].date : null;
      const start = lastDate ? nextDay(lastDate) : DEFAULT_START;

      let rows = existing;
      if (start <= today) {
        const fresh = await fetchRange(s.stockId, start, today);
        if (fresh.length) {
          const map = new Map(existing.map((r) => [r.date, r]));
          for (const r of fresh) map.set(r.date, r); // upsert，避免重複
          rows = [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
          console.log(`${s.stockId} ${s.name}：新增/更新 ${fresh.length} 筆（${fresh[0].date} ~ ${fresh[fresh.length - 1].date}），累計 ${rows.length} 筆`);
        } else {
          console.log(`${s.stockId} ${s.name}：${start} 起無新資料（可能非交易日）`);
        }
      } else {
        console.log(`${s.stockId} ${s.name}：已是最新（至 ${lastDate}）`);
      }

      writeFileSync(file, JSON.stringify({ stockId: s.stockId, name: s.name, rows }));
      index.stocks.push({ stockId: s.stockId, name: s.name, lastDate: rows[rows.length - 1]?.date ?? null, days: rows.length });
    } catch (e) {
      failures++;
      console.error(`${s.stockId} ${s.name}：失敗 — ${e.message}`);
    }
  }

  writeFileSync(join(OUT_DIR, "index.json"), JSON.stringify(index, null, 2));
  console.log(`完成。資料截至 ${today}。${failures ? `（${failures} 檔失敗）` : ""}`);
  if (failures === STOCKS.length) process.exit(1); // 全數失敗才讓 Action 標紅
}

main();
