import { useEffect } from "react";
import { useStore } from "../store";
import { getCSVWorker } from "../worker/getCSVWorker";

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
      const payload = e.data as import("../types/ipc").CsvOutboundMessage;
      // CSV_WINDOW is handled by hooks that request windows (useWindowRows/useDownsampleExternal)
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

    const listener = (e: MessageEvent) => {
      if (e.data?.type === "CSV_FILE") {
        // Release previous dataset first to free memory
        try {
          worker.postMessage({ type: "CSV_RELEASE" });
        } catch {}
        // Reset state for new dataset
        setUseExternalStorage(false);
        setXY(null, null);
        setTotalRows(0);
        setCsvProcessMs(0);
        setCsvError(null);
        setCsvProcessing(true);
        // Start parsing
        worker.postMessage(e.data.file as File);
      }
    };

    window.addEventListener("message", listener);
    return () => {
      window.removeEventListener("message", listener);
      worker.removeEventListener("message", onMessage);
      try {
        worker.postMessage({ type: "CSV_RELEASE" });
      } catch {}
    };
  }, [setUseExternalStorage, setTotalRows, setCsvProcessMs, setCsvProcessing, setCsvError, bumpDataVersion, setXY]);
}
