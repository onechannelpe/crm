import { invalid, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { BrandedId } from "./brand";

// Accepts any RFC-4122 variant including uuidv7 (variant nibble [89ab].
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DERIVED_KEY_RE = /^[^:\s]+:\S+$/;

export type IdCodec<Id extends string> = {
  readonly name: string;
  parse(value: unknown): Result<Id, DomainError>;
  trust(value: string): Id;
};

function snake(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

function brandCast<Name extends string>(value: string): BrandedId<Name> {
  // oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion
  return value as BrandedId<Name>;
}

function trustValue<Name extends string>(
  name: Name,
  value: string,
): BrandedId<Name> {
  if (typeof value !== "string" || value.trim().length === 0) {
    // Trusted paths vouch for the value; a violation is an internal bug, so
    // fail fast rather than brand an empty string.
    throw new Error(`${name} must be a non-empty string`);
  }
  return brandCast<Name>(value);
}

export function uuidId<Name extends string>(name: Name) {
  const code = `invalid_${snake(name)}`;
  return {
    name,
    parse(value: unknown): Result<BrandedId<Name>, DomainError> {
      if (typeof value !== "string" || !UUID_RE.test(value)) {
        return Err(invalid({ code }));
      }
      return Ok(brandCast<Name>(value));
    },
    trust: (value: string) => trustValue(name, value),
  } satisfies IdCodec<BrandedId<Name>>;
}

export type DerivedKeyParts = {
  sourceEventId: string;
  discriminator: string;
};

export function derivedKey<Name extends string>(name: Name) {
  const code = `invalid_${snake(name)}`;
  return {
    name,
    parse(value: unknown): Result<BrandedId<Name>, DomainError> {
      if (typeof value !== "string" || !DERIVED_KEY_RE.test(value)) {
        return Err(invalid({ code }));
      }
      return Ok(brandCast<Name>(value));
    },
    trust: (value: string) => trustValue(name, value),
    derive: (parts: DerivedKeyParts) =>
      brandCast<Name>(`${parts.sourceEventId}:${parts.discriminator}`),
  } satisfies IdCodec<BrandedId<Name>> & {
    derive(parts: DerivedKeyParts): BrandedId<Name>;
  };
}
