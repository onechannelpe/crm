import type { TelemetryRow } from "./telemetry";

export type RuntimePorts = {
  now: () => Date;
  report: (error: unknown) => void;
  record: (row: TelemetryRow) => void;
};
