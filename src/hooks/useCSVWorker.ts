import { useEffect } from "react";
import { useStore } from "../store";
import { getCSVWorker } from "../worker/getCSVWorker";
import type { CsvOutboundMessage } from "../types/ipc";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCsvMessage(msg: unknown): msg is CsvOutboundMessage {
  return isObject(msg) && typeof (msg as { type?: unknown }).type === "string";
}

export default function useCSVWorker() {
  const setUseExternalStorage = useStore((s) => s.setUseExternalStorage);
  const setTotalRows = useStore((s) => s.setTotalRows);
  const setCsvProcessMs = useStore((s) => s.setCsvProcessMs);
  const setCsvProcessing = useStore((s) => s.setCsvProcessing);
  const setCsvError = useStore((s) => s.setCsvError);
  const setXY = useStore((s) => s.setXY);
  const bumpDataVersion = useStore((s) => s.bumpDataVersion as () => void);

  useEffect(() => {
    const worker = getCSVWorker();

    const onMessage = (e: MessageEvent) => {
      const payloadUnknown: unknown = e.data as unknown;
      if (!isCsvMessage(payloadUnknown)) return;
      const payload = payloadUnknown as CsvOutboundMessage;
      // CSV_WINDOW is handled by hooks that request windows (useChartWindow/useDownsampleExternal)
      if (payload.type === "CSV_WINDOW") return;
      if (payload.type === "CSV_READY") {
        setXY(null, null);
        setUseExternalStorage(true);
        setTotalRows(payload.totalRows ?? 0);
        if (typeof payload.elapsedMs === "number") setCsvProcessMs(payload.elapsedMs);
        setCsvProcessing(false);
        setCsvError(null);
        bumpDataVersion();
      }
      if (payload.type === "CSV_ERROR") {
        console.error("CSV parse error:", payload.message);
        setUseExternalStorage(false);
        setXY(null, null);
        setCsvProcessing(false);
        setCsvError(payload.message || "Failed to process CSV file");
        if (typeof window !== "undefined") {
          // no alert; surface inline error instead
        }
      }
    };

    worker.addEventListener("message", onMessage);

    return () => {
      worker.removeEventListener("message", onMessage);
      try {
        worker.postMessage({ type: "CSV_RELEASE" });
      } catch {}
    };
  }, [
    setUseExternalStorage,
    setTotalRows,
    setCsvProcessMs,
    setCsvProcessing,
    setCsvError,
    bumpDataVersion,
    setXY,
  ]);
}
