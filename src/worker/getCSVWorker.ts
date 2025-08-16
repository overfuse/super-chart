let singleton: Worker | null = null;

export function getCSVWorker(): Worker {
  if (!singleton) {
    singleton = new Worker(new URL("./csvWorker.ts", import.meta.url), {
      type: "module",
    });
    // Propagate unhandled worker errors to console for observability
    singleton.addEventListener("error", (e) => {
      // eslint-disable-next-line no-console
      console.error("CSV worker error:", e);
    });
    singleton.addEventListener("messageerror", (e) => {
      // eslint-disable-next-line no-console
      console.error("CSV worker messageerror:", e);
    });
  }
  return singleton;
}

export function disposeCSVWorker() {
  if (singleton) {
    singleton.terminate();
    singleton = null;
  }
}


