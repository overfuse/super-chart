// Row type is defined in store for UI; IPC definitions do not depend on it anymore

// Requests to csvWorker
export type CsvReadWindowReq = {
  type: "READ_WINDOW";
  start: number;
  count: number;
  reqId: number;
};

export type CsvReleaseReq = { type: "CSV_RELEASE" };

export type CsvInboundMessage = CsvReadWindowReq | CsvReleaseReq | File; // initial file payload

// Responses from csvWorker
export type CsvReady = {
  type: "CSV_READY";
  totalRows: number;
  elapsedMs: number;
  warning?: string;
};

export type CsvError = { type: "CSV_ERROR"; message: string };

export type CsvWindow = {
  type: "CSV_WINDOW";
  x: Float64Array;
  y: Float64Array;
  reqId: number;
};

export type CsvReleased = { type: "CSV_RELEASED" };

export type CsvOutboundMessage = CsvReady | CsvError | CsvWindow | CsvReleased;
