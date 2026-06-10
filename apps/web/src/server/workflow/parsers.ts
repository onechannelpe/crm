import { fail, invalid, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

export function normalizeLeadRuc(ruc: unknown): Result<string, DomainError> {
  if (typeof ruc !== "string") {
    return Err(fail("invalid_ruc"));
  }

  const normalizedRuc = ruc.trim();

  if (!/^\d{11}$/.test(normalizedRuc)) {
    return Err(fail("invalid_ruc"));
  }

  return Ok(normalizedRuc);
}

function isVocabularyValue<TValue extends string>(
  value: string,
  options: readonly TValue[],
): value is TValue {
  return options.some((option) => option === value);
}

export function parseVocabularyValue<TValue extends string>(
  value: unknown,
  options: readonly TValue[],
  errorCode: string,
): Result<TValue, DomainError> {
  if (typeof value !== "string") {
    return Err(invalid({ code: errorCode }));
  }

  if (!isVocabularyValue(value, options)) {
    return Err(invalid({ code: errorCode }));
  }

  return Ok(value);
}

export function parseOptionalVocabularyValue<TValue extends string>(
  value: unknown,
  options: readonly TValue[],
  errorCode: string,
): Result<TValue | undefined, DomainError> {
  if (value === undefined || value === null || value === "") {
    return Ok(undefined);
  }

  return parseVocabularyValue(value, options, errorCode);
}
