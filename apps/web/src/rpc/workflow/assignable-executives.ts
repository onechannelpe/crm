import { query } from "@solidjs/router";

import type { ListAssignableExecutivesInput } from "~/contracts/workflow/inputs";
import { queryAssignableExecutives } from "~/server/workflow/ui/records";

export const assignableExecutivesQuery = query(
  async (input: ListAssignableExecutivesInput) => {
    "use server";
    return queryAssignableExecutives(input);
  },
  "workflow.assignable-executives",
);
