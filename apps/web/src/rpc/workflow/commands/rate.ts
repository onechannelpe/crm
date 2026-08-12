import { MAX_RATE_REVISION_FILES } from "~/contracts/workflow/limits";
import { CLOSE_REASONS, CURRENCIES } from "~/contracts/workflow/vocabulary";
import {
  WorkflowLeadId,
  WorkflowRateProposalId,
  WorkflowRateRevisionFileId,
} from "~/domain/ids";
import { application } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { workflowActor } from "~/server/workflow/ui/actor";

export async function requestRateProposal(input: unknown) {
  "use server";

  return executeSessionServerFunction({
    name: "application.workflow.propose_rate",
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

    telemetry: ({ leadId }) => ({ leadId }),

    execute: (ctx, payload) =>
      application.workflow.commands.proposeRate(
        { actor: workflowActor(ctx.actor), ...payload },
        ctx,
      ),
  });
}

export async function requestRateProposalEdit(input: unknown) {
  "use server";

  return executeSessionServerFunction({
    name: "application.workflow.edit_rate_proposal",
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

    telemetry: ({ leadId }) => ({ leadId }),

    execute: (ctx, payload) =>
      application.workflow.commands.editRateProposal(
        { actor: workflowActor(ctx.actor), ...payload },
        ctx,
      ),
  });
}

export async function requestRateAcceptance(input: unknown) {
  "use server";

  return executeSessionServerFunction({
    name: "application.workflow.accept_rate",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        leadId: r.id("leadId", WorkflowLeadId),
        proposalId: r.id("proposalId", WorkflowRateProposalId),
      })),

    telemetry: ({ leadId }) => ({ leadId }),

    execute: (ctx, payload) =>
      application.workflow.commands.acceptRate(
        { actor: workflowActor(ctx.actor), ...payload },
        ctx,
      ),
  });
}

export async function requestLeadClosure(input: unknown) {
  "use server";

  return executeSessionServerFunction({
    name: "application.workflow.close_lead",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        leadId: r.id("leadId", WorkflowLeadId),
        reason: r.enum("reason", CLOSE_REASONS),
        note: r.optStr("note"),
      })),

    telemetry: ({ leadId }) => ({ leadId }),

    execute: (ctx, payload) =>
      application.workflow.commands.closeLead(
        { actor: workflowActor(ctx.actor), ...payload },
        ctx,
      ),
  });
}

export async function requestRateRevision(input: unknown) {
  "use server";

  return executeSessionServerFunction({
    name: "application.workflow.request_rate_revision",
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

    telemetry: ({ leadId }) => ({ leadId }),

    execute: (ctx, payload) =>
      application.workflow.commands.requestRateRevision(
        {
          actor: workflowActor(ctx.actor),
          leadId: payload.leadId,
          justification: payload.justification,
          fileIds: payload.fileIds,
        },
        ctx,
      ),
  });
}
