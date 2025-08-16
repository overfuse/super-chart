import { type ChangeEvent, useRef, useState } from "react";
import { useStore } from "../store";

export default function FileUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [realUploaded, setRealUploaded] = useState(false);
  const csvProcessMs = useStore((s) => s.csvProcessMs);
  const totalRows = useStore((s) => (s.useExternalStorage ? s.totalRows : s.x ? s.x.length : 0));
  const csvProcessing = useStore((s) => s.csvProcessing);
  const csvError = useStore((s) => s.csvError);

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRealUploaded(true);
    window.postMessage({ type: "CSV_FILE", file });
  };

  return (
    <div>
      <label className="block mb-2 font-medium">Upload CSV (x,y):</label>
      <div className="flex items-start gap-3 flex-wrap">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          className="border p-2 rounded"
        />
        {!realUploaded && (
          <div className="flex flex-col items-start">
            <button
              type="button"
              className="text-sm px-3 py-2 rounded border border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
              onClick={async () => {
                const url = `${import.meta.env.BASE_URL}data_points.csv`;
                const res = await fetch(url);
                const blob = await res.blob();
                const file = new File([blob], "data_points.csv", { type: "text/csv" });
                window.postMessage({ type: "CSV_FILE", file });
              }}
            >
              Load example dataset
            </button>
            <a
              href={`${import.meta.env.BASE_URL}data_points.csv`}
              download
              className="text-xs text-indigo-600 hover:text-indigo-800 underline mt-1"
            >
              Download example
            </a>
          </div>
        )}
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
            {csvProcessMs > 0 &&
              (csvProcessMs >= 1000
                ? ` in ${(csvProcessMs / 1000).toFixed(2)} s`
                : ` in ${Math.round(csvProcessMs).toLocaleString()} ms`)}
          </div>
        )}
      </div>
    </div>
  );
}
