import { useMemo } from "react";
import { useStore } from "../store";
import useExternalWindow from "./useExternalWindow";

export interface WindowData {
  x: Float64Array;
  y: Float64Array;
}

export default function useWindowData(
  startIndex: number,
  windowSize: number,
  version?: number,
): WindowData | null {
  const useExternal = useStore((s) => s.useExternalStorage);
  const xAll = useStore((s) => s.x);
  const yAll = useStore((s) => s.y);

  // Call both hooks/derivations unconditionally to preserve hook order
  const externalWin = useExternalWindow(startIndex, windowSize, version);

  const localWin = useMemo(() => {
    if (!xAll || !yAll || xAll.length === 0 || yAll.length === 0) return null;
    const total = Math.min(xAll.length, yAll.length);
    if (total === 0) return null;
    const s = Math.max(0, Math.min(startIndex | 0, Math.max(0, total - 1)));
    const n = Math.max(1, windowSize | 0);
    const e = Math.min(s + n, total);
    return { x: xAll.subarray(s, e), y: yAll.subarray(s, e) };
  }, [xAll, yAll, startIndex, windowSize]);

  return useExternal ? externalWin : localWin;
}


