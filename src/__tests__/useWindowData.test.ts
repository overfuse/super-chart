import { describe, it, expect } from "vitest";
import { useStore } from "../store";
import { renderHook } from "@testing-library/react";
import useWindowData from "../hooks/useWindowData";

describe("useWindowData (local)", () => {
  it("returns subarray views in local mode", () => {
    useStore.setState({ x: new Float64Array([1,2,3,4,5]), y: new Float64Array([10,20,30,40,50]), useExternalStorage: false });
    const { result, rerender } = renderHook(({ s, n }) => useWindowData(s, n), { initialProps: { s: 1, n: 3 } });
    expect(Array.from(result.current!.x)).toEqual([2,3,4]);
    expect(Array.from(result.current!.y)).toEqual([20,30,40]);
    rerender({ s: 2, n: 10 });
    expect(Array.from(result.current!.x)).toEqual([3,4,5]);
  });
});


