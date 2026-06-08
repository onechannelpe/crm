"use server";

import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime/runtime";
import { domainError } from "~/server/shared/domain-error";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { Err, Ok } from "~/server/shared/result";

export async function requestRateNegotiation(input: unknown) {
  return runAction({
    name: "workflow.request_rate_negotiation",
    access: { kind: "auth" },

    parse: () => {
      const parsed = parseObject(input, validationFail, (r) => ({
        leadId: r.str("leadId"),
        justification: r.str("justification"),
        artifactIds: r.strList("artifactIds"),
      }));

      if (!parsed.ok) {
        return parsed;
      }

      if (parsed.value.artifactIds.some((artifactId) => !artifactId)) {
        return Err(
          domainError(
            "validation",
            "artifact_id_required",
            "Artifact id is required",
          ),
        );
      }

      return Ok(parsed.value);
    },

    audit: ({ leadId }) => ({ leadId }),

    execute: ({ actor }, payload) =>
      getServerRuntime().workflow.commands.requestRateNegotiation({
        actor: {
          userId: actor.userId,
          role: actor.role,
          branchId: actor.branchId,
        },
        leadId: payload.leadId,
        justification: payload.justification,
        artifactIds: payload.artifactIds,
      }),
  });
}
