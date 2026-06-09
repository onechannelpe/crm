import { invalid, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const DEFAULT_OFFSET = 0;

export type PageParams = {
  limit: number;
  offset: number;
};

export function parsePageParams(input: {
  limit?: number;
  offset?: number;
}): Result<PageParams, DomainError> {
  const limit = input.limit ?? DEFAULT_LIMIT;
  if (!Number.isInteger(limit) || limit < 1) {
    return Err(invalid({ code: "invalid_limit" }));
  }

  const offset = input.offset ?? DEFAULT_OFFSET;
  if (!Number.isInteger(offset) || offset < 0) {
    return Err(invalid({ code: "invalid_offset" }));
  }

  return Ok({
    limit: Math.min(limit, MAX_LIMIT),
    offset,
  });
}
