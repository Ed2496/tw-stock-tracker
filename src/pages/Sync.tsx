import { trpc } from "@/providers/trpc";
import { fmt, signCls } from "@/lib/format";

const triggerLabel: Record<string, string> = {
  cron: "排程",
  manual: "手動",
  startup: "開機補齊",
  seed: "種子匯入",
};

const statusStyle: Record<string, string> = {
  success: "text-[#00d9a3]",
  partial: "text-[#fbbf24]",
  failed: "text-[#ff6b6b]",
  skipped: "text-muted-foreground",
};

const statusLabel: Record<string, string> = {
  success: "成功",
  partial: "部分成功",
  failed: "失敗",
  skipped: "略過",
};

function fmtTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false });
}

export default function Sync() {
  const utils = trpc.useUtils();
  const list = trpc.stock.list.useQuery();
  const logs = trpc.sync.logs.useQuery(undefined, { refetchInterval: 15000 });
  const syncNow = trpc.sync.now.useMutation({
    onSuccess: () => {
      utils.sync.logs.invalidate();
      utils.stock.list.invalidate();
      utils.stock.records.invalidate();
      utils.stock.stats.invalidate();
    },
  });

  const latestLog = logs.data?.[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="micro-label mb-1">DATA PIPELINE · FINMIND → DATABASE</p>
          <h1 className="text-2xl font-bold tracking-tight">同步狀態</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            伺服器啟動時自動補齊缺口，並於台北時間每日 21:10 自動抓取當日行情與三大法人買賣超，逐日累積寫入資料庫（只增不刪）。
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => syncNow.mutate()}
            disabled={syncNow.isPending}
            className="rounded-md bg-[#00d9a3] px-4 py-2 text-[13px] font-bold text-black transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {syncNow.isPending ? "同步中…" : "立即同步"}
          </button>
          <a
            href="/api/backup.csv"
            download
            className="rounded-md border border-[#00d9a3] px-4 py-2 text-[13px] font-bold text-[#00d9a3] transition-colors hover:bg-[#00d9a3]/10"
          >
            下載資料庫（CSV）
          </a>
        </div>
      </div>

      <div className="surface px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
        <span className="mr-2 font-bold text-foreground">每日備份說明</span>
        所有數據都累積保存在雲端資料庫中，不會因重新整理或版本更新而消失。「下載資料庫（CSV）」會把目前完整資料庫（股票清單＋全部每日紀錄）匯出存到您的本機，建議每日 21:10 自動更新完成後點一次即可取得最新備份；檔案可用 Excel 直接開啟（已含 BOM 避免中文亂碼）。
      </div>

      {syncNow.data && (
        <div
          className={`surface px-4 py-3 text-[13px] ${
            syncNow.data.status === "success" ? "border-l-2 border-l-[#00d9a3]" : "border-l-2 border-l-[#fbbf24]"
          }`}
        >
          <p className="mb-1 font-bold">
            本次同步：{statusLabel[syncNow.data.status] ?? syncNow.data.status}，寫入 {syncNow.data.records} 筆
          </p>
          <pre className="whitespace-pre-wrap text-muted-foreground">{syncNow.data.message}</pre>
        </div>
      )}
      {syncNow.error && (
        <div className="surface border-l-2 border-l-[#ff6b6b] px-4 py-3 text-[13px] text-[#ff6b6b]">
          同步失敗：{syncNow.error.message}
        </div>
      )}

      {/* 資料覆蓋 */}
      <div className="surface overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse">
          <thead>
            <tr className="border-b border-[#242424] text-left">
              {["股票", "最新資料日", "最新收盤", "當日合計淨買賣", "資料來源"].map((h) => (
                <th key={h} className="micro-label px-3 py-2.5 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(list.data ?? []).map((s) => (
              <tr key={s.stockId} className="border-b border-[#1f1f1f] text-[14px]">
                <td className="px-3 py-2.5 font-bold">{s.stockId} {s.name}</td>
                <td className="px-3 py-2.5">{s.last?.date ?? "—"}</td>
                <td className="px-3 py-2.5">{s.last?.close ?? "—"}</td>
                <td className={`px-3 py-2.5 ${signCls(s.last?.totalNet)}`}>{fmt(s.last?.totalNet)} 張</td>
                <td className="px-3 py-2.5 text-muted-foreground">{s.last?.source ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 日誌 */}
      <div>
        <p className="micro-label mb-2">
          SYNC LOG{latestLog ? ` · 最近執行 ${fmtTime(latestLog.startedAt)}` : ""}
        </p>
        <div className="surface divide-y divide-[#1c1c1c]">
          {(logs.data ?? []).map((l) => (
            <div key={l.id} className="px-4 py-3">
              <div className="flex flex-wrap items-baseline gap-x-3 text-[13px]">
                <span className="text-muted-foreground">{fmtTime(l.startedAt)}</span>
                <span className="rounded border border-[#2a2a2a] px-1.5 py-0.5 text-[11px] text-muted-foreground">
                  {triggerLabel[l.triggerType] ?? l.triggerType}
                </span>
                <span className={`font-bold ${statusStyle[l.status] ?? ""}`}>
                  {statusLabel[l.status] ?? l.status}
                </span>
                <span className="text-muted-foreground">寫入 {l.recordsUpserted} 筆</span>
              </div>
              {l.message && (
                <pre className="mt-1.5 whitespace-pre-wrap text-[12px] leading-relaxed text-muted-foreground">
                  {l.message}
                </pre>
              )}
            </div>
          ))}
          {logs.data?.length === 0 && (
            <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">尚無同步紀錄</p>
          )}
        </div>
      </div>
    </div>
  );
}
