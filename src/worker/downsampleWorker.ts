/// <reference lib="webworker" />

// Simple downsampling worker that processes windowed data directly

type AggReq = {
  type: "AGG_REQ";
  x: Float64Array;
  y: Float64Array;
  threshold: number;
  stride: number; // bucket size in indices
  startIndex: number; // absolute start index of the window
  reqId: number;
  version: number;
};

type DSRes = {
  type: "AGG_RES";
  x: Float64Array;
  yLine: Float64Array;
  yMin: Float64Array;
  yMax: Float64Array;
  reqId: number;
  version: number;
};

// Simple downsampling function using uniform sampling with error bands
function downsample(
  x: Float64Array,
  y: Float64Array,
  threshold: number,
  stride: number,
  startIndex: number,
) {
  const n = x.length;
  if (n <= threshold) {
    return {
      x: x.slice(),
      yLine: y.slice(),
      yMin: y.slice(),
      yMax: y.slice(),
    };
  }

  // Compute number of buckets with provided stride, capped by threshold
  const buckets = Math.min(threshold, Math.ceil(n / stride));
  const outX = new Float64Array(buckets);
  const outY = new Float64Array(buckets);
  const outMin = new Float64Array(buckets);
  const outMax = new Float64Array(buckets);

  // Anchor buckets to the global index grid: they only shift when startIndex crosses a stride boundary
  const baseAligned = Math.floor(startIndex / stride) * stride;

  for (let i = 0; i < buckets; i++) {
    const bucketStartAbs = baseAligned + i * stride;
    const localStart = Math.max(0, bucketStartAbs - startIndex);
    const localEnd = Math.min(n, localStart + stride);

    const start = localStart;
    const end = localEnd;

    // Use bucket midpoint X for stability, and average Y to reduce flicker
    const bucketLen = Math.max(1, end - start);
    const midIdx = start + Math.floor(bucketLen / 2);
    outX[i] = x[midIdx];

    let sum = 0;
    let count = 0;

    let mn = y[start];
    let mx = y[start];

    for (let j = start; j < end; j++) {
      if (Number.isFinite(y[j])) {
        const v = y[j];
        sum += v;
        count++;
        if (v < mn) mn = v;
        if (v > mx) mx = v;
      }
    }

    outMin[i] = mn;
    outMax[i] = mx;
    outY[i] = count > 0 ? sum / count : y[start];
  }

  return {
    x: outX,
    yLine: outY,
    yMin: outMin,
    yMax: outMax,
  };
}

self.onmessage = (e: MessageEvent<AggReq>) => {
  const { x, y, threshold, stride, startIndex, reqId, version } = e.data;
  // Debug trace
  // eslint-disable-next-line no-console
  console.debug("DSW: received", { xLen: x.length, yLen: y.length, threshold, stride, startIndex, reqId, version });
  
  const result = downsample(x, y, threshold, stride, startIndex);
  
  const res: DSRes = {
    type: "AGG_RES",
    ...result,
    reqId,
    version,
  };
  
  // eslint-disable-next-line no-console
  console.debug("DSW: respond", { out: result.x.length, reqId, version });
  postMessage(res, [
    result.x.buffer,
    result.yLine.buffer,
    result.yMin.buffer,
    result.yMax.buffer,
  ]);
};
