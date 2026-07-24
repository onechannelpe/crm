import { type RouteDefinition } from "@solidjs/router";

import { meQuery } from "~/features/auth/data/queries";
import { leadListQuery } from "~/features/workflow/data/queries";
import {
  parseLeadPageIndex,
  resolveLeadListQueryInput,
} from "~/features/workflow/workspace/lead-list-query";
import { LeadsWorkspace } from "~/features/workflow/workspace/leads-workspace";

// Shared input normalization makes the preload warm the workspace query key.
export const route = {
  preload: async ({ location }) => {
    const user = await meQuery();
    if (!user) {
      return;
    }

    void leadListQuery(
      resolveLeadListQueryInput(
        {
          view: firstQueryValue(location.query.view),
          filter: firstQueryValue(location.query.filter),
          sort: firstQueryValue(location.query.sort),
          search: firstQueryValue(location.query.query),
          pageIndex: parseLeadPageIndex(firstQueryValue(location.query.page)),
        },
        { id: user.id, role: user.role },
      ),
    );
  },
} satisfies RouteDefinition;

function firstQueryValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }

  return undefined;
}

export default function RecordsPage() {
  return <LeadsWorkspace />;
}
