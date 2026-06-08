"use server";

import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import { parseObject, validationFail } from "~/server/shared/parsing";

export async function requestRateNegotiation(input: unknown) {
  return runAction({
    actionName: "workflow.request_rate_negotiation",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        leadId: r.str("leadId"),
        justification: r.str("justification"),
        artifactIds: r.strList("artifactIds"),
      })),

    audit: ({ leadId }) => ({ leadId }),

    execute: ({ actor }, payload) =>
      getServerRuntime().workflow.commands.requestRateNegotiation({
        actor: {
          userId: actor.userId,
          role: actor.role,
          branchId: actor.branchId,
        },
        ...payload,
      }),
  });
}
