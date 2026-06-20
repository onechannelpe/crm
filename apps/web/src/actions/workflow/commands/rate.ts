"use server";

import { MAX_RATE_REVISION_FILES } from "~/contracts/workflow/limits";
import { CURRENCIES } from "~/contracts/workflow/vocabulary";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { parseObject, validationFail } from "~/server/shared/parsing";

import { workflowActor } from "./actor";

export async function requestRateProposal(input: unknown) {
  return runAction({
    name: "workflow.propose_rate",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        leadId: r.str("leadId"),
        proposedDebitRate: r.num("proposedDebitRate"),
        proposedCreditRate: r.num("proposedCreditRate"),
        proposedForeignRate: r.num("proposedForeignRate"),
        fee: r.num("fee"),
        paybackPricing: r.num("paybackPricing"),
        currency: r.enum("currency", CURRENCIES),
      })),

    audit: ({ leadId }) => ({ leadId }),

    execute: ({ actor }, payload) =>
      getServerRuntime().workflow.commands.proposeRate({
        actor: workflowActor(actor),
        ...payload,
      }),
  });
}

export async function requestRateProposalEdit(input: unknown) {
  return runAction({
    name: "workflow.edit_rate_proposal",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        leadId: r.str("leadId"),
        proposalId: r.str("proposalId"),
        proposedDebitRate: r.num("proposedDebitRate"),
        proposedCreditRate: r.num("proposedCreditRate"),
        proposedForeignRate: r.num("proposedForeignRate"),
        fee: r.num("fee"),
        paybackPricing: r.num("paybackPricing"),
        currency: r.enum("currency", CURRENCIES),
      })),

    audit: ({ leadId }) => ({ leadId }),

    execute: ({ actor }, payload) =>
      getServerRuntime().workflow.commands.editRateProposal({
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

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        leadId: r.str("leadId"),
        justification: r.str("justification"),
        artifactIds: r.strList("artifactIds", {
          min: 1,
          max: MAX_RATE_REVISION_FILES,
          unique: true,
        }),
      })),

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
