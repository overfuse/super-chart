import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { expose } from "comlink";
import useDownsample from "../hooks/useDownsample";

function makeWin(len: number) {
  const x = new Float64Array(len);
  const y = new Float64Array(len);
  for (let i = 0; i < len; i++) {
    x[i] = i;
    y[i] = Math.sin(i / 10);
  }
  return { x, y } as { x: Float64Array; y: Float64Array };
}

describe("useDownsample (worker interaction)", () => {
  it("prepares inputs and handles worker result", async () => {
    const win = makeWin(1000);
    let lastCall: {
      x: Float64Array;
      y: Float64Array;
      threshold: number;
      stride: number;
      startIndex: number;
    } | null = null;

    const fakeWorkerFactory = () => {
      const channel = new MessageChannel();
      const { port1, port2 } = channel;

      expose(
        {
          async downsample(
            x: Float64Array,
            y: Float64Array,
            threshold: number,
            stride: number,
            startIndex: number,
          ) {
            lastCall = { x, y, threshold, stride, startIndex };
            // Return a sentinel result to verify handling
            return {
              x: new Float64Array([1, 2]),
              yLine: new Float64Array([10, 20]),
              yMin: new Float64Array([9, 19]),
              yMax: new Float64Array([11, 21]),
            };
          },
        },
        port1,
      );

      port2.start();
      const workerLike = {
        addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => {
          port2.addEventListener(type, listener);
        },
        removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) => {
          port2.removeEventListener(type, listener);
        },
        postMessage: (data: unknown, transfer?: Transferable[]) => {
          port2.postMessage(data, transfer as any);
        },
        terminate: () => {
          port1.close();
          port2.close();
        },
      } as unknown as Worker;

      return workerLike;
    };

    const { result, rerender } = renderHook(
      ({ t }) => useDownsample(win, t, 0, fakeWorkerFactory),
      { initialProps: { t: 100 } },
    );

    await waitFor(() => expect(result.current).not.toBeNull());

    // Handles worker result
    const agg = result.current!;
    expect(Array.from(agg.x)).toEqual([1, 2]);
    expect(Array.from(agg.yLine)).toEqual([10, 20]);
    expect(Array.from(agg.yMin)).toEqual([9, 19]);
    expect(Array.from(agg.yMax)).toEqual([11, 21]);

    // Prepares inputs correctly
    expect(lastCall).not.toBeNull();
    expect(lastCall!.threshold).toBe(100);
    expect(lastCall!.startIndex).toBe(0);
    // n=1000, t=100 => rawStride=ceil(10)=10, stride=round(10/2)*2=10
    expect(lastCall!.stride).toBe(10);
    // Should pass copies, not the original refs
    expect(lastCall!.x).not.toBe(win.x);
    expect(lastCall!.y).not.toBe(win.y);

    // Changing threshold triggers another call and recomputed stride
    rerender({ t: 200 });
    await waitFor(() => expect(lastCall!.threshold).toBe(200));
    // n=1000, t=200 => rawStride=ceil(5)=5, stride=round(5/2)*2=6
    expect(lastCall!.stride).toBe(6);
  });

  it("returns empty data when window is null and does not call worker", async () => {
    let lastCall: { threshold: number } | null = null;
    const fakeWorkerFactory = () => {
      const channel = new MessageChannel();
      const { port1, port2 } = channel;
      expose(
        {
          async downsample(
            _x: Float64Array,
            _y: Float64Array,
            threshold: number,
            _stride: number,
            _startIndex: number,
          ) {
            lastCall = { threshold };
            return {
              x: new Float64Array(),
              yLine: new Float64Array(),
              yMin: new Float64Array(),
              yMax: new Float64Array(),
            };
          },
        },
        port1,
      );
      port2.start();
      return {
        addEventListener: port2.addEventListener.bind(port2) as any,
        removeEventListener: port2.removeEventListener.bind(port2) as any,
        postMessage: port2.postMessage.bind(port2) as any,
        terminate: () => {
          port1.close();
          port2.close();
        },
      } as unknown as Worker;
    };

    const { result } = renderHook(() => useDownsample(null, 100, 0, fakeWorkerFactory));
    await waitFor(() => expect(result.current).not.toBeNull());
    const agg = result.current!;
    expect(agg.x.length).toBe(0);
    expect(agg.yLine.length).toBe(0);
    expect(agg.yMin.length).toBe(0);
    expect(agg.yMax.length).toBe(0);
    // Ensure worker method was never invoked
    expect(lastCall).toBeNull();
  });
});
