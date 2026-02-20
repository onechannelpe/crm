import { bench, describe } from "vitest";

import {
  generateSessionToken,
  hashSessionToken,
  isValidTokenFormat,
} from "../../src/lib/auth/session/tokens";
import { fixedIterations } from "./shared";

describe("auth token performance", () => {
  bench(
    "action path: generate a session token",
    () => {
      const token = generateSessionToken();
      if (!isValidTokenFormat(token)) {
        throw new Error("generated token format is invalid");
      }
    },
    fixedIterations(40_000),
  );

  bench(
    "component path: hash a session token",
    () => {
      const hash = hashSessionToken("a234567a234567a234567a234567a23");
      if (hash.length !== 64) {
        throw new Error(`expected hash length 64, got ${hash.length}`);
      }
    },
    fixedIterations(40_000),
  );
});
