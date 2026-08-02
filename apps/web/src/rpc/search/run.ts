import type { SearchDirectResult } from "~/contracts/search/results";
import { SEARCH_INTENTS } from "~/contracts/search/vocabulary";
import { application } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";

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

    execute: (ctx, command) =>
      application.search.runDirect(ctx, {
        ...command,
        actorUserId: ctx.actor.userId,
      }),
  });
}
