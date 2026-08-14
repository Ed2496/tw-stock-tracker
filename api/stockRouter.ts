import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getRecords, lastRecordOf, listActiveStocks, recentLogs } from "./queries/stocks";
import { collectAll } from "./services/collector";

const rangeInput = z.object({
  stockId: z.string().regex(/^\d{4,6}$/),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

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

export const stockRouter = createRouter({
  /** 股票清單＋最新一筆資料 */
  list: publicQuery.query(async () => {
    const list = await listActiveStocks();
    return Promise.all(
      list.map(async (s) => {
        const [last] = await lastRecordOf(s.stockId);
        return { ...s, last };
      }),
    );
  }),

  /** 區間每日明細（儀表板圖表用） */
  records: publicQuery.input(rangeInput).query(({ input }) =>
    getRecords(input.stockId, input.start, input.end),
  ),

  /** 離線歷史分析：全部統計都由資料庫內既有資料計算，不連外 */
  stats: publicQuery.input(rangeInput).query(async ({ input }) => {
    const rows = await getRecords(input.stockId, input.start, input.end);
    if (rows.length === 0) return null;

    const sum = (k: "foreignNet" | "trustNet" | "dealerNet" | "totalNet") =>
      rows.reduce((a, r) => a + (r[k] ?? 0), 0);
    const totals = {
      foreign: sum("foreignNet"),
      trust: sum("trustNet"),
      dealer: sum("dealerNet"),
      total: sum("totalNet"),
    };

    const byTotal = [...rows].sort((a, b) => (b.totalNet ?? 0) - (a.totalNet ?? 0));
    const maxBuy = byTotal[0];
    const maxSell = byTotal[byTotal.length - 1];

    const streaks = streakInfo(rows.map((r) => r.totalNet ?? 0));
    const buyDays = rows.filter((r) => (r.totalNet ?? 0) > 0).length;
    const sellDays = rows.filter((r) => (r.totalNet ?? 0) < 0).length;

    // 日漲跌幅（%）
    const pct: (number | null)[] = rows.map((r, i) => {
      if (i === 0 || r.close == null || rows[i - 1].close == null) return null;
      return ((r.close - rows[i - 1].close!) / rows[i - 1].close!) * 100;
    });

    // 當日籌碼 vs 當日漲跌；當日籌碼 vs 次日漲跌
    const sameX: number[] = [], sameY: number[] = [];
    const nextX: number[] = [], nextY: number[] = [];
    rows.forEach((r, i) => {
      const t = r.totalNet ?? 0;
      if (pct[i] != null) { sameX.push(t); sameY.push(pct[i]!); }
      if (pct[i] != null && pct[i + 1] != null) { nextX.push(t); nextY.push(pct[i + 1]!); }
    });
    const corrSame = pearson(sameX, sameY);
    const corrNext = pearson(nextX, nextY);

    // 次日勝率：法人買超日 / 賣超日之次日上漲機率
    let buyWin = 0, buyN = 0, sellWin = 0, sellN = 0;
    rows.forEach((r, i) => {
      const t = r.totalNet ?? 0;
      const nx = pct[i + 1];
      if (nx == null) return;
      if (t > 0) { buyN++; if (nx > 0) buyWin++; }
      else if (t < 0) { sellN++; if (nx > 0) sellWin++; }
    });

    const first = rows[0], lastRow = rows[rows.length - 1];
    const chgPct =
      first.close != null && lastRow.close != null && first.close !== 0
        ? ((lastRow.close - first.close) / first.close) * 100
        : null;

    return {
      days: rows.length,
      firstDate: first.date,
      lastDate: lastRow.date,
      close0: first.close,
      close1: lastRow.close,
      chgPct,
      totals,
      avgDailyTotal: totals.total / rows.length,
      maxBuy: { date: maxBuy.date, value: maxBuy.totalNet },
      maxSell: { date: maxSell.date, value: maxSell.totalNet },
      streaks,
      buyDays,
      sellDays,
      corrSame,
      corrNext,
      winAfterBuy: buyN ? buyWin / buyN : null,
      winAfterSell: sellN ? sellWin / sellN : null,
      buyN,
      sellN,
    };
  }),
});

export const syncRouter = createRouter({
  /** 手動觸發同步 */
  now: publicQuery.mutation(() => collectAll("manual")),
  /** 同步日誌 */
  logs: publicQuery.query(() => recentLogs(30)),
});

export const routers = { stock: stockRouter, sync: syncRouter };
