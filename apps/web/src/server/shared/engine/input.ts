import type { SearchIntent } from "~/server/shared/workflow-types";

function hasMeaningfulToken(value: string): boolean {
  return value
    .split(/\s+/)
    .some((token) => token.replace(/[^\p{L}\p{N}]/gu, "").length >= 3);
}

export function validateSearchInput(
  _intent: SearchIntent,
  query: string,
  limit: number,
): void {
  const value = query.trim();
  if (!value) {
    throw new Error("Search query is required");
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("Search limit must be an integer between 1 and 100");
  }

  if (value.length < 2 || value.length > 120) {
    throw new Error("Search query must contain 2 to 120 characters");
  }

  if (!/^[0-9:+()\sA-Za-z._-]+$/.test(value) && !hasMeaningfulToken(value)) {
    throw new Error("Search query contains unsupported characters");
  }
}
