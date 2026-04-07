import { hasPermission } from "~/lib/auth/access/rbac";
import { getSalesRecordAudit } from "~/server/sales-records/application/commands/shared";
import { computeClientCompletenessScore } from "~/server/sales/completeness";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import type {
  ContactAssignmentInteractionRepos,
  ContactAssignmentInteractionRunner,
} from "../infrastructure/interaction-context";
import type {
  CompleteContactAssignmentCallCommand,
  CompleteContactAssignmentCallResult,
} from "./types/complete-contact-assignment-call";

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

  const audit = getSalesRecordAudit(repos);
  const now = Date.now();
  const recordId = await repos.salesRecords.create({
    source: "lead_assignment",
    status: "draft",
    executive_user_id: input.actorUserId,
    lead_assignment_id: input.assignmentId,
    branch_id: input.branchId,
    submitted_at: null,
    confirmed_at: null,
    rejected_at: null,
    cancelled_at: null,
    created_at: now,
    updated_at: now,
  });
  await repos.salesRecords.upsertClient({
    sales_record_id: recordId,
    ruc: organization.ruc,
    company_name: organization.name,
    contact_name: contact.name,
    dni: contact.dni,
    phones_json: JSON.stringify(
      contact.phone_primary ? [contact.phone_primary] : [],
    ),
    engine_match_id: null,
    completeness_score: computeClientCompletenessScore({
      ruc: organization.ruc,
      companyName: organization.name,
      contactName: contact.name,
      dni: contact.dni,
      phones: contact.phone_primary ? [contact.phone_primary] : [],
      engineMatchId: null,
    }),
    created_at: now,
    updated_at: now,
  });
  await audit.log(
    input.actorUserId,
    "sales_record_created",
    "sales_record",
    recordId,
    { source: "lead_assignment" },
  );
  return Ok(recordId);
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
