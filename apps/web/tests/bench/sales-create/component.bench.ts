import { bench, describe } from "vitest";

import { isExpired } from "~/server/contact-assignments/domain/assignment";

import { COMPONENT_ITERATIONS } from "../_shared/constants";
import { fixedIterations } from "../_shared/options";

describe("sales create component benchmark", () => {
  bench(
    "component path: evaluate lead assignment expiry",
    () => {
      const expired = isExpired(1, 2);
      if (!expired) {
        throw new Error("expected assignment to be expired");
      }
    },
    fixedIterations(COMPONENT_ITERATIONS),
  );
});
