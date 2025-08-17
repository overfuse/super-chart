import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Chart from "../components/Chart";

function makeAgg(len: number) {
  const x = new Float64Array(len);
  const y = new Float64Array(len);
  for (let i = 0; i < len; i++) {
    x[i] = i;
    y[i] = i;
  }
  return { x, yLine: y, yMin: y, yMax: y };
}

describe("Chart", () => {
  it("renders fps/ms overlay", () => {
    render(<Chart data={makeAgg(10)} />);
    expect(screen.getByText(/fps/i)).toBeInTheDocument();
  });
});
