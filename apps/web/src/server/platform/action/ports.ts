import type { DomainError } from "~/domain/errors";
import type { Clock } from "~/domain/time/clock";

import type { TelemetryRow } from "./telemetry";

export type ServerFunctionPorts = {
  now: Clock;
  record: (row: TelemetryRow) => void;
  report: (error: DomainError) => void;
};
