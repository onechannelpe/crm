import { query } from "@solidjs/router";

type GetManagedExecutivesList =
  (typeof import("~/actions/capacity/read.action"))["getManagedExecutivesList"];

export const managedExecutivesQuery = query(
  async (...args: Parameters<GetManagedExecutivesList>) => {
    "use server";

    const { getManagedExecutivesList } =
      await import("~/actions/capacity/read.action");
    return getManagedExecutivesList(...args);
  },
  "capacity.managed-executives",
);
