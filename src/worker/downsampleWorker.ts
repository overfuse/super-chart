/// <reference lib="webworker" />
import { expose } from "comlink";

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

  const buckets = Math.min(threshold, Math.ceil(n / stride));
  const outX = new Float64Array(buckets);
  const outY = new Float64Array(buckets);
  const outMin = new Float64Array(buckets);
  const outMax = new Float64Array(buckets);

  const baseAligned = Math.floor(startIndex / stride) * stride;

  for (let i = 0; i < buckets; i++) {
    const bucketStartAbs = baseAligned + i * stride;
    const localStart = Math.max(0, bucketStartAbs - startIndex);
    const localEnd = Math.min(n, localStart + stride);

    const start = localStart;
    const end = localEnd;

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

const api = {
  async downsample(
    x: Float64Array,
    y: Float64Array,
    threshold: number,
    stride: number,
    startIndex: number,
  ) {
    return downsample(x, y, threshold, stride, startIndex);
  },
};

expose(api);
