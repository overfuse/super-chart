import "@testing-library/jest-dom";

// Mock uplot-react to avoid Canvas usage in jsdom
import { vi } from "vitest";
import * as React from "react";
vi.mock("uplot-react", () => ({
  default: (_props: Record<string, unknown>) =>
    React.createElement("div", { "data-testid": "uplot" }),
}));

// Provide a basic matchMedia mock for uPlot in jsdom
if (!("matchMedia" in globalThis)) {
  (globalThis as any).matchMedia = (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}

// Polyfill URL.createObjectURL for libraries that spawn Blob workers (jsdom lacks it)
if (!(globalThis as any).URL) {
  (globalThis as any).URL = {} as any;
}
if (typeof (globalThis as any).URL.createObjectURL !== "function") {
  (globalThis as any).URL.createObjectURL = (_blob: Blob) => "blob:mock-url";
}
if (typeof (globalThis as any).URL.revokeObjectURL !== "function") {
  (globalThis as any).URL.revokeObjectURL = (_url: string) => {};
}

// Minimal Worker polyfill for jsdom
if (typeof (globalThis as any).Worker === "undefined") {
  class MockWorker {
    onmessage: ((ev: MessageEvent) => void) | null = null;
    onerror: ((ev: Event) => void) | null = null;
    constructor(_url?: string | URL, _opts?: WorkerOptions) {}
    postMessage(_data?: unknown, _transfer?: Transferable[]) {}
    terminate() {}
    addEventListener(_type: string, _listener: EventListenerOrEventListenerObject) {}
    removeEventListener(_type: string, _listener: EventListenerOrEventListenerObject) {}
    dispatchEvent(_event: Event): boolean {
      return false;
    }
  }
  (globalThis as any).Worker = MockWorker as unknown as typeof Worker;
}
