import { Routes, Route } from "react-router";
import Header from "./components/Header";
import Dashboard from "./pages/Dashboard";
import Analysis from "./pages/Analysis";
import Sync from "./pages/Sync";

export default function App() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/sync" element={<Sync />} />
        </Routes>
      </main>
      <footer className="border-t border-[#242424] py-6 text-center text-[12px] text-muted-foreground">
        資料來源：FinMind（資料原始於台灣證券交易所公開資訊）· 淨額＝買進 − 賣出，單位：張 ·
        系統每日自動蒐集並存入資料庫
      </footer>
    </div>
  );
}
