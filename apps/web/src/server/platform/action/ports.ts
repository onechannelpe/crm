import type { DomainError } from "~/domain/errors";

import type { TelemetryRow } from "./telemetry";

export type ServerFunctionPorts = {
  now: () => Date;
  record: (row: TelemetryRow) => void;
  report: (error: DomainError) => void;
};
