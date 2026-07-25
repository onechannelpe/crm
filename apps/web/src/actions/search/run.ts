"use server";

import type { SearchDirectResult } from "~/contracts/search/results";
import { SEARCH_INTENTS } from "~/contracts/search/vocabulary";
import { runAction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { getServerRuntime } from "~/server/platform/container";
import { runDirectSearch } from "~/server/search-workflow/run-search";
import { checkActionRateLimit } from "~/server/security/action-rate-limit";

export async function searchDirect(
  input: unknown,
): Promise<SearchDirectResult> {
  return runAction({
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
      const { usageReservationPorts, rateLimitDeps } =
        getServerRuntime().search;
      await checkActionRateLimit("search.use", ctx.actor.userId, rateLimitDeps);

      return runDirectSearch(
        { ...command, actorUserId: ctx.actor.userId },
        usageReservationPorts,
        getServerRuntime().engine,
      );
    },
  });
}
