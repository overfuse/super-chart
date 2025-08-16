# Super Chart – High‑volume Time‑series Viewer

Super Chart is a React + TypeScript + Vite app that can ingest and interactively play back very large CSV time‑series datasets (tested up to 100,000,000 points). It uses Web Workers for parsing, windowed worker‑side downsampling, and a fast canvas chart (uPlot) to keep the UI responsive.

## Quick start

Prerequisites:
- Node.js 18+
- pnpm, npm or yarn

Install dependencies:
```bash
npm install
# or
yarn
# or
pnpm i
```

Run in development (with HMR):
```bash
npm run dev
```
Open the URL printed in the terminal. Dev server sends COOP/COEP headers to enable SharedArrayBuffer if needed.

Build production bundle:
```bash
npm run build
```

Preview the production build locally:
```bash
npm run preview
```

## How to use
1. Upload a CSV file with two columns: `timestamp,value` (no header required).
2. Once parsed, controls appear: start index `S`, window size `N`, step `P`, interval `T`, loop toggle, and downsample ratio.
3. Press Start to play through the window. Aggregates are computed for the visible window.

Notes:
- For small/medium files, data is kept in memory. For very large files, parsing streams into worker‑managed typed array chunks and the UI requests downsampled windows from the worker.
- Invalid rows are skipped; you’ll see a status pill next to the file input. Processing time is shown in ms/s.

## Architecture overview

Top‑level components and hooks:
- `App` – Wires everything together, decides whether to use in‑memory or external (worker) data path, and keeps chart width fixed at 1000px for stable downsampling. Mounts one of two wrappers based on mode:
  - `LocalView` – builds an identity Window from local data or uses local downsampling; renders `Chart` + `Aggregates` together.
  - `ExternalView` – fetches window from the CSV worker, downsampling in a dedicated worker; renders `Chart` + `Aggregates` together.
- `FileUpload` – Posts selected file to the CSV worker; shows progress, success/error badges, and timing.
- `Controls` – Playback and window controls backed by a zustand store.
- `Chart` – uPlot canvas chart. Consumes a single typed input `Window` (x, yLine, yMin, yMax) and internally builds `uPlot.AlignedData`. No `Row[]` path anymore.
- `Aggregates` + `useAggregates` – Computes min/max/avg/variance for the current window given typed arrays.

State management:
- `src/store.ts` (zustand) – Local data is stored as typed arrays: `x: Float64Array | null`, `y: Float64Array | null`. Also holds window `S/N`, playback `P/T`, loop, downsample ratio, dataset meta (`useExternalStorage`, `totalRows`, processing state), and a `dataVersion` bump to invalidate caches when new data loads.

Workers:
- `csvWorker.ts` – Streaming CSV parsing (Papa Parse chunk mode). Stores data in chunked `Float64Array`s (X/Y) and exposes:
  - `CSV_READY { totalRows, elapsedMs }` after parse
  - `READ_WINDOW { start, count, reqId }` → returns typed arrays with `CSV_WINDOW { x, y, reqId }`
  - `CSV_RELEASE` → frees chunked buffers
- `downsampleWorker.ts` – Downsamples a provided window (typed arrays), returning a `Window` shape.
- `aggregatesWorker.ts` – Computes aggregates for a provided `Float64Array` (y only).

Charting:
- `uPlot` is used for performance (thousands of points at 60fps). The `Chart` consumes a single `Window` input for both original and downsampled data. Min/max bands are rendered when `yMin/yMax` are provided (identity in local mode when not downsampling).

## Key decisions and justifications

- **Worker‑first pipeline for large files**: Parsing and downsampling run in workers to keep the main thread free. This guarantees a responsive UI even when loading 100M rows.
- **Streaming parse (Papa Parse chunk mode)**: Switching from per‑row `step` to batched `chunk` with `fastMode` and `dynamicTyping: false` significantly speeds up CSV ingest by reducing callback overhead and dynamic type checks.
- **Typed array chunking**: `Float64Array` storage (chunk size 1M) balances memory locality and avoids massive single allocations. The worker serves windows directly from chunks.
- **Index‑aligned, incremental downsampling**: Buckets aligned to absolute indices; during playback, only tail buckets are recomputed when `S` advances by full bucket strides. This greatly reduces worker compute per frame and improves FPS.
- **Unified data shape (`Window`)**: Both local and external paths produce the same `Window` shape (`x, yLine, yMin, yMax`). The chart is agnostic to the source, simplifying rendering and avoiding `Row[]` allocations.
- **Typed arrays end‑to‑end**: In local mode, the store uses typed arrays; in external mode, workers return typed arrays. Conversions to `Row[]` are eliminated from performance‑critical paths.
- **Error handling**: Error Boundary at the app root surfaces a non‑blocking badge if something goes wrong. Upload status shows parse timing, warnings, and errors inline next to the file input.
- **Deterministic chart width (1000px)**: Stable width simplifies downsampling thresholding and improves cache hit rates in the worker by avoiding constant recomputation.

## Performance characteristics
- 1M rows typically parse in < 1s locally.
- 100M rows: the streaming pipeline parses in under a minute on a modern machine; incremental downsampling enables smooth 40–60fps playback depending on CPU.
- Downsampling target ≈ width / ratio (default ratio=2). You can tune ratio to trade fidelity vs. speed.

## SharedArrayBuffer readiness
The dev server is configured with COOP/COEP headers, enabling cross‑origin isolation. This allows adopting `SharedArrayBuffer` in the future to further reduce copies between workers and the UI (e.g., sharing read‑only views to downsampled arrays). If you deploy behind a proxy/CDN, ensure these headers are preserved.

## Building blocks and dependencies
- React 18, TypeScript, Vite
- Zustand – simple, scalable state store
- uPlot – fast canvas plotting
- Papa Parse – robust CSV streaming parser
- Tailwind (via `@tailwindcss/vite`) – utility CSS

Dev server headers (Vite):
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

## Testing
- Unit tests cover store logic, window API (`useWindowData`), downsampling (`useDownsample`, local), aggregates (`useAggregates`), and rendering (Chart, Aggregates).
- Vitest + React Testing Library with jsdom. Web Workers and `uplot-react` are mocked in `vitest.setup.ts`.

## Testing the assignment requirements
- Upload very large datasets (up to 100M). The UI remains responsive; the chart renders downsampled data, and playback is smooth.
- Windowing and playback: adjust `S`, `N`, `P`, `T`, toggle looping.
- Aggregates: min/max/avg/variance reflect the visible window in both small and large data modes.
- Error cases: empty/invalid CSV, partially invalid rows (skipped with warning), worker errors (badge shown).

## Troubleshooting
- “Something went wrong” badge: collected by the Error Boundary. Check console for details.
- Service Worker vs Web Worker: This app uses Web Workers (CSV/aggregates/downsample). You won’t see Service Workers in DevTools.
- If SharedArrayBuffer is blocked: ensure COOP/COEP headers are present in your environment.

## Scripts
- `dev` – start dev server with HMR
- `build` – type‑check and build for production
- `preview` – preview built app locally

## Future enhancements
- Swap typed array chunks to `SharedArrayBuffer` for zero‑copy views
- Multi‑worker parallel CSV parsing
- Optional gzip support (`.csv.gz`) with streaming inflate inside a worker
- Persist and resume datasets via IndexedDB if required