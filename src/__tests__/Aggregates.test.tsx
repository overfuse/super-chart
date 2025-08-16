import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Aggregates from "../components/Aggregates";

describe("Aggregates component", () => {
  it("hides when no data", () => {
    const { container } = render(<Aggregates aggregates={null} pointCount={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders stats when provided", () => {
    render(
      <Aggregates
        aggregates={{ min: 1, max: 3, average: 2, variance: 0.5, count: 3 }}
        pointCount={3}
      />,
    );
    expect(screen.getByText(/Minimum/i)).toBeInTheDocument();
    expect(screen.getByText(/Maximum/i)).toBeInTheDocument();
  });
});


