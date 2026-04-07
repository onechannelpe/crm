import { computeClientCompletenessScore } from "~/server/sales/completeness";
import type { AppContext } from "~/server/shared/action-runtime";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { SalesRecordReadContext } from "../../infrastructure/read-context";
import type { SalesRecordBootstrapView } from "../contracts";

export async function getBootstrap(
  ctx: AppContext,
  deps: SalesRecordReadContext,
  input: { contactId: number | null },
): Promise<Result<SalesRecordBootstrapView, DomainError>> {
  if (input.contactId === null) {
    return Ok({
      source: "manual",
      leadAssignmentId: null,
      client: {
        ruc: null,
        companyName: null,
        contactName: null,
        dni: null,
        phones: [],
        engineMatchId: null,
        completenessScore: computeClientCompletenessScore({
          ruc: null,
          companyName: null,
          contactName: null,
          dni: null,
          phones: [],
          engineMatchId: null,
        }),
      },
    });
  }

  const assignment = await deps.repos.contactAssignments.findActiveForContact(
    ctx.actor.userId,
    input.contactId,
  );
  if (!assignment) {
    return Err(
      domainError(
        "forbidden",
        "forbidden",
        "You can only create sales from your active assigned leads",
      ),
    );
  }

  const contact = await deps.repos.contacts.findById(input.contactId);
  if (!contact) {
    return Err(domainError("not_found", "not_found", "Contact not found"));
  }

  const organization = await deps.repos.organizations.findById(
    contact.organization_id,
  );
  if (!organization) {
    return Err(domainError("not_found", "not_found", "Organization not found"));
  }

  return Ok({
    source: "lead_assignment",
    leadAssignmentId: assignment.id,
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
  });
}
