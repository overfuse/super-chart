// Row type is defined in store for UI; IPC definitions do not depend on it anymore

// Requests to csvWorker
export type CsvReadWindowReq = {
  type: "READ_WINDOW";
  start: number;
  count: number;
  reqId: number;
};

export type CsvDownsampleReq = {
  type: "DOWNSAMPLE";
  start: number;
  count: number;
  threshold: number;
  reqId: number;
};

export type CsvAggReq = {
  type: "CSV_AGG_REQ";
  start: number;
  count: number;
  reqId: number;
};

export type CsvReleaseReq = { type: "CSV_RELEASE" };

export type CsvInboundMessage =
  | CsvReadWindowReq
  | CsvDownsampleReq
  | CsvAggReq
  | CsvReleaseReq
  | File; // initial file payload

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

export type CsvDownsampled = {
  type: "CSV_DOWNSAMPLED";
  reqId: number;
  x: Float64Array;
  yLine: Float64Array;
  yMin: Float64Array;
  yMax: Float64Array;
};

export type CsvAggRes = {
  type: "CSV_AGG_RES";
  reqId: number;
  min: number;
  max: number;
  average: number;
  variance: number;
  count: number;
};

export type CsvReleased = { type: "CSV_RELEASED" };

export type CsvOutboundMessage =
  | CsvReady
  | CsvError
  | CsvWindow
  | CsvDownsampled
  | CsvAggRes
  | CsvReleased;



