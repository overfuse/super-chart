import "@testing-library/jest-dom";

// Mock Web Workers for tests (jsdom doesn't provide Worker)
class MockWorker {
  onmessage: ((e: MessageEvent<any>) => void) | null = null;
  private listeners = new Set<(e: MessageEvent<any>) => void>();
  constructor(_url?: string | URL, _opts?: any) {}
  postMessage(msg: any) {
    setTimeout(() => {
      if (msg?.type === "AGG_REQ") {
        const { x, y, threshold, stride, startIndex, reqId, version } = msg as any;
        const n = x.length;
        let res;
        if (n <= threshold) {
          res = { x: x.slice(), yLine: y.slice(), yMin: y.slice(), yMax: y.slice() };
        } else {
          const buckets = Math.min(threshold, Math.ceil(n / Math.max(1, stride)));
          const outX = new Float64Array(buckets);
          const outY = new Float64Array(buckets);
          const outMin = new Float64Array(buckets);
          const outMax = new Float64Array(buckets);
          const baseAligned = Math.floor(startIndex / Math.max(1, stride)) * Math.max(1, stride);
          for (let i = 0; i < buckets; i++) {
            const bucketStartAbs = baseAligned + i * Math.max(1, stride);
            const localStart = Math.max(0, bucketStartAbs - startIndex);
            const localEnd = Math.min(n, localStart + Math.max(1, stride));
            const start = localStart;
            const end = localEnd;
            const bucketLen = Math.max(1, end - start);
            const midIdx = start + Math.floor(bucketLen / 2);
            outX[i] = x[midIdx];
            let sum = 0, count = 0;
            let mn = y[start], mx = y[start];
            for (let j = start; j < end; j++) {
              const v = y[j];
              if (Number.isFinite(v)) {
                sum += v; count++;
                if (v < mn) mn = v;
                if (v > mx) mx = v;
              }
            }
            outMin[i] = mn; outMax[i] = mx; outY[i] = count > 0 ? sum / count : y[start];
          }
          res = { x: outX, yLine: outY, yMin: outMin, yMax: outMax };
        }
        const evt = { data: { type: "AGG_RES", ...res, reqId, version } } as MessageEvent<any>;
        this.onmessage?.(evt);
        this.listeners.forEach((fn) => fn(evt));
      } else if (msg?.type === "CALCULATE_AGGREGATES") {
        const arr: Float64Array = msg.data;
        let min = Infinity, max = -Infinity, sum = 0, count = 0;
        for (let i = 0; i < arr.length; i++) {
          const v = arr[i];
          if (Number.isFinite(v)) { min = Math.min(min, v); max = Math.max(max, v); sum += v; count++; }
        }
        const avg = count ? sum / count : 0;
        let sumSq = 0;
        for (let i = 0; i < arr.length; i++) {
          const v = arr[i];
          if (Number.isFinite(v)) { const d = v - avg; sumSq += d * d; }
        }
        const variance = count > 1 ? sumSq / count : 0;
        const evt = { data: { type: "AGGREGATES_RESULT", min, max, average: avg, variance, count, reqId: msg.reqId } } as MessageEvent<any>;
        this.onmessage?.(evt);
        this.listeners.forEach((fn) => fn(evt));
      }
    }, 0);
  }
  addEventListener(type: string, fn: (e: MessageEvent<any>) => void) {
    if (type === "message") this.listeners.add(fn);
  }
  removeEventListener(_type: string, fn: (e: MessageEvent<any>) => void) {
    this.listeners.delete(fn);
  }
  terminate() {}
}

// @ts-expect-error attach to global for jsdom
globalThis.Worker = MockWorker as any;

// Mock uplot-react to avoid Canvas usage in jsdom
import { vi } from "vitest";
import * as React from "react";
vi.mock("uplot-react", () => ({
  default: (_props: any) => React.createElement("div", { "data-testid": "uplot" }),
}));

// Provide a basic matchMedia mock for uPlot in jsdom
if (!("matchMedia" in globalThis)) {
  // @ts-expect-error jsdom
  globalThis.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}



