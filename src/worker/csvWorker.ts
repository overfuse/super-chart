import Papa from "papaparse";

// Local Row type no longer used in simplified worker

// Simple chunked storage in memory-backed array buffers.
// For 100M points, we cannot keep JS arrays; we store in fixed-size typed array chunks.
const CHUNK_SIZE = 1_000_000; // 1M rows per chunk (~16MB for two Float64 values)
let xChunks: Float64Array[] = [];
let yChunks: Float64Array[] = [];
let totalRows = 0;
// Downsample incremental cache
// (downsampling cache removed in simplified design)

function resetStorage() {
  xChunks = [];
  yChunks = [];
  totalRows = 0;
}

function ensureCapacity(nextIndex: number) {
  while (nextIndex >= xChunks.length * CHUNK_SIZE) {
    // allocate ArrayBuffer-backed chunks
    xChunks.push(new Float64Array(CHUNK_SIZE));
    yChunks.push(new Float64Array(CHUNK_SIZE));
  }
}

function writeRow(i: number, x: number, y: number) {
  ensureCapacity(i);
  const chunkIdx = Math.floor(i / CHUNK_SIZE);
  const offset = i % CHUNK_SIZE;
  xChunks[chunkIdx][offset] = x;
  yChunks[chunkIdx][offset] = y;
}

// helper removed

import type { CsvInboundMessage, CsvReadWindowReq } from "../types/ipc";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isReadWindowMessage(msg: unknown): msg is CsvReadWindowReq {
  if (!isObject(msg)) return false;
  const { type, start, count, reqId } = msg as Partial<CsvReadWindowReq> & { type?: unknown };
  return (
    type === "READ_WINDOW" &&
    typeof start === "number" &&
    Number.isFinite(start) &&
    typeof count === "number" &&
    Number.isFinite(count) &&
    typeof reqId === "number" &&
    Number.isFinite(reqId)
  );
}

self.onmessage = (e: MessageEvent<CsvInboundMessage>) => {
  const msgUnknown: unknown = e.data as unknown;
  if (isReadWindowMessage(msgUnknown)) {
    const { start: s0, count: c0, reqId: r0 } = msgUnknown as CsvReadWindowReq;
    const start = s0 | 0;
    const count = c0 | 0;
    const reqId = r0 | 0;
    const end = Math.min(totalRows, start + count);
    const len = Math.max(0, end - start);
    const x = new Float64Array(len);
    const y = new Float64Array(len);
    for (let i = 0; i < len; i++) {
      const idx = start + i;
      const cIdx = Math.floor(idx / CHUNK_SIZE);
      const off = idx % CHUNK_SIZE;
      x[i] = xChunks[cIdx][off];
      y[i] = yChunks[cIdx][off];
    }
    postMessage({ type: "CSV_WINDOW", x, y, reqId }, [x.buffer, y.buffer]);
    return;
  }

  // (Downsampling and aggregates are handled outside this worker)
  if (isObject(msgUnknown) && (msgUnknown as { type?: unknown }).type === "CSV_RELEASE") {
    resetStorage();
    postMessage({ type: "CSV_RELEASED" });
    return;
  }

  // Only handle File uploads here
  if (!(msgUnknown instanceof File)) return;
  const file = msgUnknown;

  // Basic sanity checks before parsing
  if (file.size === 0) {
    postMessage({ type: "CSV_ERROR", message: "The selected file is empty." });
    return;
  }

  resetStorage();
  let invalidRowCount = 0;
  let i = 0;
  const t0 = performance.now();
  try {
    Papa.parse(file, {
      header: false,
      dynamicTyping: false,
      fastMode: true,
      skipEmptyLines: true,
      worker: false,
      chunkSize: 8 * 1024 * 1024,
      chunk: (results: { data: unknown[] }) => {
        const dataRows = results.data;
        for (let r = 0; r < dataRows.length; r++) {
          const row = dataRows[r] as unknown;
          if (!Array.isArray(row) || row.length < 2) {
            invalidRowCount++;
            continue;
          }
          const xNum = +row[0];
          const yNum = +row[1];
          if (!Number.isFinite(xNum) || !Number.isFinite(yNum)) {
            invalidRowCount++;
            continue;
          }
          writeRow(i++, xNum, yNum);
        }
      },
      error: (error: unknown) => {
        postMessage({
          type: "CSV_ERROR",
          message: (error as Error)?.message || "Failed to parse CSV file.",
        });
      },
      complete: (results: { errors?: { message: string }[] }) => {
        totalRows = i;
        const elapsed = performance.now() - t0;
        if (totalRows === 0) {
          const msg =
            results?.errors && results.errors.length > 0
              ? `No valid rows parsed. First error: ${results.errors[0].message}`
              : "No valid rows found in the CSV.";
          postMessage({ type: "CSV_ERROR", message: msg });
          return;
        }
        postMessage({
          type: "CSV_READY",
          totalRows,
          elapsedMs: elapsed,
          warning:
            invalidRowCount > 0
              ? `${invalidRowCount} row(s) skipped due to invalid data.`
              : undefined,
        });
      },
    });
  } catch (err) {
    postMessage({
      type: "CSV_ERROR",
      message: (err as Error)?.message || "Unexpected error while parsing.",
    });
  }
};
