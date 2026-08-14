/**
 * FinMind 公開資料介面（資料原始於台灣證券交易所公開資訊）
 * - TaiwanStockPrice：每日 OHLCV
 * - TaiwanStockInstitutionalInvestorsBuySell：三大法人買賣（股數）
 * 本專案統一以「張」入庫（股數 / 1000 四捨五入）。
 */

const API = "https://api.finmindtrade.com/api/v4/data";

export interface DayRow {
  date: string; // YYYY-MM-DD
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null; // 張
  foreignNet: number; // 張
  trustNet: number;
  dealerNet: number;
  totalNet: number;
}

async function fetchDataset(
  dataset: string,
  stockId: string,
  startDate: string,
  endDate: string,
): Promise<any[]> {
  const url = `${API}?dataset=${dataset}&data_id=${stockId}&start_date=${startDate}&end_date=${endDate}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`FinMind HTTP ${res.status}`);
    const json = (await res.json()) as { msg?: string; status?: number; data?: any[] };
    if (json.msg !== "success") throw new Error(`FinMind: ${json.msg ?? "unknown error"}`);
    return json.data ?? [];
  } finally {
    clearTimeout(timer);
  }
}

const toZhang = (shares: number) => Math.round(shares / 1000);

export async function fetchStockRange(
  stockId: string,
  startDate: string,
  endDate: string,
): Promise<DayRow[]> {
  const [prices, inst] = await Promise.all([
    fetchDataset("TaiwanStockPrice", stockId, startDate, endDate),
    fetchDataset("TaiwanStockInstitutionalInvestorsBuySell", stockId, startDate, endDate),
  ]);

  // 三大法人淨額依日期歸戶
  const instByDate = new Map<string, { foreign: number; trust: number; dealer: number }>();
  for (const r of inst) {
    const net = toZhang((r.buy ?? 0) - (r.sell ?? 0));
    const acc = instByDate.get(r.date) ?? { foreign: 0, trust: 0, dealer: 0 };
    if (r.name === "Foreign_Investor") acc.foreign += net;
    else if (r.name === "Investment_Trust") acc.trust += net;
    else if (r.name === "Dealer_self" || r.name === "Dealer_Hedging") acc.dealer += net;
    instByDate.set(r.date, acc);
  }

  const dates = new Set<string>([
    ...prices.map((p) => p.date as string),
    ...instByDate.keys(),
  ]);

  const rows: DayRow[] = [...dates].sort().map((date) => {
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
  return rows;
}

/** 台北時區今日日期 YYYY-MM-DD */
export function taipeiToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** YYYY-MM-DD 加一天 */
export function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
