import { type WireError } from "~/contracts/errors";
import { type DomainError } from "~/domain/errors";

import { toWire } from "./domain-error";

export type FaultPorts = {
  report: (error: unknown) => void;
};

export function domainToWire(error: DomainError, ports: FaultPorts): WireError {
  if (error.kind === "external" || error.kind === "internal") {
    ports.report(error);
  }
  return toWire(error);
}
