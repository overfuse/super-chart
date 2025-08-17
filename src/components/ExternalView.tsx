import Chart from "./Chart";
import Aggregates from "./Aggregates";
import { useStore } from "../store";
import useWindowExternal from "../hooks/useWindowExternal";
import useDownsample from "../hooks/useDownsample";
import useAggregates from "../hooks/useAggregates";
import useTargetPoints from "../hooks/useTargetPoints";

export default function ExternalView() {
  const S = useStore((s) => s.S);
  const N = useStore((s) => s.N);
  const dataVersion = useStore((s) => s.dataVersion);

  const win = useWindowExternal(S, N, dataVersion);
  const targetPoints = useTargetPoints();
  const ds = useDownsample(win ?? null, targetPoints, S);
  const aggs = useAggregates(win);
  const count = win?.x?.length ?? 0;

  return (
    <>
      <Chart data={ds ?? null} />
      {aggs && <Aggregates aggregates={aggs} pointCount={count} />}
    </>
  );
}
