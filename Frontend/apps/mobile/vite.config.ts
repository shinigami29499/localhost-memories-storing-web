import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { uiAssetsPlugin } from "../../uiAssetsPlugin";

const appDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontendDirectory = path.resolve(appDirectory, "../..");

export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss(), uiAssetsPlugin()],
  envDir: frontendDirectory,
  publicDir: path.join(frontendDirectory, "public"),
  define: command === "serve" ? {
    "import.meta.env.VITE_API_URL": JSON.stringify(""),
  } : {},
  resolve: { alias: { "@": path.join(frontendDirectory, "src") }, dedupe: ["react", "react-dom"] },
  optimizeDeps: { include: ["react", "react-dom/client", "react-router-dom", "zustand", "@tanstack/react-query"] },
  server: {
    port: 3001,
    fs: { allow: [frontendDirectory] },
    watch: { ignored: ["**/dist/**"] },
    proxy: {
      "/api": { target: "http://localhost:8000", changeOrigin: true },
      "/hubs": { target: "http://localhost:8000", changeOrigin: true, ws: true },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          motion: ["motion"],
          query: ["@tanstack/react-query"],
        },
      },
    },
  },
}));
