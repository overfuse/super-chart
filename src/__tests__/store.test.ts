import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "../store";

describe("store", () => {
  beforeEach(() => {
    const { resetControls, setUseExternalStorage, setTotalRows, setXY } = useStore.getState();
    resetControls();
    setUseExternalStorage(false);
    setTotalRows(0);
    setXY(null, null);
  });

  it("clamps N and adjusts S", () => {
    useStore.setState({ x: new Float64Array(100), y: new Float64Array(100), S: 90 });
    useStore.getState().setN(20);
    const s = useStore.getState();
    expect(s.N).toBe(20);
    expect(s.S).toBe(80);
  });

  it("jumpToEnd uses external total when in external mode", () => {
    useStore.getState().setUseExternalStorage(true);
    useStore.getState().setTotalRows(1234);
    useStore.getState().setN(200);
    useStore.getState().jumpToEnd();
    expect(useStore.getState().S).toBe(1234 - 200);
  });

  it("bumpDataVersion increments", () => {
    const v0 = useStore.getState().dataVersion;
    useStore.getState().bumpDataVersion();
    expect(useStore.getState().dataVersion).toBe(v0 + 1);
  });
});


