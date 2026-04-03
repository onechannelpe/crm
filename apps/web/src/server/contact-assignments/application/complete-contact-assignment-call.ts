import { hasPermission, type Role } from "~/lib/auth/access/rbac";
import type { ActionSuccess } from "~/lib/contracts/common";
import { createSalesRecordsWorkflowService } from "~/server/sales-records/application/workflow-service";
import { computeClientCompletenessScore } from "~/server/sales/completeness";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import type { BranchId, UserId } from "~/server/shared/ids";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import type {
  ContactAssignmentInteractionRepos,
  ContactAssignmentInteractionRunner,
} from "../infrastructure/interaction-context";

export type CompleteContactAssignmentCallResult = ActionSuccess & {
  draftRecordId: number | null;
};

export type CompleteContactAssignmentCallCommand = {
  actorUserId: UserId;
  actorRole: Role;
  branchId: BranchId;
  assignmentId: number;
  contactId: number;
  outcome: string;
  notes: string | null;
};

function rejectMismatchedAssignment(): Result<never, DomainError> {
  return Err(
    domainError(
      "unexpected",
      "unexpected",
      "Contact assignment is not active or does not match the contact",
    ),
  );
}

async function createDraftRecordFromAssignment(
  input: CompleteContactAssignmentCallCommand,
  repos: ContactAssignmentInteractionRepos,
): Promise<Result<number, DomainError>> {
  const contact = await repos.contacts.findById(input.contactId);
  if (!contact) {
    return Err(
      domainError("not_found", "contact_not_found", "Contact not found"),
    );
  }

  const organization = await repos.organizations.findById(
    contact.organization_id,
  );
  if (!organization) {
    return Err(
      domainError(
        "not_found",
        "organization_not_found",
        "Organization not found",
      ),
    );
  }

  const salesRecords = createSalesRecordsWorkflowService(repos);
  return salesRecords.createDraft({
    source: "lead_assignment",
    executiveUserId: input.actorUserId,
    branchId: input.branchId,
    leadAssignmentId: input.assignmentId,
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
}

async function completeAssignmentInteraction(
  input: CompleteContactAssignmentCallCommand,
  repos: ContactAssignmentInteractionRepos,
): Promise<Result<CompleteContactAssignmentCallResult, DomainError>> {
  const assignment = await repos.contactAssignments.findActiveByIdForUser(
    input.assignmentId,
    input.actorUserId,
  );
  if (!assignment || assignment.contact_id !== input.contactId) {
    return rejectMismatchedAssignment();
  }

  let draftRecordId: number | null = null;
  if (input.outcome === "sale_made") {
    const draftResult = await createDraftRecordFromAssignment(input, repos);
    if (isErr(draftResult)) {
      return draftResult;
    }
    draftRecordId = draftResult.value;
  }

  await repos.contactAssignments.markCompleted(
    input.assignmentId,
    input.actorUserId,
  );
  await repos.interactionLogs.create({
    contact_id: input.contactId,
    user_id: input.actorUserId,
    outcome: input.outcome,
    notes: input.notes,
    duration_seconds: null,
    created_at: Date.now(),
  });

  return Ok({ success: true, draftRecordId });
}

export function completeContactAssignmentCall(
  input: CompleteContactAssignmentCallCommand,
  runInTransaction: ContactAssignmentInteractionRunner,
): Promise<Result<CompleteContactAssignmentCallResult, DomainError>> {
  if (
    input.outcome === "sale_made" &&
    !hasPermission(input.actorRole, "sales:create")
  ) {
    return Promise.resolve(
      Err(domainError("forbidden", "forbidden", "Access denied")),
    );
  }

  return runInTransaction((repos) =>
    completeAssignmentInteraction(input, repos),
  );
}
