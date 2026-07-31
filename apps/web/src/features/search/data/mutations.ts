import { action, json } from "@solidjs/router";

import type { SearchIntent } from "~/contracts/search/vocabulary";
import { mySearchAllowanceQuery } from "~/rpc/capacity/my-search-allowance.query";
import { searchDirect } from "~/rpc/search/run.action";

export const searchDirectMutation = action(
  async (input: { intent: SearchIntent; query: string; limit: number }) =>
    json(await searchDirect(input), {
      revalidate: [mySearchAllowanceQuery.key],
    }),
  "searchDirect",
);
