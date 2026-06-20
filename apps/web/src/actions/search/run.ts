"use server";

import type { SearchDirectResult } from "~/contracts/search/results";
import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { runDirectSearch } from "~/server/search-workflow/run-search";

import { parseSearchCommand } from "./input";

export async function searchDirect(
  intent: unknown,
  query: unknown,
  limit?: unknown,
): Promise<SearchDirectResult> {
  return runAction({
    name: "search.use",
    access: { kind: "permission", permission: "search:use" },
    parse: () => parseSearchCommand(intent, query, limit),
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
