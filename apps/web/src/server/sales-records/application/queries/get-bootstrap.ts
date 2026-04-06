import { forbiddenError, notFoundError } from "~/lib/app-errors";
import { computeClientCompletenessScore } from "~/server/sales/completeness";
import type { AppContext } from "~/server/shared/action-runtime";

import type { SalesRecordReadContext } from "../../infrastructure/read-context";
import type { SalesRecordBootstrapView } from "./views/sales-record-view";

export async function getBootstrap(
  ctx: AppContext,
  deps: SalesRecordReadContext,
  input: { contactId: number | null },
): Promise<SalesRecordBootstrapView> {
  if (input.contactId === null) {
    return {
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
    };
  }

  const assignment = await deps.repos.contactAssignments.findActiveForContact(
    ctx.actor.userId,
    input.contactId,
  );
  if (!assignment) {
    throw forbiddenError(
      "You can only create sales from your active assigned leads",
    );
  }

  const contact = await deps.repos.contacts.findById(input.contactId);
  if (!contact) throw notFoundError("Contact not found");

  const organization = await deps.repos.organizations.findById(
    contact.organization_id,
  );
  if (!organization) throw notFoundError("Organization not found");

  return {
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
  };
}
