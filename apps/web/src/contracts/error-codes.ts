import type { WireError } from "~/contracts/errors";
import type { DomainCode } from "~/domain/error-catalog";

export type { DomainCode };

export function codeIs(wire: WireError, code: DomainCode): boolean {
  return wire.code === code;
}
