import { action, json } from "@solidjs/router";

import {
  completeContactAssignmentCall,
  type CompleteContactAssignmentCallInput,
} from "~/actions/contact-assignments/interactions";
import { activeContactAssignmentsQuery } from "~/lib/queries/contact-assignments";

export const completeContactAssignmentCallMutation = action(
  async (input: CompleteContactAssignmentCallInput) => {
    const result = await completeContactAssignmentCall(input);
    return json(result, { revalidate: activeContactAssignmentsQuery.key });
  },
  "completeContactAssignmentCall",
);
