// Hook for calculating aggregates using a worker
import { useEffect, useRef, useState } from "react";
import type { WindowData } from "./useWindowData";

export interface Aggregates {
  min: number;
  max: number;
  average: number;
  variance: number;
  count: number;
}

export default function useAggregates(win?: WindowData | null): Aggregates | null {
  const [aggregates, setAggregates] = useState<Aggregates | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const reqIdRef = useRef(0);
  const externalWin = win ?? null;

  useEffect(() => {
    if (workerRef.current) return;
    try {
      const worker = new Worker(
        new URL("../worker/aggregatesWorker.ts", import.meta.url),
        { type: "module" },
      );
      workerRef.current = worker;

      worker.onmessage = (e) => {
        const { type, reqId, ...data } = e.data as any;
        if (type === "AGGREGATES_RESULT" && reqId === reqIdRef.current) {
          setAggregates({
            min: data.min,
            max: data.max,
            average: data.average,
            variance: data.variance,
            count: data.count,
          });
        }
      };

      worker.onerror = () => {
        // swallow
      };
    } catch {
      // swallow
    }

    return () => {
      // keep worker for lifecycle; released on unmount
    };
  }, []);

  useEffect(() => {
    const worker = workerRef.current;
    if (!worker) return;
    const ySrc = externalWin?.y;
    if (!ySrc || ySrc.length === 0) {
      setAggregates(null);
      return;
    }
    const reqId = ++reqIdRef.current;
    const y = new Float64Array(ySrc); // copy before transfer
    worker.postMessage(
      { type: "CALCULATE_AGGREGATES", data: y, reqId },
      [y.buffer],
    );
  }, [externalWin?.y]);

  return aggregates;
}
