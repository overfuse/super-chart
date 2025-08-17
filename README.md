# Super Chart – High‑volume Time‑series Viewer

### Live demo

- Try it here: [Super Chart demo](https://overfuse.github.io/super-chart/)
- An example dataset (`data_points.csv`) is included in the app:
  - Click “Load example dataset” on the page to use it without downloading
  - Or download it directly via the “Download example” link next to the upload

Super Chart is a React + TypeScript + Vite app that can ingest and interactively play back very large CSV time‑series datasets (tested up to 100,000,000 points). It uses Web Workers for parsing, windowed worker‑side downsampling, and a fast canvas chart (uPlot) to keep the UI responsive.

## Quick start

Prerequisites:

- Node.js 18+
- Yarn

Install dependencies and start dev server with HMR:

```bash
yarn install
yarn dev
```

Build and preview the production bundle:

```bash
yarn build
yarn preview
```

## How to use

1. Upload a CSV file with two numeric columns: `x,y` (no header required). The `x` column should be monotonically increasing and can represent either a timestamp (e.g., UNIX ms) or a simple sample index. The included example dataset uses incremental `x = 0..N-1`.
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
  (Aggregates are computed via `useAggregates` using `@koale/useworker`.)

Charting:

- `uPlot` is used for performance (thousands of points at 60fps). The `Chart` consumes a single `Window` input for both original and downsampled data. Min/max bands are rendered when `yMin/yMax` are provided (identity in local mode when not downsampling).

## Key decisions and justifications

- **Web Workers first**: CSV parsing and downsampling run off the main thread. This prevents UI stalls and allows smooth playback even on 100M‑row datasets.
- **Streaming parse (Papa Parse, chunk mode)**: Batched `chunk` callbacks with `fastMode` and `dynamicTyping: false` reduce per‑row overhead and speed up ingest.
- **Typed arrays everywhere**: `Float64Array` is used for raw and derived series. This minimizes GC pressure, improves locality, and enables fast transfers between threads.
- **Chunked storage in the CSV worker**: Data is kept in fixed‑size chunks (1M rows) to avoid giant allocations and to serve window reads efficiently.
- **Unified `Window` shape for the Chart**: Both original and downsampled data are represented as `{ x, yLine, yMin, yMax }`. The Chart consumes only this typed shape and internally builds `uPlot.AlignedData`.
- **Index‑aligned downsampling**: Bucket boundaries are aligned to absolute indices using an even stride. Small shifts in `S` don’t constantly re‑bucket, reducing jitter during playback.
- **IPC with request IDs**: Window requests (`READ_WINDOW`) and DS/aggregates responses include `reqId` so the UI only applies the latest response, avoiding race conditions.
- **Debounced window reads + edge retries**: Window reads are debounced to an animation frame, and near the end of the dataset the request is retried with a smaller window to ensure non‑empty results.
- **No `Row[]` in hot paths**: The external path never allocates `Row[]`; local mode uses identity windows when not downsampling. This reduces per‑frame allocations at large `N`.
- **Mode‑specific wrappers**: `LocalView` and `ExternalView` compose the right hooks for each mode and pass a single `Window` into the Chart, making behavior explicit and avoiding conditional hooks.
- **Vite base + asset paths**: The app builds with a non‑root base (`/super-chart/`) for GitHub Pages. Static assets (e.g., favicon, example CSV) resolve via `import.meta.env.BASE_URL`.
- **Testing strategy**: Vitest + RTL with worker and chart mocks validate store logic, windowing, downsampling invariants, aggregates correctness, and render stability.

## Performance characteristics

- 1M rows typically parse in < 1s locally.
- 100M rows: the streaming pipeline parses in under a minute on a modern machine; incremental downsampling enables smooth 40–60fps playback depending on CPU.
- Downsampling target ≈ width / ratio (default ratio=2). You can tune ratio to trade fidelity vs. speed.

## Building blocks and dependencies

- React 18, TypeScript, Vite
- Zustand – simple, scalable state store
- uPlot – fast canvas plotting
- Papa Parse – robust CSV streaming parser
- Tailwind (via `@tailwindcss/vite`) – utility CSS

## Testing

- Unit tests cover store logic, window API (`useWindowData`), downsampling (`useDownsample`, local), aggregates (`useAggregates`), and rendering (Chart, Aggregates).
- Vitest + React Testing Library with jsdom. Web Workers and `uplot-react` are mocked in `vitest.setup.ts`.

Run tests:

```bash
yarn test        # run test suite once
yarn test:watch  # watch mode during development
```

## Testing the assignment requirements

- Upload very large datasets (up to 100M). The UI remains responsive; the chart renders downsampled data, and playback is smooth.
- Windowing and playback: adjust `S`, `N`, `P`, `T`, toggle looping.
- Aggregates: min/max/avg/variance reflect the visible window in both small and large data modes.
- Error cases: empty/invalid CSV, partially invalid rows (skipped with warning), worker errors (badge shown).

## Troubleshooting

- “Something went wrong” badge: collected by the Error Boundary. Check console for details.
- Service Worker vs Web Worker: This app uses Web Workers (CSV/downsample). You won’t see Service Workers in DevTools.

## Future enhancements

- Swap typed array chunks to `SharedArrayBuffer` for zero‑copy views
- Multi‑worker parallel CSV parsing
- Optional gzip support (`.csv.gz`) with streaming inflate inside a worker
- Persist and resume datasets via IndexedDB if required
