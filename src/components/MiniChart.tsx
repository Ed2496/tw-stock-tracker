import { useEffect, useRef } from "react";
import * as echarts from "echarts";

export default function MiniChart({
  option,
  height = 280,
}: {
  option: echarts.EChartsOption;
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const ch = echarts.init(ref.current);
    ch.setOption({ animation: false, backgroundColor: "transparent", ...option });
    const onResize = () => ch.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      ch.dispose();
    };
  }, [option]);

  return <div ref={ref} style={{ height }} className="w-full" />;
}

export const axisStyle = {
  axisLine: { lineStyle: { color: "#333" } },
  axisLabel: { color: "#9ca3af", fontSize: 11 },
  splitLine: { lineStyle: { color: "#1c1c1c" } },
};

export const tooltipStyle = {
  backgroundColor: "#141414",
  borderColor: "#333",
  textStyle: { color: "#e5e7eb", fontSize: 12 },
};
