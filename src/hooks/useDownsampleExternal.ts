import { useEffect, useRef, useState } from "react";
import type { Agg } from "./useDownsample";
import type { WindowData } from "./useWindowData";

export default function useDownsampleExternal(
  startIndex: number,
  windowSize: number,
  threshold: number,
  dataVersion?: number,
  prefetchedWin?: WindowData | null,
): Agg | null {
  const [agg, setAgg] = useState<Agg | null>(null);
  const reqIdRef = useRef(0);
  const lastReqRef = useRef({ startIndex: 0, windowSize: 0, threshold: 0 });
  const workerRef = useRef<Worker | null>(null);
  const versionRef = useRef(0);
  const win = prefetchedWin ?? null;

  // Create a dedicated downsample worker once
  useEffect(() => {
    const w = new Worker(new URL("../worker/downsampleWorker.ts", import.meta.url), { type: "module" });
    workerRef.current = w;
    const onMessage = (e: MessageEvent) => {
      const msg = e.data as { type: string; reqId: number; version: number } & Agg;
      if (msg.type !== "AGG_RES") return;
      if (msg.reqId !== reqIdRef.current || msg.version !== versionRef.current) return;
      // Ignore empty results to avoid charts showing 0 points mid-playback
      if (!msg.x || msg.x.length === 0) return;
      setAgg({ x: msg.x, yLine: msg.yLine, yMin: msg.yMin, yMax: msg.yMax });
    };
    w.addEventListener("message", onMessage);
    return () => {
      w.removeEventListener("message", onMessage);
      w.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const s = Number.isFinite(startIndex) ? startIndex : 0;
    const n = Number.isFinite(windowSize) && windowSize > 0 ? windowSize : 1;
    const t = Math.max(3, Number.isFinite(threshold) ? Math.floor(threshold) : 3);
    const w = workerRef.current;
    if (!w) return;

    const reqId = ++reqIdRef.current;
    const version = ++versionRef.current;
    lastReqRef.current = { startIndex: s, windowSize: n, threshold: t };

    // Use already-fetched window from useExternalWindow
    const x = win?.x ?? new Float64Array(0);
    const y = win?.y ?? new Float64Array(0);
    if (x.length === 0 || y.length === 0) {
      const empty = new Float64Array(0);
      setAgg({ x: empty, yLine: empty, yMin: empty, yMax: empty });
      return;
    }
    const rawStride = Math.max(1, Math.ceil(n / t));
    const stride = Math.max(1, Math.round(rawStride / 2) * 2);
    // Important: copy before posting to avoid detaching buffers used elsewhere (e.g., aggregates)
    const xCopy = new Float64Array(x);
    const yCopy = new Float64Array(y);
    const msg = {
      type: "AGG_REQ",
      x: xCopy,
      y: yCopy,
      threshold: t,
      stride,
      startIndex: s,
      reqId,
      version,
    } as const;
    // Transfer the copies; originals remain usable for other consumers
    w.postMessage(msg, [xCopy.buffer, yCopy.buffer]);
  }, [startIndex, windowSize, threshold, dataVersion, win?.x, win?.y]);

  return agg;
}


