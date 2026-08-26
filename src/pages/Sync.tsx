import { trpc } from "@/providers/trpc";
import { fmt, signCls } from "@/lib/format";
import { IS_STATIC } from "@/lib/data";

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

// 靜態部署（GitHub Pages）沒有後端與資料庫，顯示唯讀說明（不呼叫任何 tRPC hook）
function StaticSync() {
  return (
    <div className="space-y-6">
      <div>
        <p className="micro-label mb-1">DATA PIPELINE · GITHUB ACTIONS</p>
        <h1 className="text-2xl font-bold tracking-tight">同步狀態</h1>
      </div>
      <div className="surface px-4 py-4 text-[13.5px] leading-relaxed text-[#d1d5db]">
        <p className="mb-2 font-bold text-[#00d9a3]">此為 GitHub Pages 靜態部署版本</p>
        <p>
          資料由 GitHub Actions 每日台北時間 21:10 自動從 FinMind 抓取並更新到儲存庫，
          本站直接讀取儲存庫內的 JSON 檔，無獨立資料庫、也無法手動同步。
          更新紀錄請至 GitHub 儲存庫的 <b>Actions</b> 分頁查看。
        </p>
        <p className="mt-2 text-muted-foreground">
          需要手動同步、同步日誌與完整資料庫功能，請使用 Kimi 平台上的全端版本。
        </p>
      </div>
    </div>
  );
}

function LiveSync() {
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
            伺服器啟動時自動補齊缺口，並於台北時間平日 15:30、19:30 自動抓取當日行情與三大法人買賣超，逐日寫入資料庫。
          </p>
        </div>
        <button
          onClick={() => syncNow.mutate()}
          disabled={syncNow.isPending}
          className="rounded-md bg-[#00d9a3] px-4 py-2 text-[13px] font-bold text-black transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {syncNow.isPending ? "同步中…" : "立即同步"}
        </button>
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

export default function Sync() {
  return IS_STATIC ? <StaticSync /> : <LiveSync />;
}
