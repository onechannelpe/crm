"use server";

import { MAX_RATE_REVISION_FILES } from "~/contracts/workflow/limits";
import { CLOSE_REASONS, CURRENCIES } from "~/contracts/workflow/vocabulary";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import {
  WorkflowLeadId,
  WorkflowRateProposalId,
  WorkflowRateRevisionFileId,
} from "~/server/shared/ids";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { acceptRateCommand } from "~/server/workflow/lead/commands/accept-rate";
import { closeLeadCommand } from "~/server/workflow/lead/commands/close-lead";
import { editRateProposalCommand } from "~/server/workflow/lead/commands/edit-rate-proposal";
import { proposeRateCommand } from "~/server/workflow/lead/commands/propose-rate";
import { requestRateRevisionCommand } from "~/server/workflow/lead/commands/request-rate-revision";

import { workflowActor } from "./actor";

export async function requestRateProposal(input: unknown) {
  return runAction({
    name: "workflow.propose_rate",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        leadId: r.id("leadId", WorkflowLeadId),
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
        leadId: r.id("leadId", WorkflowLeadId),
        proposalId: r.id("proposalId", WorkflowRateProposalId),
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
        leadId: r.id("leadId", WorkflowLeadId),
        proposalId: r.id("proposalId", WorkflowRateProposalId),
      })),

    audit: ({ leadId }) => ({ leadId }),

    execute: ({ actor }, payload) =>
      acceptRateCommand(
        { actor: workflowActor(actor), ...payload },
        getServerRuntime().workflow.ports(),
      ),
  });
}

export async function requestLeadClosure(input: unknown) {
  return runAction({
    name: "workflow.close_lead",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        leadId: r.id("leadId", WorkflowLeadId),
        reason: r.enum("reason", CLOSE_REASONS),
        note: r.optStr("note"),
      })),

    audit: ({ leadId }) => ({ leadId }),

    execute: ({ actor }, payload) =>
      closeLeadCommand(
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
        leadId: r.id("leadId", WorkflowLeadId),
        justification: r.str("justification"),
        fileIds: r.idList("fileIds", WorkflowRateRevisionFileId, {
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
          fileIds: payload.fileIds,
        },
        getServerRuntime().workflow.ports(),
      ),
  });
}
