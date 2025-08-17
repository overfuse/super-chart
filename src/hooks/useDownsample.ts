import { useEffect, useMemo, useRef, useState } from "react";
import type { WindowData, ChartWindow } from "../types/window";
import { wrap, releaseProxy } from "comlink";

export interface DownsampleWorkerApi {
  downsample(
    x: Float64Array,
    y: Float64Array,
    threshold: number,
    stride: number,
    startIndex: number,
  ): Promise<ChartWindow>;
}

function downsampleWorkerFactory() {
  return new Worker(new URL("../worker/downsampleWorker.ts", import.meta.url), {
    type: "module",
  });
}

export default function useDownsample(
  win: WindowData | null | undefined,
  threshold: number,
  startIndex: number,
  workerFactory: () => Worker = downsampleWorkerFactory,
): ChartWindow | null {
  const [agg, setAgg] = useState<ChartWindow | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const apiRef = useRef<DownsampleWorkerApi | null>(null);

  // Create and wrap worker once
  useEffect(() => {
    const worker = workerFactory();
    workerRef.current = worker;
    apiRef.current = wrap<DownsampleWorkerApi>(worker);
    return () => {
      const api = apiRef.current as unknown as { [releaseProxy]?: () => void } | null;
      if (api && api[releaseProxy]) api[releaseProxy]!();
      if (workerRef.current) workerRef.current.terminate();
      workerRef.current = null;
      apiRef.current = null;
    };
  }, [workerFactory]);

  const len = useMemo(() => Math.min(win?.x?.length ?? 0, win?.y?.length ?? 0), [win?.x, win?.y]);

  useEffect(() => {
    const api = apiRef.current;
    const n = Math.max(1, len);
    const t = Math.max(3, threshold | 0);
    if (n === 0 || !win) {
      const empty = new Float64Array(0);
      setAgg({ x: empty, yLine: empty, yMin: empty, yMax: empty });
      return;
    }
    const rawStride = Math.max(1, Math.ceil(n / t));
    const stride = Math.max(1, Math.round(rawStride / 2) * 2);
    const xCopy = new Float64Array(win!.x);
    const yCopy = new Float64Array(win!.y);
    if (!api) return;
    api
      .downsample(xCopy, yCopy, t, stride, startIndex)
      .then((res) => setAgg(res))
      .catch(console.error);
  }, [len, threshold, startIndex]);

  return agg;
}
