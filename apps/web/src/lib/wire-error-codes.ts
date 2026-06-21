import type { WireError } from "~/lib/wire-error";
import type { DomainCode } from "~/server/shared/error-catalog";

export type { DomainCode };

export function codeIs(wire: WireError, code: DomainCode): boolean {
  return wire.code === code;
}
