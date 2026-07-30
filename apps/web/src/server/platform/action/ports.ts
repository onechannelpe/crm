import type { TelemetryRow } from "./telemetry";

export type RuntimePorts = {
  now: () => Date;
  report: (error: unknown) => void;
  record: (row: TelemetryRow) => void;
};

export const defaultPorts: RuntimePorts = {
  now: () => new Date(),
  report() {},
  record: (row) => {
    void import("./record-action-observation")
      .then(({ recordActionObservation }) => recordActionObservation(row))
      .catch(() => {});
  },
};
