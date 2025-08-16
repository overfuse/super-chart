import { type ChangeEvent, useRef } from "react";
import { useStore } from "../store";

export default function FileUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const csvProcessMs = useStore((s) => s.csvProcessMs);
  const totalRows = useStore((s) => s.useExternalStorage ? s.totalRows : (s.x ? s.x.length : 0));
  const csvProcessing = useStore((s) => s.csvProcessing);
  const csvError = useStore((s) => s.csvError);

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    window.postMessage({ type: "CSV_FILE", file });
  };

  return (
    <div>
      <label className="block mb-2 font-medium">
        Upload CSV (x,y):
      </label>
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          className="border p-2 rounded"
        />
        {csvProcessing && (
          <div className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-1 animate-pulse">
            Processing...
          </div>
        )}
        {!csvProcessing && csvError && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
            Something went wrong
          </div>
        )}
        {!csvProcessing && !csvError && totalRows > 0 && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
            Processed {totalRows.toLocaleString()} rows
            {csvProcessMs > 0 && (csvProcessMs >= 1000
              ? ` in ${(csvProcessMs / 1000).toFixed(2)} s`
              : ` in ${Math.round(csvProcessMs).toLocaleString()} ms`)}
          </div>
        )}
      </div>
    </div>
  );
}
