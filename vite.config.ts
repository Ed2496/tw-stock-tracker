import devServer from "@hono/vite-dev-server"
import path from "path"
const __dirname = import.meta.dirname
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
const isStatic = process.env.VITE_STATIC_DATA === "1";

export default defineConfig({
  // GitHub Pages 部署在 /<repo>/ 子路徑；靜態建置時使用相對路徑
  base: isStatic ? "./" : "/",
  plugins: [
    ...(isStatic ? [] : [devServer({ entry: "api/boot.ts", exclude: [/^\/(?!api\/).*$/] })]),
    inspectAttr(), react()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@contracts": path.resolve(__dirname, "./contracts"),
      "@db": path.resolve(__dirname, "./db"),
      "db": path.resolve(__dirname, "./db"),
    },
  },
  envDir: path.resolve(__dirname),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
});
