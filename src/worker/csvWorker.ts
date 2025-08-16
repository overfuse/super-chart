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

import type { CsvInboundMessage } from "../types/ipc";

self.onmessage = (e: MessageEvent<CsvInboundMessage>) => {
	const msg = e.data as CsvInboundMessage;
	if (msg && (msg as { type?: string }).type === "READ_WINDOW") {
		const m = msg as import("../types/ipc").CsvReadWindowReq;
		const start = m.start | 0;
		const count = m.count | 0;
		const reqId = m.reqId | 0;
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
	// csvWorker no longer handles downsample or csv aggregates – defer to dedicated workers
	if (msg && (msg as { type?: string }).type === "CSV_AGG_REQ") {
		const m = msg as import("../types/ipc").CsvAggReq;
		const start = m.start | 0;
		const count = m.count | 0;
		const reqId = m.reqId | 0;
		const end = Math.min(totalRows, start + count);
		let min = Infinity;
		let max = -Infinity;
		let sum = 0;
		let valid = 0;
		for (let j = start; j < end; j++) {
			const cIdx = Math.floor(j / CHUNK_SIZE);
			const off = j % CHUNK_SIZE;
			const v = yChunks[cIdx][off];
			if (Number.isFinite(v)) {
				valid++;
				sum += v;
				if (v < min) min = v;
				if (v > max) max = v;
			}
		}
		let variance = 0;
		if (valid > 0) {
			const avg = sum / valid;
			let sumSq = 0;
			for (let j = start; j < end; j++) {
				const cIdx = Math.floor(j / CHUNK_SIZE);
				const off = j % CHUNK_SIZE;
				const v = yChunks[cIdx][off];
				if (Number.isFinite(v)) {
					const d = v - avg;
					sumSq += d * d;
				}
			}
			variance = valid > 1 ? sumSq / valid : 0;
			postMessage({ type: "CSV_AGG_RES", min, max, average: avg, variance, count: valid, reqId });
		} else {
			postMessage({ type: "CSV_AGG_RES", min: 0, max: 0, average: 0, variance: 0, count: 0, reqId });
		}
		return;
	}
	// (Downsampling removed from csvWorker)
	if (msg && (msg as { type?: string }).type === "CSV_RELEASE") {
		resetStorage();
		postMessage({ type: "CSV_RELEASED" });
		return;
	}

	// Only handle File uploads here
	if (!(msg instanceof File)) return;
	const file = msg as File;

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
				postMessage({ type: "CSV_READY", totalRows, elapsedMs: elapsed, warning: invalidRowCount > 0 ? `${invalidRowCount} row(s) skipped due to invalid data.` : undefined });
			},
		});
	} catch (err) {
		postMessage({ type: "CSV_ERROR", message: (err as Error)?.message || "Unexpected error while parsing." });
	}
};
