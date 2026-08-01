import type { SearchDirectResult } from "~/contracts/search/results";
import { SEARCH_INTENTS } from "~/contracts/search/vocabulary";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { application } from "~/server/platform/composition/application";
import { runDirectSearch } from "~/server/search-workflow/run-search";
import { checkActionRateLimit } from "~/server/security/action-rate-limit";

export async function searchDirect(
  input: unknown,
): Promise<SearchDirectResult> {
  "use server";

  return executeSessionServerFunction({
    name: "search.use",
    access: { kind: "permission", permission: "search:use" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        intent: r.enum("intent", SEARCH_INTENTS),
        query: r.str("query"),
        limit: r.optIntRange("limit", { min: 1, max: 100 }) ?? 20,
      })),

    audit: (command) => ({ intent: command.intent }),

    execute: async (ctx, command) => {
      const { usageReservationPorts, rateLimitDeps } = application.search;
      await checkActionRateLimit(
        "search.use",
        ctx.actor.userId,
        rateLimitDeps,
        ctx.operationAt,
      );

      return runDirectSearch(
        { ...command, actorUserId: ctx.actor.userId, at: ctx.operationAt },
        usageReservationPorts,
        application.engine,
      );
    },
  });
}
