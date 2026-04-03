import { action, json } from "@solidjs/router";

import { assignCurrentUserContacts } from "~/actions/contact-assignments/assign";
import { managedExecutivesQuery } from "~/lib/queries/capacity";
import { myContactAssignmentCapacityQuery } from "~/lib/queries/contact-assignment-capacity";
import { activeContactAssignmentsQuery } from "~/lib/queries/contact-assignments";

export const assignContactsToCurrentUserMutation = action(
  async () => {
    const result = await assignCurrentUserContacts();
    return json(result, {
      revalidate: [
        activeContactAssignmentsQuery.key,
        myContactAssignmentCapacityQuery.key,
        managedExecutivesQuery.key,
      ],
    });
  },
  "assignContactsToCurrentUser",
);
