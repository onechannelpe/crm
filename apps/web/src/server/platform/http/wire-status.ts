import type { WireKind } from "~/contracts/errors";

export const HTTP_STATUS_BY_WIRE_KIND: Record<WireKind, number> = {
  validation: 400,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limit: 429,
  internal: 500,
};
