import { useStore } from "../store";

export default function Controls() {
  const totalInMem = useStore((s) => (s.x ? s.x.length : 0));
  const totalExternal = useStore((s) => s.totalRows);
  const useExternal = useStore((s) => s.useExternalStorage);
  const total = useExternal ? totalExternal : totalInMem;
  const S = useStore((s) => s.S);
  const N = useStore((s) => s.N);
  const P = useStore((s) => s.P);
  const T = useStore((s) => s.T);
  const isPlaying = useStore((s) => s.isPlaying);
  const wrap = useStore((s) => s.wrap);
  const downsampleRatio = useStore((s) => s.downsampleRatio);

  const setS = useStore((s) => s.setS);
  const setN = useStore((s) => s.setN);
  const setP = useStore((s) => s.setP);
  const setT = useStore((s) => s.setT);
  const setIsPlaying = useStore((s) => s.setIsPlaying);
  const setWrap = useStore((s) => s.setWrap);
  const setDownsampleRatio = useStore((s) => s.setDownsampleRatio);
  const reset = useStore((s) => s.reset);
  const jumpToEnd = useStore((s) => s.jumpToEnd);

  const maxStart = Math.max(0, total - N);
  const canPlay = total > N;

  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-700">
        Total points: {total}
      </div>
      <input
        type="range"
        min={0}
        max={maxStart}
        value={Math.min(S, maxStart)}
        onChange={(e) => setS(+e.target.value)}
        className="w-full"
      />

      <div className="grid gap-2 md:grid-cols-7 md:items-end">
        <label className="flex flex-col text-sm">
          <span className="mb-1">Start index S</span>
          <input
            type="number"
            min={0}
            max={maxStart}
            value={S}
            onChange={(e) =>
              setS(Math.min(Math.max(0, +e.target.value), maxStart))
            }
            className="border rounded p-1 w-24"
          />
        </label>

        <label className="flex flex-col text-sm">
          <span className="mb-1">Window size N</span>
          <input
            type="number"
            min={1}
            max={total}
            value={N}
            onChange={(e) => setN(Math.min(total, Math.max(1, +e.target.value)))}
            className="border rounded p-1 w-24"
          />
        </label>

        <label className="flex flex-col text-sm">
          <span className="mb-1">Downsample ratio (width / ratio)</span>
          <input
            type="number"
            min={1}
            value={downsampleRatio}
            onChange={(e) => setDownsampleRatio(Math.max(1, +e.target.value))}
            className="border rounded p-1 w-24"
          />
        </label>

        <label className="flex flex-col text-sm">
          <span className="mb-1">Step P</span>
          <input
            type="number"
            min={1}
            value={P}
            onChange={(e) => setP(Math.max(1, +e.target.value))}
            className="border rounded p-1 w-24"
          />
        </label>

        <label className="flex flex-col text-sm">
          <span className="mb-1">Interval T (ms)</span>
          <input
            type="number"
            min={1}
            value={T}
            onChange={(e) => setT(Math.max(1, +e.target.value))}
            className="border rounded p-1 w-24"
          />
        </label>

        <div className="flex flex-wrap items-end gap-2">
          <button onClick={reset} className="px-3 py-2 border rounded w-32">
            Reset
          </button>
          <button onClick={jumpToEnd} className="px-3 py-2 border rounded w-32">
            Jump to end
          </button>
        </div>

        <div className="flex flex-col gap-2 items-start">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={wrap}
              onChange={(e) => setWrap(e.target.checked)}
            />
            <span>Loop playback</span>
          </label>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={!canPlay}
            className={
              "px-3 py-2 rounded border w-32 disabled:opacity-50 disabled:cursor-not-allowed " +
              (isPlaying
                ? "bg-gray-100 text-gray-900 border-gray-300 hover:bg-gray-200"
                : "bg-blue-600 text-white border-blue-700 hover:bg-blue-700")
            }
            aria-pressed={isPlaying}
            title={
              canPlay ? "" : "Increase N or add more data to enable playback"
            }
          >
            {isPlaying ? "Stop" : "Start"}
          </button>
        </div>
      </div>
    </div>
  );
}
