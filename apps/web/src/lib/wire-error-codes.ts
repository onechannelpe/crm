import type { WireError } from "~/lib/wire-error";
import type { DomainCode } from "~/server/shared/error-catalog";

export type { DomainCode };

/**
 * Branch on a granular domain code with the literal checked against the catalog:
 * a typo or a server-side rename fails to compile. The wire `code` field itself
 * stays an open string because field-validation codes (`invalid_${field}`) and
 * external-fault codes legitimately fall outside the catalog; only the values we
 * branch on are constrained here.
 *
 * Kept out of `wire-error.ts` so that module stays a leaf wire DTO with no
 * dependency on the server error catalog.
 */
export function codeIs(wire: WireError, code: DomainCode): boolean {
  return wire.code === code;
}
