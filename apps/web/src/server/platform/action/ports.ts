import type { TelemetryRow } from "./telemetry";

export type ServerFunctionPorts = {
  now: () => Date;
  record: (row: TelemetryRow) => void;
};
