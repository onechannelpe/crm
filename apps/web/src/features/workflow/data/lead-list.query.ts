import { query } from "@solidjs/router";

import type { ListLeadsFiltersInput } from "~/contracts/workflow/inputs";
import { queryLeadList } from "~/server/workflow/ui/records";

export const leadListQuery = query(
  async (filters: ListLeadsFiltersInput) => {
    "use server";
    return queryLeadList(filters);
  },
  "workflow.lead-list",
);
