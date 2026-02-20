import { bench, describe } from "vitest";

import { generateSessionToken } from "../../src/lib/auth/session/tokens";

describe("auth token performance", () => {
  bench("generates a session token", () => {
    generateSessionToken();
  });
});
