import { action, json } from "@solidjs/router";

import { refillContactAssignments } from "~/actions/contact-assignments/refill";
import { managedExecutivesQuery } from "~/lib/queries/capacity";
import { myContactAssignmentCapacityQuery } from "~/lib/queries/contact-assignment-capacity";
import { activeContactAssignmentsQuery } from "~/lib/queries/contact-assignments";

export const requestContactAssignmentRefillNowMutation = action(async () => {
  const result = await refillContactAssignments();
  return json(result, {
    revalidate: [
      activeContactAssignmentsQuery.key,
      myContactAssignmentCapacityQuery.key,
      managedExecutivesQuery.key,
    ],
  });
}, "requestContactAssignmentRefillNow");
