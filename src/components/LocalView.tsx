import Chart from "./Chart";
import Aggregates from "./Aggregates";
import { useStore } from "../store";
import useWindowData from "../hooks/useWindowData";
import useDownsample from "../hooks/useDownsample";
import type { Window } from "../types/window";
import useAggregates from "../hooks/useAggregates";
import useTargetPoints from "../hooks/useTargetPoints";

export default function LocalView() {
  const S = useStore((s) => s.S);
  const N = useStore((s) => s.N);
  const dataVersion = useStore((s) => s.dataVersion);
  
  const win = useWindowData(S, N, dataVersion);

  const targetPoints = useTargetPoints();
  const dsLocal = useDownsample(win ?? null, targetPoints, S);
  const shouldDownsample = N > targetPoints;
  const aggs = useAggregates(win);

  const data: Window | null = shouldDownsample && dsLocal ? dsLocal : enrichWindow(win);

  return (
    <>
      <Chart data={data} />
      {aggs && <Aggregates aggregates={aggs} pointCount={win?.x?.length ?? 0} />}
    </>
  );
}

function enrichWindow(w: ReturnType<typeof useWindowData>): Window | null {
  if (!w || w.x.length === 0 || w.y.length === 0) return null;
  return { x: w.x, yLine: w.y, yMin: w.y, yMax: w.y };
}