import { bench, describe } from "vitest";

import { createAssignment } from "~/server/leads/domain-assignment";
import { canContactNow } from "~/server/leads/domain-cooldown";
import { canLockOrganization } from "~/server/leads/domain-org-lock";

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
    "component path: evaluate organization lock rule",
    () => {
      const allowed = canLockOrganization(
        {
          id: 1,
          ruc: "20100000001",
          name: "Org",
          created_at: BENCH_NOW,
          locked_branch_id: 1,
          locked_at: BENCH_NOW,
          locked_by_user_id: 1,
        },
        1,
      );
      if (!allowed) {
        throw new Error("expected lock rule to allow same-branch access");
      }
    },
    fixedIterations(COMPONENT_ITERATIONS),
  );

  bench(
    "component path: evaluate contact cooldown rule",
    () => {
      const canContact = canContactNow(
        {
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
        },
        BENCH_NOW,
      );
      if (!canContact) {
        throw new Error("expected contact to be outside cooldown window");
      }
    },
    fixedIterations(COMPONENT_ITERATIONS),
  );
});
