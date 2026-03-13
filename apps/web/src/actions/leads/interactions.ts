"use server";

import { forbiddenError, internalError, notFoundError } from "~/lib/app-errors";
import { requirePermission } from "~/lib/auth/access/session";
import type { ActionSuccess } from "~/lib/contracts/common";
import { assertPositiveInt } from "~/lib/contracts/guards";
import { computeClientCompletenessScore } from "~/server/sales/completeness";
import {
  createSalesRecordsWorkflowService,
  type SalesRecordsWorkflowError,
} from "~/server/sales/records-service";
import { repos, runInRepositoryTransaction } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

import { throwLeadError } from "./error-mapping";

interface RegisterCallResult extends ActionSuccess {
  draftRecordId: number | null;
}

function throwSalesDraftError(error: SalesRecordsWorkflowError): never {
  switch (error.reason) {
    case "forbidden":
      throw forbiddenError(error.message);
    case "not_found":
      throw notFoundError(error.message);
    case "invalid_data":
    case "invalid_state":
    case "unexpected":
      throw internalError(error.message);
    default: {
      const exhausted: never = error;
      throw internalError(`Unhandled sales draft error: ${String(exhausted)}`);
    }
  }
}

export async function registerCall(
  assignmentId: number,
  contactId: number,
  outcome: string,
  notes?: string,
): Promise<RegisterCallResult> {
  const safeAssignmentId = assertPositiveInt(assignmentId, "assignmentId");
  const safeContactId = assertPositiveInt(contactId, "contactId");
  const session = await requirePermission("leads:read");
  if (outcome === "sale_made") {
    await requirePermission("sales:create");
  }

  const draftRecordId = await runInRepositoryTransaction(
    async (transactionRepos) => {
      const assignment =
        await transactionRepos.leadAssignments.findActiveByIdForUser(
          safeAssignmentId,
          session.userId,
        );
      if (!assignment || assignment.contact_id !== safeContactId) {
        throwLeadError({
          reason: "unexpected",
          message:
            "Lead assignment is not active or does not match the contact",
        });
      }

      let nextDraftRecordId: number | null = null;
      if (outcome === "sale_made") {
        const contact = await transactionRepos.contacts.findById(safeContactId);
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
          leadAssignmentId: safeAssignmentId,
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
          throwSalesDraftError(draftResult.error);
        }
        nextDraftRecordId = draftResult.value;
      }

      await transactionRepos.leadAssignments.markCompleted(
        safeAssignmentId,
        session.userId,
      );
      await transactionRepos.interactionLogs.create({
        contact_id: safeContactId,
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
