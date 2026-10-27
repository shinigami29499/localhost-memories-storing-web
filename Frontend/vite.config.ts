import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  define: command === "serve" ? {
    "import.meta.env.VITE_API_URL": JSON.stringify(""),
  } : {},
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    allowedHosts: ["wilder-unbolted-septum.ngrok-free.dev"],
    proxy: {
      // Development requests stay same-origin, including when accessed through ngrok.
      "/api": { target: "http://localhost:8000", changeOrigin: true },
      "/hubs": { target: "http://localhost:8000", changeOrigin: true, ws: true },
    },
  },
  build: { outDir: "dist" },
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
  },
}));
