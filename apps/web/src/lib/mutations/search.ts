import { action, json } from "@solidjs/router";

import { searchDirect } from "~/actions/search/run";
import type { SearchIntent } from "~/contracts/search/vocabulary";
import { mySearchAllowanceQuery } from "~/lib/queries/search";

export const searchDirectMutation = action(
  async (input: { intent: SearchIntent; query: string; limit: number }) =>
    json(await searchDirect(input), {
      revalidate: [mySearchAllowanceQuery.key],
    }),
  "searchDirect",
);
