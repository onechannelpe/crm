import { ActionError, type WireError } from "~/contracts/errors";
import { type DomainError, unexpectedFault } from "~/domain/errors";

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

export function faultToWire(error: unknown, ports: FaultPorts): WireError {
  if (error instanceof ActionError) return error.wire;
  ports.report(error);
  return toWire(unexpectedFault(error));
}
