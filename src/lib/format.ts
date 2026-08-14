/** 台股慣例：正數＝紅（買超／漲），負數＝綠（賣超／跌） */
export const signCls = (v: number | null | undefined) =>
  (v ?? 0) >= 0 ? "num-up" : "num-down";

export const fmt = (n: number | null | undefined, signed = true) => {
  if (n == null) return "—";
  const s = signed && n > 0 ? "+" : "";
  return s + Math.round(n).toLocaleString("en-US");
};

export const fmtPct = (n: number | null | undefined, digits = 1) => {
  if (n == null) return "—";
  return (n > 0 ? "+" : "") + n.toFixed(digits) + "%";
};

export const fmtPrice = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString("en-US", { maximumFractionDigits: 2 });

export const SERIES_COLORS = {
  price: "#e5e7eb",
  foreign: "#ff6b6b",
  trust: "#60a5fa",
  dealer: "#4ade80",
  total: "#fbbf24",
  mint: "#00d9a3",
};
