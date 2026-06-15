"use server";

import { MONEDAS } from "~/contracts/workflow/vocabulary";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import { fail } from "~/server/shared/domain-error";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { Err, Ok } from "~/server/shared/result";

import { workflowActor } from "./actor";

export async function requestRateProposal(input: unknown) {
  return runAction({
    name: "workflow.propose_rate",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        leadId: r.str("leadId"),
        tarifaDebito: r.num("tarifaDebito"),
        tarifaCredito: r.num("tarifaCredito"),
        tarifaForaneo: r.num("tarifaForaneo"),
        fee: r.num("fee"),
        paybackPricing: r.num("paybackPricing"),
        moneda: r.enum("moneda", MONEDAS),
      })),

    audit: ({ leadId }) => ({ leadId }),

    execute: ({ actor }, payload) =>
      getServerRuntime().workflow.commands.proposeRate({
        actor: workflowActor(actor),
        ...payload,
      }),
  });
}

export async function requestRateAcceptance(input: unknown) {
  return runAction({
    name: "workflow.accept_rate",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        leadId: r.str("leadId"),
        proposalId: r.str("proposalId"),
      })),

    audit: ({ leadId }) => ({ leadId }),

    execute: ({ actor }, payload) =>
      getServerRuntime().workflow.commands.acceptRate({
        actor: workflowActor(actor),
        ...payload,
      }),
  });
}

export async function requestRateRevision(input: unknown) {
  return runAction({
    name: "workflow.request_rate_revision",
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
        return Err(fail("artifact_id_required"));
      }

      return Ok(parsed.value);
    },

    audit: ({ leadId }) => ({ leadId }),

    execute: ({ actor }, payload) =>
      getServerRuntime().workflow.commands.requestRateRevision({
        actor: workflowActor(actor),
        leadId: payload.leadId,
        justification: payload.justification,
        artifactIds: payload.artifactIds,
      }),
  });
}
