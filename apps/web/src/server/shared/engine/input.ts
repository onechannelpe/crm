import type { SearchType } from "~/server/shared/workflow-types";

function isAsciiDigits(value: string): boolean {
  return /^\d+$/.test(value);
}

function hasMeaningfulToken(value: string): boolean {
  return value
    .split(/\s+/)
    .some((token) => token.replace(/[^\p{L}\p{N}]/gu, "").length >= 3);
}

export function validateSearchInput(
  type: SearchType,
  value: string,
  limit: number,
): void {
  const query = value.trim();
  if (!query) {
    throw new Error("Search value is required");
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("Search limit must be an integer between 1 and 100");
  }

  switch (type) {
    case "dni":
      if (query.length < 8 || query.length > 12 || !isAsciiDigits(query)) {
        throw new Error("DNI must contain 8 to 12 digits");
      }
      return;
    case "ruc":
      if (query.length !== 11 || !isAsciiDigits(query)) {
        throw new Error("RUC must contain exactly 11 digits");
      }
      return;
    case "phone":
    case "phone_enriched":
      if (query.length < 7 || query.length > 15 || !isAsciiDigits(query)) {
        throw new Error("Phone must contain 7 to 15 digits");
      }
      return;
    case "person_name":
    case "company_name":
      if (query.length < 2 || query.length > 120) {
        throw new Error("Name query must contain 2 to 120 characters");
      }
      if (!hasMeaningfulToken(query)) {
        throw new Error(
          "Query must contain at least one term with 3 or more characters",
        );
      }
      return;
  }
}
