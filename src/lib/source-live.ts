import { trpc } from "@/providers/trpc";
import type { Row, StatsResult } from "./data";
import type { ListItem, Query, Source } from "./source";

/**
 * 後端模式（Kimi 全端版）：走 tRPC 打後端 API 與資料庫。
 * 靜態建置時本檔也會被 bundle，但因頁面在 IS_STATIC 下不會呼叫這些 hook，
 * 且 trpc client 的 fetch 只在真正發請求時才執行，故靜態版不會發出 API 請求。
 */
export const liveSource: Source = {
  useList(): Query<ListItem[]> {
    const q = trpc.stock.list.useQuery();
    return { data: q.data as ListItem[] | undefined, isLoading: q.isLoading };
  },
  useRecords(stockId: string | undefined, start?: string, end?: string): Query<Row[]> {
    const q = trpc.stock.records.useQuery(
      { stockId: stockId ?? "", start, end },
      { enabled: !!stockId },
    );
    return { data: q.data as Row[] | undefined, isLoading: q.isLoading };
  },
  useStats(stockId: string | undefined, start?: string, end?: string): Query<StatsResult | null> {
    const q = trpc.stock.stats.useQuery(
      { stockId: stockId ?? "", start, end },
      { enabled: !!stockId },
    );
    return { data: (q.data ?? null) as StatsResult | null | undefined, isLoading: q.isLoading };
  },
};
