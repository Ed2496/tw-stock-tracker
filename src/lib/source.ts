import { useEffect, useState } from "react";
import { staticList, staticRecords, computeStats, type Row, type StockMeta, type StatsResult } from "./data";

export interface ListItem {
  stockId: string;
  name: string;
  last?: { date: string } | null;
}

export interface Query<T> {
  data?: T;
  isLoading: boolean;
}

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): Query<T> {
  const [s, setS] = useState<Query<T>>({ isLoading: true });
  useEffect(() => {
    let alive = true;
    setS({ isLoading: true });
    fn()
      .then((data) => alive && setS({ data, isLoading: false }))
      .catch(() => alive && setS({ isLoading: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return s;
}

/** 靜態模式（GitHub Pages）：從 public/data/*.json 讀取 */
export const staticSource = {
  useList(): Query<ListItem[]> {
    const q = useAsync<StockMeta[]>(staticList, []);
    return {
      data: q.data?.map((x) => ({
        stockId: x.stockId,
        name: x.name,
        last: x.lastDate ? { date: x.lastDate } : null,
      })),
      isLoading: q.isLoading,
    };
  },
  useRecords(stockId: string | undefined, start?: string, end?: string): Query<Row[]> {
    return useAsync<Row[]>(
      () => (stockId ? staticRecords(stockId, start, end) : Promise.resolve([])),
      [stockId, start, end],
    );
  },
  useStats(stockId: string | undefined, start?: string, end?: string): Query<StatsResult | null> {
    const rows = staticSource.useRecords(stockId, start, end);
    return { data: rows.data ? computeStats(rows.data) : undefined, isLoading: rows.isLoading };
  },
};

export type Source = typeof staticSource;
