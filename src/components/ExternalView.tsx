import Chart from "./Chart";
import Aggregates from "./Aggregates";
import { useStore } from "../store";
import useWindowData from "../hooks/useWindowData";
import useDownsampleExternal from "../hooks/useDownsampleExternal";
import useAggregates from "../hooks/useAggregates";
import useTargetPoints from "../hooks/useTargetPoints";

export default function ExternalView() {
  const S = useStore((s) => s.S);
  const N = useStore((s) => s.N);
  const dataVersion = useStore((s) => s.dataVersion);

  const win = useWindowData(S, N, dataVersion);
  const targetPoints = useTargetPoints();
  const ds = useDownsampleExternal(S, N, targetPoints, dataVersion, win);
  const aggs = useAggregates(win);
  const count = win?.x?.length ?? 0;

  return (
    <>
      <Chart data={ds ?? null} />
      {aggs && <Aggregates aggregates={aggs} pointCount={count} />}
    </>
  );
}


