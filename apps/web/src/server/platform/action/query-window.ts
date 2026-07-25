import { invalid, type DomainError } from "~/domain/errors";
import { Err, Ok, type Result } from "~/shared/result";

export function trimOrUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed;
}

export function parsePositiveIntegerAtMost(
  value: number,
  options: {
    code: string;
    field: string;
    max: number;
  },
): Result<number, DomainError> {
  if (!Number.isInteger(value) || value < 1) {
    return Err(
      invalid({
        code: options.code,
        details: { field: options.field, rule: "positive_integer" },
      }),
    );
  }

  if (value > options.max) {
    return Err(
      invalid({
        code: options.code,
        details: {
          field: options.field,
          rule: "max",
          max: options.max,
          actual: value,
        },
      }),
    );
  }

  return Ok(value);
}
