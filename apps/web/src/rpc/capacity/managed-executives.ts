import { query } from "@solidjs/router";

import { getManagedExecutivesList } from "~/server/capacity/ui/queries";

export const managedExecutivesQuery = query(async () => {
  "use server";
  return getManagedExecutivesList();
}, "capacity.managed-executives");
