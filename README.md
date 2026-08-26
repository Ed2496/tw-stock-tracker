# 台股法人籌碼追蹤

台積電（2330）、聯發科（2454）、台達電（2308）的日價格 × 三大法人買賣淨額追蹤，附離線歷史分析。

## 兩種部署模式

| 模式 | 說明 | 資料更新 |
|------|------|----------|
| **GitHub Pages（本 repo 自動部署）** | 純靜態網站，直接讀取 `public/data/*.json` | GitHub Actions 每日台北時間 21:10 自動抓 FinMind 資料並更新 |
| **Kimi 全端版** | 含後端 API + MySQL 資料庫、手動同步、同步日誌、CSV 備份下載 | 伺服器排程自動寫入資料庫 |

## GitHub Pages 版運作方式

1. `scripts/fetch-data.mjs`：從 FinMind（資料原始於台灣證券交易所公開資訊）增量抓取行情與三大法人買賣超，輸出到 `public/data/*.json`（以「張」為單位，淨額＝買進 − 賣出）
2. `.github/workflows/daily-update.yml`：每日 21:10（台北）執行抓資料 → commit 回 repo → 靜態建置 → 部署到 Pages；也可在 Actions 頁手動觸發（workflow_dispatch）
3. 前端以 `VITE_STATIC_DATA=1 vite build` 建置成靜態站，使用 HashRouter 與相對路徑，直接讀取同站的 JSON

### 開啟 GitHub Pages（首次手動設定一次）

Repo → **Settings → Pages → Build and deployment → Source 選「GitHub Actions」**。
之後每日 workflow 會自動發佈到 `https://<帳號>.github.io/tw-stock-tracker/`。

### 本機指令

```bash
node scripts/fetch-data.mjs   # 抓/更新資料到 public/data
npm run build:static          # 建置靜態版（dist/public）
npm run dev                   # 全端開發模式（需 .env 的 DATABASE_URL）
```

## 資料欄位

`public/data/<stockId>.json` → `rows[]`：`date, open, high, low, close, volume（張）, foreignNet, trustNet, dealerNet, totalNet（皆為張）`。

> 資料僅供研究參考，非投資建議。
