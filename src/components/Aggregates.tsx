import type { Aggregates } from "../hooks/useAggregates";

interface Props {
  aggregates: Aggregates | null;
  pointCount: number;
}

export default function Aggregates({ aggregates, pointCount }: Props) {
  if (!aggregates) return null;
  const { min, max, average, variance } = aggregates as Aggregates;
  const fmt = (v: number | null | undefined) =>
    typeof v === "number" && Number.isFinite(v) ? v.toFixed(3) : "—";

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        Window Statistics ({pointCount.toLocaleString()} original points)
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-lg font-bold text-blue-600">{fmt(min)}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Minimum</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-red-600">{fmt(max)}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Maximum</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-green-600">{fmt(average)}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Average</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-purple-600">{fmt(variance)}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Variance</div>
        </div>
      </div>
    </div>
  );
}
