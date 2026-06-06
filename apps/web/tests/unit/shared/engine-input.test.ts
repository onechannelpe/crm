import { describe, expect, it } from "vitest";

import { validateSearchInput } from "~/server/shared/engine/input";

describe("engine search input validation", () => {
  it("accepts valid search queries", () => {
    expect(() => validateSearchInput("12345678", 20)).not.toThrow();
    expect(() => validateSearchInput("20100000001", 20)).not.toThrow();
    expect(() => validateSearchInput("999111222", 20)).not.toThrow();
    expect(() => validateSearchInput("juan perez", 20)).not.toThrow();
    expect(() => validateSearchInput("ACME SAC", 20)).not.toThrow();
  });

  it("rejects invalid search queries", () => {
    expect(() => validateSearchInput("a", 20)).toThrow(
      "Search query must contain 2 to 120 characters",
    );
    expect(() => validateSearchInput("", 20)).toThrow(
      "Search query is required",
    );
    expect(() => validateSearchInput("safe", 0)).toThrow(
      "Search limit must be an integer between 1 and 100",
    );
  });
});
