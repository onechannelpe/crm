import { invalid, type DomainError } from "~/domain/errors";
import { Err, Ok, type Result } from "~/shared/result";

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
