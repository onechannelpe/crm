"use server";

import { MAX_RATE_REVISION_FILES } from "~/contracts/workflow/limits";
import { CURRENCIES } from "~/contracts/workflow/vocabulary";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { acceptRateCommand } from "~/server/workflow/lead/write/accept-rate";
import { editRateProposalCommand } from "~/server/workflow/lead/write/edit-rate-proposal";
import { proposeRateCommand } from "~/server/workflow/lead/write/propose-rate";
import { requestRateRevisionCommand } from "~/server/workflow/lead/write/request-rate-revision";

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
      proposeRateCommand(
        { actor: workflowActor(actor), ...payload },
        getServerRuntime().workflow.ports(),
      ),
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
      editRateProposalCommand(
        { actor: workflowActor(actor), ...payload },
        getServerRuntime().workflow.ports(),
      ),
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
      acceptRateCommand(
        { actor: workflowActor(actor), ...payload },
        getServerRuntime().workflow.ports(),
      ),
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
      requestRateRevisionCommand(
        {
          actor: workflowActor(actor),
          leadId: payload.leadId,
          justification: payload.justification,
          artifactIds: payload.artifactIds,
        },
        getServerRuntime().workflow.ports(),
      ),
  });
}
