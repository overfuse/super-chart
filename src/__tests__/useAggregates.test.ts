import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import useAggregates from "../hooks/useAggregates";

describe("useAggregates", () => {
  it("returns null for empty window", () => {
    const emptyWin = { x: new Float64Array(0), y: new Float64Array(0) };
    const { result } = renderHook(() => useAggregates(emptyWin));
    expect(result.current).toBeNull();
  });
});
