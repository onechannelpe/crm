import { describe, expect, it } from "vitest";

import { validateSearchInput } from "~/server/shared/engine/input";

describe("engine search input validation", () => {
  it("accepts valid values per search type", () => {
    expect(() => validateSearchInput("dni", "12345678", 20)).not.toThrow();
    expect(() => validateSearchInput("ruc", "20100000001", 20)).not.toThrow();
    expect(() => validateSearchInput("phone", "999111222", 20)).not.toThrow();
    expect(() =>
      validateSearchInput("person_name", "juan perez", 20),
    ).not.toThrow();
    expect(() =>
      validateSearchInput("company_name", "ACME SAC", 20),
    ).not.toThrow();
    expect(() =>
      validateSearchInput("phone_enriched", "999111222", 20),
    ).not.toThrow();
  });

  it("rejects invalid value for search type", () => {
    expect(() => validateSearchInput("dni", "abc", 20)).toThrow(
      "DNI must contain 8 to 12 digits",
    );
    expect(() => validateSearchInput("ruc", "123", 20)).toThrow(
      "RUC must contain exactly 11 digits",
    );
    expect(() => validateSearchInput("phone", "999-111-222", 20)).toThrow(
      "Phone must contain 7 to 15 digits",
    );
    expect(() => validateSearchInput("person_name", "a", 20)).toThrow(
      "Name query must contain 2 to 120 characters",
    );
    expect(() => validateSearchInput("company_name", "a", 20)).toThrow(
      "Name query must contain 2 to 120 characters",
    );
    expect(() => validateSearchInput("phone_enriched", "123", 20)).toThrow(
      "Phone must contain 7 to 15 digits",
    );
  });
});
