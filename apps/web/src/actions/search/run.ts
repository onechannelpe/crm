"use server";

import type { SearchDirectResult } from "~/contracts/search/results";
import { isSearchIntent } from "~/contracts/search/vocabulary";
import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { runDirectSearch } from "~/server/search-workflow/run-search";
import { invalid } from "~/server/shared/domain-error";
import { Err, Ok } from "~/server/shared/result";

export async function searchDirect(
  intent: unknown,
  query: unknown,
  limit?: unknown,
): Promise<SearchDirectResult> {
  return runAction({
    name: "search.use",
    access: { kind: "permission", permission: "search:use" },

    parse: () => {
      if (typeof intent !== "string" || !isSearchIntent(intent)) {
        return Err(invalid({ code: "search.intent.invalid" }));
      }

      if (typeof query !== "string" || query.trim().length === 0) {
        return Err(invalid({ code: "search.value.empty" }));
      }

      const safeLimit = limit == null ? 20 : Number(limit);
      if (!Number.isInteger(safeLimit) || safeLimit < 1 || safeLimit > 100) {
        return Err(invalid({ code: "search.limit.out_of_range" }));
      }

      return Ok({
        intent,
        query: query.trim(),
        limit: safeLimit,
      });
    },

    audit: (command) => ({ intent: command.intent }),

    execute: async (ctx, command) => {
      const { repos, rateLimitDeps } = getServerRuntime().search;
      await checkActionRateLimit("search.use", ctx.actor.userId, rateLimitDeps);

      return runDirectSearch(
        { ...command, actorUserId: ctx.actor.userId },
        repos,
        getServerRuntime().engine,
      );
    },
  });
}
