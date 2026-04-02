"use server";

import { throwDomainError } from "~/actions/throw-domain-error";
import { requirePermission } from "~/lib/auth/access/session";
import type { ActionSuccess } from "~/lib/contracts/common";
import { assertPositiveInt } from "~/lib/contracts/guards";
import { computeClientCompletenessScore } from "~/server/sales/completeness";
import { createSalesRecordsWorkflowService } from "~/server/sales/records-service";
import { runInRepositoryTransaction } from "~/server/shared/context";
import { domainError } from "~/server/shared/domain-error";
import { isErr } from "~/server/shared/result";

interface CompleteContactAssignmentCallResult extends ActionSuccess {
  draftRecordId: number | null;
}

function parseCompleteContactAssignmentCallInput(input: {
  assignmentId: number;
  contactId: number;
}): { assignmentId: number; contactId: number } {
  return {
    assignmentId: assertPositiveInt(input.assignmentId, "assignmentId"),
    contactId: assertPositiveInt(input.contactId, "contactId"),
  };
}

export async function completeContactAssignmentCall(
  assignmentId: number,
  contactId: number,
  outcome: string,
  notes?: string,
): Promise<CompleteContactAssignmentCallResult> {
  const parsedInput = parseCompleteContactAssignmentCallInput({
    assignmentId,
    contactId,
  });
  const session = await requirePermission("lead:work");
  if (outcome === "sale_made") {
    await requirePermission("sales:create");
  }

  const draftRecordId = await runInRepositoryTransaction(
    async (transactionRepos) => {
      const assignment =
        await transactionRepos.contactAssignments.findActiveByIdForUser(
          parsedInput.assignmentId,
          session.userId,
        );
      if (!assignment || assignment.contact_id !== parsedInput.contactId) {
        throwDomainError(
          domainError(
            "unexpected",
            "unexpected",
            "Contact assignment is not active or does not match the contact",
          ),
        );
      }

      let nextDraftRecordId: number | null = null;
      if (outcome === "sale_made") {
        const contact = await transactionRepos.contacts.findById(
          parsedInput.contactId,
        );
        if (!contact) {
          throw new Error("Contact not found");
        }

        const organization = await transactionRepos.organizations.findById(
          contact.organization_id,
        );
        if (!organization) {
          throw new Error("Organization not found");
        }

        const salesRecords =
          createSalesRecordsWorkflowService(transactionRepos);
        const draftResult = await salesRecords.createDraft({
          source: "lead_assignment",
          executiveUserId: session.userId,
          branchId: session.branchId,
          leadAssignmentId: parsedInput.assignmentId,
          client: {
            ruc: organization.ruc,
            companyName: organization.name,
            contactName: contact.name,
            dni: contact.dni,
            phones: contact.phone_primary ? [contact.phone_primary] : [],
            engineMatchId: null,
            completenessScore: computeClientCompletenessScore({
              ruc: organization.ruc,
              companyName: organization.name,
              contactName: contact.name,
              dni: contact.dni,
              phones: contact.phone_primary ? [contact.phone_primary] : [],
              engineMatchId: null,
            }),
          },
          addresses: [],
          products: [],
        });
        if (isErr(draftResult)) {
          throwDomainError(draftResult.error);
        }
        nextDraftRecordId = draftResult.value;
      }

      await transactionRepos.contactAssignments.markCompleted(
        parsedInput.assignmentId,
        session.userId,
      );
      await transactionRepos.interactionLogs.create({
        contact_id: parsedInput.contactId,
        user_id: session.userId,
        outcome,
        notes: notes || null,
        duration_seconds: null,
        created_at: Date.now(),
      });

      return nextDraftRecordId;
    },
  );

  return { success: true, draftRecordId };
}
