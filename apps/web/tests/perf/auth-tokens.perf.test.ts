import { describe, expect, it } from "vitest";
import { generateSessionToken } from "../../src/lib/auth/session/tokens";

describe("auth token performance", () => {
  it("generates many tokens within a performance budget", () => {
    const started = Date.now();
    for (let i = 0; i < 2000; i++) {
      generateSessionToken();
    }
    expect(Date.now() - started).toBeLessThan(3000);
  });
});
