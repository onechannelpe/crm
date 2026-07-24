import type { CreateLeadInput } from "~/contracts/workflow/inputs";
import { assignOrganizationOwner } from "~/server/organization/ownership";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { withAdvisoryLock } from "~/server/shared/db-lock";
import { fail, type DomainError } from "~/server/shared/domain-error";
import type { WorkflowLeadId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/actor";
import { convertInquiryOnRegistration } from "~/server/workflow/inquiry/convert";
import {
  createInquiryRepo,
  type InquiryRow,
} from "~/server/workflow/inquiry/repo";
import { reassignLead } from "~/server/workflow/lead/domain/decide";
import { createHistoryEvent } from "~/server/workflow/lead/domain/history";
import { resolvePendingQuotationPolicy } from "~/server/workflow/lead/domain/pending-quotation";
import {
  createLeadDraft,
  type LeadCommercialScope,
  type LeadState,
} from "~/server/workflow/lead/domain/state";

import { runLeadTransaction } from "../write/transition";

type RegistrationPorts = {
  executor: DatabaseExecutor;
  now: Date;
};

export function reassignRegisteredLead(input: {
  leadId: WorkflowLeadId;
  actor: WorkflowActor;
  inquiry?: InquiryRow;
  ports: RegistrationPorts;
}): Promise<Result<{ leadId: WorkflowLeadId }, DomainError>> {
  return runLeadTransaction(input.ports, async (ctx) => {
    const state = await ctx.repos.leads.findById(input.leadId);
    if (!state) return Err(fail("lead_not_found"));

    const transition = reassignLead(state, {
      actor: input.actor,
      toExecutiveId: input.actor.userId,
      now: ctx.now,
    });
    if (!transition.ok) return transition;

    const committed = await ctx.commitTransition(transition.value, {
      toExecutiveId: input.actor.userId,
      assignedBy: input.actor.userId,
      at: ctx.now,
    });
    if (!committed.ok) return committed;

    // The reassigned lead already carries its own status and priority, so the
    // inquiry only links up; no answer carry-over.
    if (input.inquiry) {
      await createInquiryRepo(ctx.tx).markConverted(
        input.inquiry.id,
        state.id,
        ctx.now,
      );
    }

    return Ok({ leadId: state.id });
  });
}

export function createRegisteredLead(input: {
  command: CreateLeadInput;
  actor: WorkflowActor;
  ruc: string;
  commercialScope: LeadCommercialScope;
  enrichment: { legalName: string | null; address: string | null } | null;
  inquiry?: InquiryRow;
  ports: RegistrationPorts;
}): Promise<Result<{ leadId: WorkflowLeadId }, DomainError>> {
  return runLeadTransaction(input.ports, (ctx) =>
    // Locked per executive so the cap read and the insert that pushes past
    // it can never interleave: two concurrent registrations by the same
    // executive serialize here instead of both reading "under the cap".
    withAdvisoryLock(
      ctx.tx,
      `lead-registration:${input.actor.userId}`,
      async () => {
        const branchPolicy =
          await ctx.repos.pendingQuotationPolicies.findByBranchId(
            input.actor.branchId,
          );
        const { limit } = resolvePendingQuotationPolicy({ branchPolicy });
        if (limit !== null) {
          const pendingDecisions =
            await ctx.repos.leads.countPendingQuotationDecisions(
              input.actor.userId,
              ctx.now,
            );
          if (pendingDecisions >= limit) {
            return Err(fail("pending_quotation_limit"));
          }
        }

        const organization = await ctx.repos.organization.upsertOrganization({
          ruc: input.ruc,
          legalName: input.enrichment?.legalName ?? null,
          lineOfBusiness: input.command.lineOfBusiness,
          address: input.enrichment?.address ?? null,
        });

        const draft = createLeadDraft({
          organizationId: organization.id,
          ruc: input.ruc,
          legalName: organization.legalName,
          address: organization.address,
          executiveId: input.actor.userId,
          createdBy: input.actor.userId,
          commercialScope: input.commercialScope,
          now: ctx.now,
        });
        if (!draft.ok) return draft;

        const leadId = await ctx.repos.leads.insert(draft.value);
        const assigned = await assignOrganizationOwner(ctx.tx, {
          organizationId: organization.id,
          executiveId: input.actor.userId,
          assignedBy: input.actor.userId,
          at: ctx.now,
          reason: "lead_registration",
        });
        if (!assigned.ok) return assigned;

        const appended = await ctx.appendFacts([
          createHistoryEvent({
            leadId,
            eventType: "lead_registered",
            actorUserId: input.actor.userId,
            payload: { ruc: draft.value.ruc, toStage: "QUALIFYING" },
            occurredAt: ctx.now,
          }),
          createHistoryEvent({
            leadId,
            eventType: "lead_assigned",
            actorUserId: input.actor.userId,
            subjectUserId: input.actor.userId,
            payload: { executiveId: input.actor.userId },
            occurredAt: ctx.now,
          }),
        ]);
        if (!appended.ok) return appended;

        if (input.inquiry) {
          const bornState: LeadState = {
            ...draft.value,
            id: leadId,
            version: 0,
            deletedAt: null,
          };
          const converted = await convertInquiryOnRegistration(ctx, {
            inquiry: input.inquiry,
            leadId,
            bornState,
          });
          if (!converted.ok) return converted;
        }

        return Ok({ leadId });
      },
    ),
  );
}
