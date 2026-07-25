import { invalid, type DomainError } from "~/domain/errors";
import { Err, Ok, type Result } from "~/shared/result";

import type { BrandedId } from "./brand";

// Accept any UUID version with the RFC 4122 variant.
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

export function uuidId<Name extends string>(name: Name) {
  const code = `invalid_${snake(name)}`;

  return {
    name,

    parse(value: unknown): Result<BrandedId<Name>, DomainError> {
      if (typeof value !== "string" || !UUID_RE.test(value)) {
        return Err(invalid({ code }));
      }

      // Postgres returns lowercase UUIDs. Normalize parsed IDs so string keys match.
      return Ok(brandCast<Name>(value.toLowerCase()));
    },

    trust: (value: string) => brandCast<Name>(value),
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

    trust: (value: string) => brandCast<Name>(value),

    derive: (parts: DerivedKeyParts) =>
      brandCast<Name>(`${parts.sourceEventId}:${parts.discriminator}`),
  } satisfies IdCodec<BrandedId<Name>> & {
    derive(parts: DerivedKeyParts): BrandedId<Name>;
  };
}
