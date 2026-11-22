import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { uiAssetsPlugin } from "./uiAssetsPlugin";

export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss(), uiAssetsPlugin()],
  define: command === "serve" ? {
    "import.meta.env.VITE_API_URL": JSON.stringify(""),
  } : {},
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: { include: ["react", "react-dom/client", "react-router-dom", "zustand", "@tanstack/react-query"] },
  server: {
    port: 3000,
    allowedHosts: ["atomic-stop-petition-collection.trycloudflare.com"],
    watch: {
      ignored: ["**/dist/**"],
    },
    proxy: {
      // Development requests stay same-origin, including when accessed through ngrok.
      "/api": { target: "http://localhost:8000", changeOrigin: true },
      "/hubs": { target: "http://localhost:8000", changeOrigin: true, ws: true },
    },
  },
  build: {
    outDir: "dist",
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
  test: {
    environment: "node",
    globals: true,
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    setupFiles: ["./tests/setup.ts"],
  },
}));
