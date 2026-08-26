import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router'
import './index.css'
import { TRPCProvider } from "@/providers/trpc"
import { IS_STATIC } from "@/lib/data"
import App from './App.tsx'

// GitHub Pages 靜態部署沒有伺服器端路由，使用 HashRouter 避免子路由 404
// 靜態模式不掛 TRPCProvider（避免無後端時 tRPC context 錯誤）
const Router = IS_STATIC ? HashRouter : BrowserRouter

const app = IS_STATIC ? (
  <Router>
    <App />
  </Router>
) : (
  <Router>
    <TRPCProvider>
      <App />
    </TRPCProvider>
  </Router>
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>{app}</StrictMode>,
)
