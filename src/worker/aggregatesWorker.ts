// Aggregates worker for calculating statistics
type AggregatesReq =
  | {
      type: "CALCULATE_AGGREGATES";
      data: Float64Array;
      reqId: number;
    }
  | {
      type: "CALCULATE_AGGREGATES_XY";
      x: Float64Array;
      y: Float64Array;
      reqId: number;
    };

type AggregatesRes = {
  type: "AGGREGATES_RESULT";
  min: number;
  max: number;
  average: number;
  variance: number;
  count: number;
  reqId: number;
};

// Efficient aggregates calculation
function calculateAggregates(
  data: Float64Array,
): Omit<AggregatesRes, "type" | "reqId"> {
  if (data.length === 0) {
    return {
      min: 0,
      max: 0,
      average: 0,
      variance: 0,
      count: 0,
    };
  }

  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let validCount = 0;

  // First pass: min, max, sum, count
  for (let i = 0; i < data.length; i++) {
    const value = data[i];
    if (Number.isFinite(value)) {
      validCount++;
      sum += value;
      if (value < min) min = value;
      if (value > max) max = value;
    }
  }

  if (validCount === 0) {
    return {
      min: 0,
      max: 0,
      average: 0,
      variance: 0,
      count: 0,
    };
  }

  const average = sum / validCount;

  // Second pass: variance
  let sumSquaredDiffs = 0;
  for (let i = 0; i < data.length; i++) {
    const value = data[i];
    if (Number.isFinite(value)) {
      const diff = value - average;
      sumSquaredDiffs += diff * diff;
    }
  }

  const variance = validCount > 1 ? sumSquaredDiffs / validCount : 0;

  return {
    min,
    max,
    average,
    variance,
    count: validCount,
  };
}

self.onmessage = (e: MessageEvent<AggregatesReq>) => {
  const { type, reqId } = e.data;

  if (type === "CALCULATE_AGGREGATES" || type === "CALCULATE_AGGREGATES_XY") {
    const start = performance.now();
    const data = type === "CALCULATE_AGGREGATES" ? (e.data as any).data : (e.data as any).y;
    const aggregates = calculateAggregates(data);
    const duration = performance.now() - start;

    // Optional: Log performance for debugging
    if (duration > 10) {
      console.log(
        `Aggregates calculation took ${duration.toFixed(2)}ms for ${data.length} points`,
      );
    }

    const result: AggregatesRes = {
      type: "AGGREGATES_RESULT",
      ...aggregates,
      reqId,
    };

    postMessage(result);
  }
};
