import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: '/super-chart/',
  plugins: [react()],
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          uplot: ['uplot'],
          papaparse: ['papaparse'],
        },
      },
    },
  },
  esbuild: {
    drop: ['console', 'debugger'],
  },
  worker: {
    format: 'es',
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    css: true,
  },
});


