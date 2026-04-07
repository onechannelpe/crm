import { bench, describe } from "vitest";

import { createAssignment } from "~/server/contact-assignments/domain/assignment";
import { canContactNow } from "~/server/contact-assignments/domain/cooldown";

import { BENCH_NOW, COMPONENT_ITERATIONS } from "../_shared/constants";
import { fixedIterations } from "../_shared/options";

describe("lead assignment component benchmark", () => {
  bench(
    "component path: build lead assignment payload",
    () => {
      const assignment = createAssignment(1, 1, 24);
      if (assignment.user_id !== 1 || assignment.contact_id !== 1) {
        throw new Error("unexpected assignment payload");
      }
    },
    fixedIterations(COMPONENT_ITERATIONS),
  );

  bench(
    "component path: evaluate contact cooldown rule",
    () => {
      const contact = {
        id: 1,
        organization_id: 1,
        dni: "70000001",
        name: "Bench",
        phone_primary: "+51911111111",
        phone_secondary: null,
        last_contacted_at: null,
        last_contacted_by_user_id: null,
        cooldown_until: BENCH_NOW - 1,
        created_at: BENCH_NOW,
      };
      const canContact = canContactNow(contact, BENCH_NOW);
      if (!canContact) {
        throw new Error("expected contact to be outside cooldown window");
      }
    },
    fixedIterations(COMPONENT_ITERATIONS),
  );
});
