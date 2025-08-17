// Hook for calculating aggregates using a worker
import { useEffect, useRef, useState } from "react";
import type { WindowData } from "../types/window";
import { useWorker } from "@koale/useworker";

export interface Aggregates {
  min: number;
  max: number;
  average: number;
  variance: number;
  count: number;
}

export default function useAggregates(win?: WindowData | null): Aggregates | null {
  const [aggregatesWorker] = useWorker(calculateAggregates);
  const [aggregates, setAggregates] = useState<Aggregates | null>(null);
  const isRunningRef = useRef(false);
  const queuedDataRef = useRef<Float64Array | null>(null);

  useEffect(() => {
    if (!win?.y) return;
    const run = (payload: Float64Array) => {
      isRunningRef.current = true;
      aggregatesWorker(payload)
        .then(({ min, max, average, variance, count }) => {
          setAggregates({ min, max, average, variance, count });
        })
        .catch(console.error)
        .finally(() => {
          isRunningRef.current = false;
          if (queuedDataRef.current) {
            const next = queuedDataRef.current;
            queuedDataRef.current = null;
            run(next);
          }
        });
    };

    const data = new Float64Array(win.y); // copy before transfer
    if (isRunningRef.current) {
      queuedDataRef.current = data; // coalesce to latest
      return;
    }
    run(data);
  }, [win?.y]);

  return aggregates;
}

type AggregatesRes = {
  min: number;
  max: number;
  average: number;
  variance: number;
  count: number;
};

// Efficient aggregates calculation
export function calculateAggregates(data: Float64Array): AggregatesRes {
  if (data.length === 0) {
    return {
      min: 0,
      max: 0,
      average: 0,
      variance: 0,
      count: 0,
    };
  }

  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let validCount = 0;

  // First pass: min, max, sum, count
  for (let i = 0; i < data.length; i++) {
    const value = data[i];
    if (Number.isFinite(value)) {
      validCount++;
      sum += value;
      if (value < min) min = value;
      if (value > max) max = value;
    }
  }

  if (validCount === 0) {
    return {
      min: 0,
      max: 0,
      average: 0,
      variance: 0,
      count: 0,
    };
  }

  const average = sum / validCount;

  // Second pass: variance
  let sumSquaredDiffs = 0;
  for (let i = 0; i < data.length; i++) {
    const value = data[i];
    if (Number.isFinite(value)) {
      const diff = value - average;
      sumSquaredDiffs += diff * diff;
    }
  }

  const variance = validCount > 1 ? sumSquaredDiffs / validCount : 0;

  return {
    min,
    max,
    average,
    variance,
    count: validCount,
  };
}
