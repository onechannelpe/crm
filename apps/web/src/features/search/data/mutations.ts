import { action, json } from "@solidjs/router";

import { searchDirect } from "~/actions/search/run.action";
import type { SearchIntent } from "~/contracts/search/vocabulary";
import { mySearchAllowanceQuery } from "~/features/capacity/data/queries";

export const searchDirectMutation = action(
  async (input: { intent: SearchIntent; query: string; limit: number }) =>
    json(await searchDirect(input), {
      revalidate: [mySearchAllowanceQuery.key],
    }),
  "searchDirect",
);
