import { ActionError, type WireError } from "~/lib/wire-error";
import {
  type DomainError,
  toWire,
  unexpectedFault,
} from "~/server/shared/domain-error";

/**
 * The single internal-to-wire boundary, shared by every action surface. It owns
 * one rule: faults (server bugs, third-party failures) are reported and become
 * `internal`; expected domain failures project straight to the wire. It knows
 * nothing about actors, identity, or telemetry, so both the authenticated
 * pipeline (`runAction`) and the public/auth pipeline (`runPublicAction`) build
 * on it without duplicating the fold.
 */
export type FaultPorts = {
  report: (error: unknown) => void;
};

// Expected domain failure -> wire. Only genuine faults (internal/external) are
// reported; validation/forbidden/not_found/conflict/rate_limit/unauthenticated
// are expected outcomes and stay silent.
export function domainToWire(error: DomainError, ports: FaultPorts): WireError {
  if (error.kind === "external" || error.kind === "internal") {
    ports.report(error);
  }
  return toWire(error);
}

// Thrown value -> wire. An `ActionError` already carries a wire-ready payload.
// Anything else is an unexpected fault: report it and project to `internal`.
// `Response` is control flow (redirects, streamed bodies) and must be rethrown
// by the caller before reaching here.
export function faultToWire(error: unknown, ports: FaultPorts): WireError {
  if (error instanceof ActionError) return error.wire;
  ports.report(error);
  return toWire(unexpectedFault(error));
}
