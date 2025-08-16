import { useState, useRef, useMemo } from "react";
import type uPlot from "uplot";
import UplotReact from "uplot-react";
import "uplot/dist/uPlot.min.css";
import type { Window } from "../types/window";
interface Props { data: Window | null }

export default function Chart({ data }: Props) {
  const [fps, setFps] = useState(0);
  const [lastMs, setLastMs] = useState<number | null>(null);
  const chartWidth = 1000;
  const lastDrawRef = useRef<number | null>(null);
  const emaFpsRef = useRef<number | null>(null);
  const drawStartRef = useRef<number>(0);
  const pendingUpdateRef = useRef(false);
  const nextFpsRef = useRef<number>(0);
  const nextMsRef = useRef<number | null>(null);

  // Prepare data for uPlot
  const lastDataRef = useRef<uPlot.AlignedData>([[], [], [], []]);

  const aligned = useMemo((): uPlot.AlignedData => {
    const x = data?.x ?? new Float64Array(0);
    const y = data?.yLine ?? new Float64Array(0);
    const yMin = data?.yMin ?? new Float64Array(0);
    const yMax = data?.yMax ?? new Float64Array(0);
    const len = Math.min(x.length, y.length, yMin.length, yMax.length);
    if (!len) return lastDataRef.current;
    const lo = new Float64Array(len);
    const hi = new Float64Array(len);
    for (let i = 0; i < len; i++) {
      const a = yMin[i];
      const b = yMax[i];
      const va = Number.isFinite(a) ? a : y[i];
      const vb = Number.isFinite(b) ? b : y[i];
      if (va <= vb) { lo[i] = va; hi[i] = vb; } else { lo[i] = vb; hi[i] = va; }
    }
    const d: uPlot.AlignedData = [x, y, lo, hi];
    lastDataRef.current = d;
    return d;
  }, [data?.x, data?.yLine, data?.yMin, data?.yMax]);

  // uPlot options
  const options = useMemo(
    (): uPlot.Options => ({
      width: chartWidth,
      height: 300,
      scales: {
        x: { time: false },
        y: { auto: true },
      },
      axes: [
        {
          stroke: "#374151",
          grid: { stroke: "#e5e7eb", width: 1 },
        },
        {
          stroke: "#374151",
          grid: { stroke: "#e5e7eb", width: 1 },
        },
      ],
      series: [
        {}, // x-axis
        {
          label: "Data Series",
          stroke: "#dc2626", // Red for main data line
          width: 2.5,
          points: { show: false },
        },
        {
          label: "Min Band",
          stroke: "transparent",
          width: 0,
          points: { show: false },
        },
        {
          label: "Max Band",
          stroke: "transparent",
          width: 0,
          points: { show: false },
        },
      ],
      bands: [
        {
          series: [2, 3],
          fill: "#fca5a533", // Semi-transparent pale red (20% opacity)
          dir: 1
        },
      ],
      hooks: {
        drawClear: [
          () => {
            drawStartRef.current = performance.now();
          },
        ],
        draw: [
          () => {
            const now = performance.now();
            const dur = now - drawStartRef.current;
            nextMsRef.current = dur;

            const last = lastDrawRef.current;
            if (last != null) {
              const inst = 1000 / (now - last);
              const ema =
                emaFpsRef.current == null
                  ? inst
                  : 0.9 * emaFpsRef.current + 0.1 * inst;
              emaFpsRef.current = ema;
              nextFpsRef.current = ema;
            }
            lastDrawRef.current = now;

            if (!pendingUpdateRef.current) {
              pendingUpdateRef.current = true;
              requestAnimationFrame(() => {
                pendingUpdateRef.current = false;
                setLastMs(nextMsRef.current);
                setFps(nextFpsRef.current);
              });
            }
          },
        ],
      },
    }),
    [chartWidth],
  );

  return (
    <div className="relative w-full">
      <div className="w-[1000px] min-h-[300px] bg-white border rounded relative">
        <UplotReact options={options} data={aligned} />
      </div>
      <div className="absolute top-2 right-2 rounded bg-black/80 text-white text-xs px-2 py-1 font-mono">
        {fps ? fps.toFixed(1) : "—"} fps ·{" "}
        {lastMs != null ? `${lastMs.toFixed(1)} ms` : "— ms"}
      </div>

      {/* Legend */}
      <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-red-600"></div>
          <span>Data Series ({(data?.yLine?.length ?? 0)}) points</span>
        </div>
        {(data?.yMin?.length ?? 0) > 0 && (data?.yMax?.length ?? 0) > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-red-300"></div>
            <span>Error Margin (Min-Max Range)</span>
          </div>
        )}
      </div>
    </div>
  );
}
