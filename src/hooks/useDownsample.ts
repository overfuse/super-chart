import { useEffect, useRef, useState } from "react";
import type { WindowData } from "./useWindowData";
import type { Window as WindowAgg } from "../types/window";

export type Agg = WindowAgg;

type AggRes = Agg & { type: "AGG_RES"; reqId: number; version: number };

type AggReq = {
  type: "AGG_REQ";
  x: Float64Array;
  y: Float64Array;
  threshold: number; // desired maximum number of points
  stride: number; // index-aligned bucket size
  startIndex: number; // absolute start index (S) of the window
  reqId: number;
  version: number;
};

export default function useDownsample(
  win: WindowData | null | undefined,
  threshold: number,
  startIndex: number,
): Agg | null {
  const [agg, setAgg] = useState<Agg | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const reqIdRef = useRef(0);
  const versionRef = useRef(0);

  useEffect(() => {
    const w = new Worker(
      new URL("../worker/downsampleWorker.ts", import.meta.url),
      { type: "module" },
    );
    workerRef.current = w;
    w.onmessage = (e: MessageEvent<AggRes>) => {
      const msg = e.data;
      if (msg.type !== "AGG_RES") return;
      if (
        msg.reqId === reqIdRef.current &&
        msg.version === versionRef.current
      ) {
        setAgg({ x: msg.x, yLine: msg.yLine, yMin: msg.yMin, yMax: msg.yMax });
      }
    };
    return () => {
      w.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const w = workerRef.current;
    if (!w) return;
    const xSrc = win?.x ?? new Float64Array(0);
    const ySrc = win?.y ?? new Float64Array(0);
    const len = Math.min(xSrc.length, ySrc.length);
    if (len === 0) {
      const empty = new Float64Array(0);
      setAgg({ x: empty, yLine: empty, yMin: empty, yMax: empty });
      return;
    }

    // Copy before posting to worker
    const x = new Float64Array(xSrc);
    const y = new Float64Array(ySrc);

    const reqId = ++reqIdRef.current;
    const version = ++versionRef.current;
    const t = Math.max(3, threshold | 0);
    // Stable stride anchored to absolute indices to reduce jitter
    // Use a slightly hysteretic stride to reduce changes when len or t nudges
    // Anchor stride to a small multiple to avoid frequent boundary shifts
    const rawStride = Math.max(1, Math.ceil(len / t));
    const stride = Math.max(1, Math.round(rawStride / 2) * 2); // even stride for stability
    const msg: AggReq = {
      type: "AGG_REQ",
      x,
      y,
      threshold: t,
      stride,
      startIndex,
      reqId,
      version,
    };
    w.postMessage(msg, [x.buffer, y.buffer]);
  }, [win?.x, win?.y, threshold, startIndex]);

  return agg;
}
