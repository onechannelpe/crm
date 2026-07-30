import { query } from "@solidjs/router";

import { getPolicyDefaults } from "~/server/capacity/ui/queries";

export const capacityPolicyDefaultsQuery = query(
  async () => {
    "use server";
    return getPolicyDefaults();
  },
  "capacity.policy-defaults",
);
