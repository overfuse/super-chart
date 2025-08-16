import { useEffect, useState } from "react";
import { useStore, type Row } from "../store";
import type { WindowData } from "./useWindowData";


export default function useWindowRows(prefetchedWin?: WindowData | null): Row[] {
  const [windowRows, setWindowRows] = useState<Row[]>([]);
  const x = useStore((s) => s.x);
  const y = useStore((s) => s.y);
  const S = useStore((s) => s.S);
  const N = useStore((s) => s.N);
  const useExternal = useStore((s) => s.useExternalStorage);
  const totalRows = useStore((s) => s.totalRows);

  useEffect(() => {
    if (useExternal) {
      // In external mode we always downsample; avoid building massive Row[]
      setWindowRows((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    if (!x || !y || x.length === 0 || y.length === 0) {
      setWindowRows((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    // Local mode: set the exact slice (effect deps ensure we don't loop)
    const start = Math.max(0, Math.min(S, Math.max(0, Math.min(x.length, y.length) - 1)));
    const end = Math.min(start + N, Math.min(x.length, y.length));
    const len = Math.max(0, end - start);
    const next: Row[] = new Array(len);
    for (let i = 0; i < len; i++) next[i] = { x: x[start + i], y: y[start + i] };
    setWindowRows(next);
  }, [prefetchedWin?.x, prefetchedWin?.y, x?.length, y?.length, S, N, useExternal, totalRows]);

  return windowRows;
}