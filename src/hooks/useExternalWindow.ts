import { useEffect, useRef, useState } from "react";
import { getCSVWorker } from "../worker/getCSVWorker";

export interface ExternalWindow {
  x: Float64Array;
  y: Float64Array;
}

export default function useExternalWindow(
  startIndex: number,
  windowSize: number,
  version?: number,
): ExternalWindow | null {
  const [win, setWin] = useState<ExternalWindow | null>(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    const s = Number.isFinite(startIndex) ? startIndex : 0;
    const n = Number.isFinite(windowSize) && windowSize > 0 ? windowSize : 1;

    const worker = getCSVWorker();
    const reqId = ++reqIdRef.current;

    let cancelled = false;

    const handle = requestAnimationFrame(() => {
      const onMsg = (e: MessageEvent) => {
        const msg = e.data as any;
        if (msg?.type !== "CSV_WINDOW" || msg.reqId !== reqId) return;
        worker.removeEventListener("message", onMsg);
        if (cancelled) return;
        const { x, y } = msg as ExternalWindow & { reqId: number };
        if (x.length === 0 && y.length === 0 && n > 1) {
          // Retry with half window near dataset end
          const reqId2 = ++reqIdRef.current;
          const onMsg2 = (e2: MessageEvent) => {
            const m2 = e2.data as any;
            if (m2?.type !== "CSV_WINDOW" || m2.reqId !== reqId2) return;
            worker.removeEventListener("message", onMsg2);
            if (cancelled) return;
            const { x: x2, y: y2 } = m2 as ExternalWindow & { reqId: number };
            setWin({ x: x2, y: y2 });
          };
          worker.addEventListener("message", onMsg2);
          worker.postMessage({ type: "READ_WINDOW", start: s, count: Math.max(1, Math.floor(n / 2)), reqId: reqId2 });
          return;
        }
        setWin({ x, y });
      };
      worker.addEventListener("message", onMsg);
      worker.postMessage({ type: "READ_WINDOW", start: s, count: n, reqId });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(handle);
    };
  }, [startIndex, windowSize, version]);

  return win;
}


