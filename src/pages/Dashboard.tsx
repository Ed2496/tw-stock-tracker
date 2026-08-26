import StockChart from "@/components/StockChart";
import { fmt, fmtPct, fmtPrice, signCls } from "@/lib/format";
import { IS_STATIC } from "@/lib/data";
import { useSource } from "@/lib/useSource";
import type { ListItem } from "@/lib/source";

function SummaryRow({ stock }: { stock: ListItem }) {
  const src = useSource();
  const q = src.useStats(stock.stockId);
  const s = q.data;
  if (q.isLoading) {
    return (
      <tr className="border-b border-[#1f1f1f]">
        <td colSpan={8} className="px-3 py-3 text-center text-muted-foreground">載入中…</td>
      </tr>
    );
  }
  if (!s) {
    return (
      <tr className="border-b border-[#1f1f1f]">
        <td colSpan={8} className="px-3 py-3 text-center text-muted-foreground">尚無資料</td>
      </tr>
    );
  }
  const seller =
    s.totals.foreign <= s.totals.trust && s.totals.foreign <= s.totals.dealer
      ? "外資"
      : s.totals.trust <= s.totals.dealer
        ? "投信"
        : "自營";
  return (
    <tr className="border-b border-[#1f1f1f] text-[14px] transition-colors hover:bg-[#161616]">
      <td className="px-3 py-2.5 text-left font-bold">
        {stock.stockId} {stock.name}
      </td>
      <td className="px-3 py-2.5">
        {fmtPrice(s.close0)} → {fmtPrice(s.close1)}
      </td>
      <td className={`px-3 py-2.5 font-bold ${signCls(s.chgPct)}`}>{fmtPct(s.chgPct)}</td>
      <td className={`px-3 py-2.5 ${signCls(s.totals.foreign)}`}>{fmt(s.totals.foreign)}</td>
      <td className={`px-3 py-2.5 ${signCls(s.totals.trust)}`}>{fmt(s.totals.trust)}</td>
      <td className={`px-3 py-2.5 ${signCls(s.totals.dealer)}`}>{fmt(s.totals.dealer)}</td>
      <td className={`px-3 py-2.5 font-bold ${signCls(s.totals.total)}`}>{fmt(s.totals.total)}</td>
      <td className="px-3 py-2.5 font-bold text-[#fbbf24]">{seller}</td>
    </tr>
  );
}

function StockCard({ stock }: { stock: ListItem }) {
  const src = useSource();
  const q = src.useRecords(stock.stockId);
  const rows = q.data ?? [];
  const first = rows[0];
  const last = rows[rows.length - 1];
  const chgPct =
    first?.close && last?.close ? ((last.close - first.close) / first.close) * 100 : null;
  const sums = rows.reduce(
    (a, r) => ({
      foreign: a.foreign + (r.foreignNet ?? 0),
      trust: a.trust + (r.trustNet ?? 0),
      dealer: a.dealer + (r.dealerNet ?? 0),
      total: a.total + (r.totalNet ?? 0),
    }),
    { foreign: 0, trust: 0, dealer: 0, total: 0 },
  );

  return (
    <section className="surface overflow-hidden">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-[#242424] px-4 py-3">
        <h2 className="text-[17px] font-bold">
          {stock.stockId} {stock.name}
        </h2>
        {first && last && (
          <span className={`text-[13px] ${signCls(chgPct)}`}>
            {fmtPrice(first.close)} → {fmtPrice(last.close)}（{fmtPct(chgPct)}）
          </span>
        )}
        <span className="micro-label ml-auto">{rows.length} TRADING DAYS</span>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 border-b border-[#242424] bg-[#0f0f0f] px-4 py-2 text-[12.5px]">
        <span>外資累計 <b className={signCls(sums.foreign)}>{fmt(sums.foreign)}</b> 張</span>
        <span>投信累計 <b className={signCls(sums.trust)}>{fmt(sums.trust)}</b> 張</span>
        <span>自營累計 <b className={signCls(sums.dealer)}>{fmt(sums.dealer)}</b> 張</span>
        <span>合計 <b className={signCls(sums.total)}>{fmt(sums.total)}</b> 張</span>
      </div>
      {q.isLoading ? (
        <div className="flex h-[560px] items-center justify-center text-muted-foreground">圖表載入中…</div>
      ) : rows.length === 0 ? (
        <div className="flex h-[200px] items-center justify-center text-muted-foreground">
          尚無資料
        </div>
      ) : (
        <StockChart rows={rows as never} />
      )}
    </section>
  );
}

export default function Dashboard() {
  const src = useSource();
  const list = src.useList();
  const stocks = list.data ?? [];
  const dates = stocks.map((s) => s.last?.date).filter(Boolean) as string[];
  const latest = dates.sort().at(-1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="micro-label mb-1">DAILY PRICE × INSTITUTIONAL NET FLOW</p>
          <h1 className="text-2xl font-bold tracking-tight">台股三雄：日價格 × 三大法人買賣淨額</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {stocks.map((s) => `${s.stockId} ${s.name}`).join("｜")}　·　單位：張　·　資料最新至{" "}
            {latest ?? "—"}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full bg-[#00d9a3]" />
          {IS_STATIC ? "GitHub Actions 每日自動更新" : "每日自動同步至資料庫"}
        </div>
      </div>

      <div className="surface overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr className="border-b border-[#242424] text-left">
              {["股票", "區間收盤", "漲跌幅", "外資累計", "投信累計", "自營累計", "三大法人合計", "區間主賣方"].map(
                (h) => (
                  <th key={h} className="micro-label px-3 py-2.5 font-medium">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {stocks.map((s) => (
              <SummaryRow key={s.stockId} stock={s} />
            ))}
          </tbody>
        </table>
      </div>

      {list.isLoading && <p className="py-10 text-center text-muted-foreground">載入中…</p>}

      <div className="space-y-6">
        {stocks.map((s) => (
          <StockCard key={s.stockId} stock={s} />
        ))}
      </div>
    </div>
  );
}
