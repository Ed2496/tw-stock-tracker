import { useMemo, useState } from "react";
import { trpc } from "@/providers/trpc";
import MiniChart, { axisStyle, tooltipStyle } from "@/components/MiniChart";
import { fmt, fmtPct, fmtPrice, SERIES_COLORS } from "@/lib/format";
import type { DailyRecord } from "@db/schema";

function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "up" | "down" | "plain";
}) {
  return (
    <div className="surface px-4 py-3">
      <p className="micro-label">{label}</p>
      <p
        className={`mt-1 text-[22px] font-bold leading-none ${
          tone === "up" ? "num-up" : tone === "down" ? "num-down" : ""
        }`}
      >
        {value}
      </p>
      {sub && <p className="mt-1.5 text-[11.5px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

/** 直方圖分桶 */
function histogram(values: number[], buckets = 15) {
  if (values.length === 0) return { cats: [] as string[], data: [] as number[] };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const w = Math.max(1, Math.ceil((max - min) / buckets / 100) * 100);
  const counts = new Map<number, number>();
  values.forEach((v) => {
    const b = Math.floor(v / w) * w;
    counts.set(b, (counts.get(b) ?? 0) + 1);
  });
  const keys = [...counts.keys()].sort((a, b) => a - b);
  return {
    cats: keys.map((k) => `${fmt(k, true)}`),
    data: keys.map((k) => counts.get(k)!),
    colors: keys.map((k) => (k >= 0 ? SERIES_COLORS.foreign : SERIES_COLORS.dealer)),
  };
}

function cumulative(rows: DailyRecord[], key: "foreignNet" | "trustNet" | "dealerNet" | "totalNet") {
  let s = 0;
  return rows.map((r) => (s += r[key] ?? 0));
}

export default function Analysis() {
  const list = trpc.stock.list.useQuery();
  const stocks = list.data ?? [];
  const [stockId, setStockId] = useState<string | null>(null);
  const [range, setRange] = useState<{ start?: string; end?: string }>({});
  const current = stockId ?? stocks[0]?.stockId;

  const stats = trpc.stock.stats.useQuery(
    { stockId: current!, ...range },
    { enabled: !!current },
  );
  const records = trpc.stock.records.useQuery(
    { stockId: current!, ...range },
    { enabled: !!current },
  );
  const rows = records.data ?? [];

  // 快速區間按鈕需要「全量日期」回推起點，與目前篩選無關
  const all = trpc.stock.records.useQuery({ stockId: current! }, { enabled: !!current });
  const allDates = useMemo(() => (all.data ?? []).map((r) => r.date), [all.data]);
  const [quick, setQuick] = useState<number | null>(null);
  const applyQuick = (n: number | null) => {
    setQuick(n);
    if (n == null) setRange({});
    else if (allDates.length > 0) {
      const idx = Math.max(0, allDates.length - n);
      setRange({ start: allDates[idx], end: undefined });
    }
  };

  const s = stats.data;

  const cumOption = useMemo(() => {
    const dates = rows.map((r) => r.date.slice(5));
    return {
      legend: { textStyle: { color: "#9ca3af", fontSize: 12 }, top: 0 },
      tooltip: { trigger: "axis" as const, ...tooltipStyle },
      grid: { left: 64, right: 20, top: 30, bottom: 24 },
      xAxis: { type: "category" as const, data: dates, ...axisStyle },
      yAxis: { type: "value" as const, name: "累計（張）", nameTextStyle: { color: "#6b7280" }, ...axisStyle },
      series: [
        { name: "外資", type: "line" as const, data: cumulative(rows, "foreignNet"), symbol: "none", lineStyle: { width: 2.5, color: SERIES_COLORS.foreign }, itemStyle: { color: SERIES_COLORS.foreign } },
        { name: "投信", type: "line" as const, data: cumulative(rows, "trustNet"), symbol: "none", lineStyle: { width: 2.5, color: SERIES_COLORS.trust }, itemStyle: { color: SERIES_COLORS.trust } },
        { name: "自營", type: "line" as const, data: cumulative(rows, "dealerNet"), symbol: "none", lineStyle: { width: 2.5, color: SERIES_COLORS.dealer }, itemStyle: { color: SERIES_COLORS.dealer } },
        { name: "合計", type: "line" as const, data: cumulative(rows, "totalNet"), symbol: "none", lineStyle: { width: 2.5, type: "dashed" as const, color: SERIES_COLORS.total }, itemStyle: { color: SERIES_COLORS.total } },
      ],
    };
  }, [rows]);

  const histOption = useMemo(() => {
    const h = histogram(rows.map((r) => r.totalNet ?? 0));
    return {
      tooltip: { trigger: "axis" as const, ...tooltipStyle },
      grid: { left: 44, right: 20, top: 24, bottom: 40 },
      xAxis: { type: "category" as const, data: h.cats, ...axisStyle, axisLabel: { ...axisStyle.axisLabel, rotate: 45 } },
      yAxis: { type: "value" as const, name: "天數", nameTextStyle: { color: "#6b7280" }, ...axisStyle },
      series: [
        {
          name: "天數", type: "bar" as const, data: h.data,
          itemStyle: {
            color: (p: { dataIndex: number }) => h.colors?.[p.dataIndex] ?? SERIES_COLORS.total,
            borderRadius: [3, 3, 0, 0],
          },
        },
      ],
    };
  }, [rows]);

  const scatterOption = useMemo(() => {
    const pts: [number, number][] = [];
    rows.forEach((r, i) => {
      const prev = rows[i - 1], next = rows[i + 1];
      if (!r.close || !next?.close) return;
      if (r.totalNet == null) return;
      const nextPct = ((next.close - r.close) / r.close) * 100;
      if (prev || i > 0) pts.push([r.totalNet, Number(nextPct.toFixed(2))]);
    });
    return {
      tooltip: {
        ...tooltipStyle,
        formatter: (p: unknown) => {
          const v = (p as { value: [number, number] }).value;
          return `合計淨買賣 ${fmt(v[0])} 張<br/>次日漲跌 ${fmtPct(v[1], 2)}`;
        },
      },
      grid: { left: 56, right: 20, top: 24, bottom: 40 },
      xAxis: { type: "value" as const, name: "當日合計淨買賣（張）", nameLocation: "middle" as const, nameGap: 28, nameTextStyle: { color: "#6b7280" }, ...axisStyle },
      yAxis: { type: "value" as const, name: "次日漲跌（%）", nameTextStyle: { color: "#6b7280" }, ...axisStyle },
      series: [
        {
          type: "scatter" as const,
          data: pts,
          symbolSize: 9,
          itemStyle: { color: SERIES_COLORS.mint, opacity: 0.75 },
          markLine: {
            silent: true,
            symbol: "none",
            lineStyle: { color: "#444", type: "dashed" as const },
            data: [{ xAxis: 0 }, { yAxis: 0 }],
            label: { show: false },
          },
        },
      ],
    };
  }, [rows]);

  const tone = (v: number | null | undefined) => ((v ?? 0) >= 0 ? "up" : "down") as "up" | "down";

  return (
    <div className="space-y-6">
      <div>
        <p className="micro-label mb-1">OFFLINE HISTORICAL ANALYSIS · 資料庫內既有資料運算，不連外</p>
        <h1 className="text-2xl font-bold tracking-tight">離線歷史紀錄分析</h1>
      </div>

      {/* 控制列 */}
      <div className="surface flex flex-wrap items-center gap-3 px-4 py-3">
        <div className="flex gap-1">
          {stocks.map((st) => (
            <button
              key={st.stockId}
              onClick={() => setStockId(st.stockId)}
              className={`rounded-md px-3 py-1.5 text-[13px] transition-colors ${
                current === st.stockId ? "bg-[#00d9a3] font-bold text-black" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {st.stockId} {st.name}
            </button>
          ))}
        </div>
        <div className="mx-2 h-5 w-px bg-[#2a2a2a]" />
        <div className="flex items-center gap-2 text-[13px]">
          <input
            type="date"
            value={range.start ?? ""}
            onChange={(e) => { setQuick(null); setRange((r) => ({ ...r, start: e.target.value || undefined })); }}
            className="rounded-md border border-[#2a2a2a] bg-[#0f0f0f] px-2 py-1 text-[13px] [color-scheme:dark]"
          />
          <span className="text-muted-foreground">至</span>
          <input
            type="date"
            value={range.end ?? ""}
            onChange={(e) => { setQuick(null); setRange((r) => ({ ...r, end: e.target.value || undefined })); }}
            className="rounded-md border border-[#2a2a2a] bg-[#0f0f0f] px-2 py-1 text-[13px] [color-scheme:dark]"
          />
        </div>
        <div className="flex gap-1">
          {[{ n: 20, l: "近20日" }, { n: 60, l: "近60日" }, { n: null, l: "全部" }].map((q) => (
            <button
              key={q.l}
              onClick={() => applyQuick(q.n)}
              className={`rounded-md border px-2.5 py-1 text-[12px] transition-colors ${
                quick === q.n ? "border-[#00d9a3] text-[#00d9a3]" : "border-[#2a2a2a] text-muted-foreground hover:text-foreground"
              }`}
            >
              {q.l}
            </button>
          ))}
        </div>
        {s && (
          <span className="ml-auto text-[12px] text-muted-foreground">
            {s.firstDate} ~ {s.lastDate}・{s.days} 個交易日
          </span>
        )}
      </div>

      {stats.isLoading && <p className="py-10 text-center text-muted-foreground">分析運算中…</p>}

      {s && (
        <>
          {/* 統計卡 */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <StatCard label="區間股價" value={`${fmtPrice(s.close0)} → ${fmtPrice(s.close1)}`} sub={`漲跌幅 ${fmtPct(s.chgPct)}`} tone={tone(s.chgPct)} />
            <StatCard label="三大法人合計" value={`${fmt(s.totals.total)} 張`} sub={`日均 ${fmt(s.avgDailyTotal)} 張`} tone={tone(s.totals.total)} />
            <StatCard label="外資 / 投信 / 自營" value={`${fmt(s.totals.foreign, false)}`} sub={`投信 ${fmt(s.totals.trust)}・自營 ${fmt(s.totals.dealer)} 張`} tone={tone(s.totals.foreign)} />
            <StatCard label="買超 / 賣超天數" value={`${s.buyDays} / ${s.sellDays}`} sub={`買超佔比 ${s.days ? Math.round((s.buyDays / s.days) * 100) : 0}%`} />
            <StatCard label="最長連續買超" value={`${s.streaks.longestBuy} 日`} sub={`最長連續賣超 ${s.streaks.longestSell} 日`} />
            <StatCard
              label="目前連續方向"
              value={s.streaks.current === 0 ? "持平" : `${Math.abs(s.streaks.current)} 日${s.streaks.current > 0 ? "買超" : "賣超"}`}
              tone={s.streaks.current >= 0 ? "up" : "down"}
            />
            <StatCard label="最大單日買超" value={`${fmt(s.maxBuy.value)} 張`} sub={s.maxBuy.date} tone="up" />
            <StatCard label="最大單日賣超" value={`${fmt(s.maxSell.value)} 張`} sub={s.maxSell.date} tone="down" />
            <StatCard
              label="籌碼×當日漲跌 相關"
              value={s.corrSame == null ? "—" : s.corrSame.toFixed(2)}
              sub="皮爾森相關係數（同期）"
            />
            <StatCard
              label="籌碼×次日漲跌 相關"
              value={s.corrNext == null ? "—" : s.corrNext.toFixed(2)}
              sub="法人動向的次日領先性"
            />
            <StatCard
              label="買超日→次日上漲機率"
              value={s.winAfterBuy == null ? "—" : `${Math.round(s.winAfterBuy * 100)}%`}
              sub={`樣本 ${s.buyN} 日`}
              tone="up"
            />
            <StatCard
              label="賣超日→次日上漲機率"
              value={s.winAfterSell == null ? "—" : `${Math.round(s.winAfterSell * 100)}%`}
              sub={`樣本 ${s.sellN} 日`}
              tone="down"
            />
          </div>

          {/* 自動解讀 */}
          <div className="surface border-l-2 border-l-[#00d9a3] px-4 py-3 text-[13.5px] leading-relaxed text-[#d1d5db]">
            <span className="mr-2 font-bold text-[#00d9a3]">解讀</span>
            區間內三大法人合計{s.totals.total >= 0 ? "買超" : "賣超"} {fmt(Math.abs(s.totals.total), false)} 張，
            股價{fmtPct(s.chgPct)}。
            {s.corrNext != null &&
              (Math.abs(s.corrNext) < 0.2
                ? `當日籌碼與次日漲跌幾乎無線性相關（r=${s.corrNext.toFixed(2)}），隔日股價較難由法人單日動向推斷。`
                : `當日籌碼與次日漲跌呈${s.corrNext > 0 ? "正" : "負"}相關（r=${s.corrNext.toFixed(2)}）。`)}
            {s.winAfterBuy != null &&
              ` 法人買超日次日上漲機率 ${Math.round(s.winAfterBuy * 100)}%（${s.buyN} 個樣本），僅供歷史統計參考，非投資建議。`}
          </div>

          {/* 圖表 */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="surface px-3 py-3 lg:col-span-2">
              <p className="micro-label px-1 pb-1">累計淨買賣走勢（張）</p>
              <MiniChart option={cumOption} height={300} />
            </div>
            <div className="surface px-3 py-3">
              <p className="micro-label px-1 pb-1">每日合計淨買賣分佈</p>
              <MiniChart option={histOption} height={280} />
            </div>
            <div className="surface px-3 py-3">
              <p className="micro-label px-1 pb-1">當日合計 × 次日漲跌 散佈</p>
              <MiniChart option={scatterOption} height={280} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
