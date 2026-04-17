import { action, json } from "@solidjs/router";

import { completeContactAssignmentCall } from "~/actions/contact-assignments/interactions";
import { activeContactAssignmentsQuery } from "~/lib/queries/contact-assignments";

export const completeContactAssignmentCallMutation = action(
  async (
    assignmentId: string,
    contactId: string,
    outcome: string,
    notes?: string,
  ) => {
    const result = await completeContactAssignmentCall(
      assignmentId,
      contactId,
      outcome,
      notes,
    );
    return json(result, { revalidate: activeContactAssignmentsQuery.key });
  },
  "completeContactAssignmentCall",
);
