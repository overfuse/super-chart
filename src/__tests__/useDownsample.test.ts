import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import useDownsample from "../hooks/useDownsample";

function makeWin(len: number) {
  const x = new Float64Array(len);
  const y = new Float64Array(len);
  for (let i = 0; i < len; i++) { x[i] = i; y[i] = Math.sin(i / 10); }
  return { x, y } as any; // WindowData minimal
}

describe("useDownsample (local window)", () => {
  it("limits output length to threshold and preserves min<=max", async () => {
    const win = makeWin(1000);
    const { result, rerender } = renderHook(({ t }) => useDownsample(win, t, 0), { initialProps: { t: 100 } });
    await waitFor(() => expect(result.current).not.toBeNull());
    const agg = result.current!;
    expect(agg.x.length).toBeLessThanOrEqual(100);
    for (let i = 0; i < agg.x.length; i++) expect(agg.yMin[i] <= agg.yMax[i]).toBe(true);
    rerender({ t: 50 });
    await waitFor(() => expect(result.current!.x.length).toBeLessThanOrEqual(50));
  });
});


