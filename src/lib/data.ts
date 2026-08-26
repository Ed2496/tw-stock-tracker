/**
 * 統一資料介面：有後端時走 tRPC，純靜態部署（GitHub Pages）時改讀 public/data/*.json。
 * 由 VITE_STATIC_DATA=1 在建置時切換，兩種模式共用同一份 UI。
 */

export interface Row {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
  foreignNet: number;
  trustNet: number;
  dealerNet: number;
  totalNet: number;
}

export interface StockMeta {
  stockId: string;
  name: string;
  lastDate: string | null;
  days: number;
}

export interface StatsResult {
  days: number;
  firstDate: string;
  lastDate: string;
  close0: number | null;
  close1: number | null;
  chgPct: number | null;
  totals: { foreign: number; trust: number; dealer: number; total: number };
  avgDailyTotal: number;
  maxBuy: { date: string; value: number };
  maxSell: { date: string; value: number };
  streaks: { longestBuy: number; longestSell: number; current: number };
  buyDays: number;
  sellDays: number;
  corrSame: number | null;
  corrNext: number | null;
  winAfterBuy: number | null;
  winAfterSell: number | null;
  buyN: number;
  sellN: number;
}

function pearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 5) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx, b = ys[i] - my;
    num += a * b; dx += a * a; dy += b * b;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? null : num / den;
}

function streakInfo(signs: number[]) {
  let bestBuy = 0, bestSell = 0, curBuy = 0, curSell = 0;
  for (const s of signs) {
    if (s > 0) { curBuy++; curSell = 0; } else if (s < 0) { curSell++; curBuy = 0; }
    else { curBuy = 0; curSell = 0; }
    bestBuy = Math.max(bestBuy, curBuy);
    bestSell = Math.max(bestSell, curSell);
  }
  const last = signs[signs.length - 1] ?? 0;
  const current = last > 0 ? curBuy : last < 0 ? -curSell : 0;
  return { longestBuy: bestBuy, longestSell: bestSell, current };
}

export function computeStats(rows: Row[]): StatsResult | null {
  if (rows.length === 0) return null;
  const sum = (k: "foreignNet" | "trustNet" | "dealerNet" | "totalNet") =>
    rows.reduce((a, r) => a + (r[k] ?? 0), 0);
  const totals = { foreign: sum("foreignNet"), trust: sum("trustNet"), dealer: sum("dealerNet"), total: sum("totalNet") };

  const byTotal = [...rows].sort((a, b) => b.totalNet - a.totalNet);
  const maxBuy = byTotal[0];
  const maxSell = byTotal[byTotal.length - 1];
  const streaks = streakInfo(rows.map((r) => r.totalNet));
  const buyDays = rows.filter((r) => r.totalNet > 0).length;
  const sellDays = rows.filter((r) => r.totalNet < 0).length;

  const pct: (number | null)[] = rows.map((r, i) => {
    if (i === 0 || r.close == null || rows[i - 1].close == null) return null;
    return ((r.close - rows[i - 1].close!) / rows[i - 1].close!) * 100;
  });

  const sameX: number[] = [], sameY: number[] = [];
  const nextX: number[] = [], nextY: number[] = [];
  rows.forEach((r, i) => {
    if (pct[i] != null) { sameX.push(r.totalNet); sameY.push(pct[i]!); }
    if (pct[i] != null && pct[i + 1] != null) { nextX.push(r.totalNet); nextY.push(pct[i + 1]!); }
  });

  let buyWin = 0, buyN = 0, sellWin = 0, sellN = 0;
  rows.forEach((r, i) => {
    const nx = pct[i + 1];
    if (nx == null) return;
    if (r.totalNet > 0) { buyN++; if (nx > 0) buyWin++; }
    else if (r.totalNet < 0) { sellN++; if (nx > 0) sellWin++; }
  });

  const first = rows[0], last = rows[rows.length - 1];
  const chgPct =
    first.close != null && last.close != null && first.close !== 0
      ? ((last.close - first.close) / first.close) * 100
      : null;

  return {
    days: rows.length,
    firstDate: first.date,
    lastDate: last.date,
    close0: first.close,
    close1: last.close,
    chgPct,
    totals,
    avgDailyTotal: totals.total / rows.length,
    maxBuy: { date: maxBuy.date, value: maxBuy.totalNet },
    maxSell: { date: maxSell.date, value: maxSell.totalNet },
    streaks,
    buyDays,
    sellDays,
    corrSame: pearson(sameX, sameY),
    corrNext: pearson(nextX, nextY),
    winAfterBuy: buyN ? buyWin / buyN : null,
    winAfterSell: sellN ? sellWin / sellN : null,
    buyN,
    sellN,
  };
}

/** 靜態模式：從 public/data 讀取 */
const BASE = import.meta.env.BASE_URL ?? "/";

export async function staticList(): Promise<StockMeta[]> {
  const res = await fetch(`${BASE}data/index.json`);
  const j = await res.json();
  return j.stocks;
}

export async function staticRecords(stockId: string, start?: string, end?: string): Promise<Row[]> {
  const res = await fetch(`${BASE}data/${stockId}.json`);
  const j = await res.json();
  let rows: Row[] = j.rows ?? [];
  if (start) rows = rows.filter((r) => r.date >= start);
  if (end) rows = rows.filter((r) => r.date <= end);
  return rows;
}

export const IS_STATIC = import.meta.env.VITE_STATIC_DATA === "1";

/**
 * 建立一個「後端模式走 tRPC、靜態模式走 JSON」的查詢 hook。
 * 重點：不用 tRPC 的 enabled 選項，而是以 queryKey 前綴區隔並用 placeholderData
 * 保持資料為 undefined——兩種模式各自只會真正有 effect 的查詢。
 * 實際上更單純的做法：用兩個獨立 hook，透過「無效的 enabled + 不同 key」避免相互干擾。
 *
 * 這裡採用最穩的方式：元件裡兩種 hook 都呼叫，但靜態模式下 tRPC 查詢的
 * queryKey 會被設為永遠不會有快取、且 trpcClient 靜態模式下根本不會發出請求
 * （我們用條件式的 links 建立）。真正的保險是：靜態模式下 TRPCProvider 不包住 App，
 * 因此 tRPC hooks 不能被呼叫——所以我們改在頁面層級分叉，元件本身不直接碰 tRPC。
 *
 * → 結論：本檔案不提供 hook；頁面以 useSource() 取得資料層，內部自行分叉。
 */
