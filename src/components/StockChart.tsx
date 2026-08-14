import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import type { DailyRecord } from "@db/schema";
import { SERIES_COLORS } from "@/lib/format";

/**
 * 三面版走勢圖：收盤價 ／ 每日三大法人淨買賣（折線）／ 累計淨買賣
 * 資料全部來自資料庫（離線），不外連。
 */
export default function StockChart({ rows }: { rows: DailyRecord[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || rows.length === 0) return;
    const ch = echarts.init(ref.current, undefined, { renderer: "canvas" });

    const dates = rows.map((r) => r.date.slice(5));
    let f = 0, t = 0, d = 0;
    const cumF: number[] = [], cumT: number[] = [], cumD: number[] = [], cumAll: number[] = [];
    rows.forEach((r) => {
      f += r.foreignNet ?? 0;
      t += r.trustNet ?? 0;
      d += r.dealerNet ?? 0;
      cumF.push(f); cumT.push(t); cumD.push(d); cumAll.push(f + t + d);
    });

    const axisCommon = {
      axisLine: { lineStyle: { color: "#333" } },
      axisLabel: { color: "#9ca3af", fontSize: 11 },
      splitLine: { lineStyle: { color: "#1c1c1c" } },
    };

    ch.setOption({
      animation: false,
      backgroundColor: "transparent",
      textStyle: { fontFamily: "Space Grotesk, PingFang TC, Microsoft JhengHei, sans-serif" },
      legend: {
        data: ["收盤價", "外資", "投信", "自營", "合計"],
        top: 0,
        textStyle: { color: "#9ca3af", fontSize: 12 },
        itemWidth: 16,
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross", label: { backgroundColor: "#333" } },
        backgroundColor: "#141414",
        borderColor: "#333",
        textStyle: { color: "#e5e7eb", fontSize: 12 },
        valueFormatter: (v: unknown) =>
          typeof v === "number" ? v.toLocaleString("en-US") : String(v ?? "—"),
      },
      axisPointer: { link: [{ xAxisIndex: "all" }] },
      grid: [
        { left: 64, right: 20, top: 34, height: "22%" },
        { left: 64, right: 20, top: "36%", height: "25%" },
        { left: 64, right: 20, top: "71%", height: "19%" },
      ],
      xAxis: [
        { type: "category", data: dates, gridIndex: 0, axisLabel: { show: false }, axisLine: { lineStyle: { color: "#333" } } },
        { type: "category", data: dates, gridIndex: 1, axisLabel: { show: false }, axisLine: { lineStyle: { color: "#333" } } },
        { type: "category", data: dates, gridIndex: 2, ...axisCommon },
      ],
      yAxis: [
        { gridIndex: 0, name: "收盤價（元）", scale: true, nameTextStyle: { color: "#6b7280", fontSize: 11 }, ...axisCommon },
        { gridIndex: 1, name: "每日淨買賣（張）", nameTextStyle: { color: "#6b7280", fontSize: 11 }, ...axisCommon },
        { gridIndex: 2, name: "累計（張）", nameTextStyle: { color: "#6b7280", fontSize: 11 }, ...axisCommon },
      ],
      dataZoom: [
        { type: "inside", xAxisIndex: [0, 1, 2] },
        {
          type: "slider", xAxisIndex: [0, 1, 2], bottom: 2, height: 18,
          borderColor: "#333", backgroundColor: "#0f0f0f",
          fillerColor: "rgba(0,217,163,0.12)",
          handleStyle: { color: "#00d9a3" },
          textStyle: { color: "#6b7280", fontSize: 10 },
        },
      ],
      series: [
        {
          name: "收盤價", type: "line", xAxisIndex: 0, yAxisIndex: 0,
          data: rows.map((r) => r.close),
          lineStyle: { width: 2.5, color: SERIES_COLORS.price },
          itemStyle: { color: SERIES_COLORS.price },
          symbol: "circle", symbolSize: 4,
          markPoint: {
            data: [{ type: "max", name: "高" }, { type: "min", name: "低" }],
            label: { fontSize: 10, color: "#0a0a0a" },
            itemStyle: { color: "#00d9a3" },
          },
        },
        { name: "外資", type: "line", xAxisIndex: 1, yAxisIndex: 1, data: rows.map((r) => r.foreignNet), lineStyle: { width: 2, color: SERIES_COLORS.foreign }, itemStyle: { color: SERIES_COLORS.foreign }, symbol: "circle", symbolSize: 3 },
        { name: "投信", type: "line", xAxisIndex: 1, yAxisIndex: 1, data: rows.map((r) => r.trustNet), lineStyle: { width: 2, color: SERIES_COLORS.trust }, itemStyle: { color: SERIES_COLORS.trust }, symbol: "circle", symbolSize: 3 },
        { name: "自營", type: "line", xAxisIndex: 1, yAxisIndex: 1, data: rows.map((r) => r.dealerNet), lineStyle: { width: 2, color: SERIES_COLORS.dealer }, itemStyle: { color: SERIES_COLORS.dealer }, symbol: "circle", symbolSize: 3 },
        { name: "合計", type: "line", xAxisIndex: 1, yAxisIndex: 1, data: rows.map((r) => r.totalNet), lineStyle: { width: 2, type: "dashed", color: SERIES_COLORS.total }, itemStyle: { color: SERIES_COLORS.total }, symbol: "none" },
        { name: "外資", type: "line", xAxisIndex: 2, yAxisIndex: 2, data: cumF, lineStyle: { width: 2.5, color: SERIES_COLORS.foreign }, itemStyle: { color: SERIES_COLORS.foreign }, symbol: "none" },
        { name: "投信", type: "line", xAxisIndex: 2, yAxisIndex: 2, data: cumT, lineStyle: { width: 2.5, color: SERIES_COLORS.trust }, itemStyle: { color: SERIES_COLORS.trust }, symbol: "none" },
        { name: "自營", type: "line", xAxisIndex: 2, yAxisIndex: 2, data: cumD, lineStyle: { width: 2.5, color: SERIES_COLORS.dealer }, itemStyle: { color: SERIES_COLORS.dealer }, symbol: "none" },
        { name: "合計", type: "line", xAxisIndex: 2, yAxisIndex: 2, data: cumAll, lineStyle: { width: 2.5, type: "dashed", color: SERIES_COLORS.total }, itemStyle: { color: SERIES_COLORS.total }, symbol: "none" },
      ],
    });

    const onResize = () => ch.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      ch.dispose();
    };
  }, [rows]);

  return <div ref={ref} className="h-[560px] w-full" />;
}
