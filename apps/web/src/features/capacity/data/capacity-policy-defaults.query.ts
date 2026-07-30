import { query } from "@solidjs/router";

type GetPolicyDefaults =
  (typeof import("~/actions/capacity/read.action"))["getPolicyDefaults"];

export const capacityPolicyDefaultsQuery = query(
  async (...args: Parameters<GetPolicyDefaults>) => {
    "use server";

    const { getPolicyDefaults } =
      await import("~/actions/capacity/read.action");
    return getPolicyDefaults(...args);
  },
  "capacity.policy-defaults",
);
