import { forbiddenError, notFoundError } from "~/lib/app-errors";
import { assertOwnedRecord } from "~/lib/auth/access/ownership";
import { computeClientCompletenessScore } from "~/server/sales/completeness";
import type { AppContext } from "~/server/shared/action-runtime";

import type {
  SalesRecordBootstrap,
  SalesRecordFixContext,
  SalesRecordProductOption,
  SalesRecordQueueItem,
} from "../domain/types";
import type { SalesRecordDeps } from "../infrastructure/deps";

function mapQueueItem(
  row: Awaited<
    ReturnType<
      SalesRecordDeps["repos"]["salesRecords"]["listPendingWithClient"]
    >
  >[number],
): SalesRecordQueueItem {
  return {
    id: row.id,
    status: row.status,
    companyName: row.company_name,
    contactName: row.contact_name,
    contactDni: row.dni,
    executiveName: row.executive_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parsePhonesJson(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return [];
  }
}

export async function listProducts(
  deps: Pick<SalesRecordDeps, "repos">,
): Promise<SalesRecordProductOption[]> {
  return deps.repos.products.findActive();
}

export async function getBootstrap(
  ctx: AppContext,
  deps: Pick<SalesRecordDeps, "repos">,
  input: { contactId: number | null },
): Promise<SalesRecordBootstrap> {
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

  const assignment = await deps.repos.leadAssignments.findActiveForContact(
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

export async function listPending(
  ctx: AppContext,
  deps: Pick<SalesRecordDeps, "repos">,
): Promise<SalesRecordQueueItem[]> {
  const rows = await deps.repos.salesRecords.listPendingWithClient(
    ctx.actor.role === "superuser"
      ? undefined
      : { branchId: ctx.actor.branchId },
  );
  return rows.map(mapQueueItem);
}

export async function listConfirmed(
  ctx: AppContext,
  deps: Pick<SalesRecordDeps, "repos">,
): Promise<SalesRecordQueueItem[]> {
  const scope =
    ctx.actor.role === "executive"
      ? { executiveUserId: ctx.actor.userId }
      : ctx.actor.role === "superuser"
        ? undefined
        : { branchId: ctx.actor.branchId };
  const rows = await deps.repos.salesRecords.listConfirmedWithClient(scope);
  return rows.map(mapQueueItem);
}

export async function getFixContext(
  ctx: AppContext,
  deps: Pick<SalesRecordDeps, "repos">,
  input: { recordId: number },
): Promise<SalesRecordFixContext> {
  const record = assertOwnedRecord(
    await deps.repos.salesRecords.findById(input.recordId),
    (r) => r.executive_user_id,
    ctx.actor,
    { resourceName: "Sales record" },
  );

  const [client, addresses, products, attempts] = await Promise.all([
    deps.repos.salesRecords.findClientByRecord(input.recordId),
    deps.repos.salesRecords.findAddressesByRecord(input.recordId),
    deps.repos.salesRecords.findProductsByRecord(input.recordId),
    deps.repos.salesRecords.listAttemptsByRecord(input.recordId),
  ]);

  return {
    id: record.id,
    status: record.status,
    client: client
      ? {
          ruc: client.ruc,
          companyName: client.company_name,
          contactName: client.contact_name,
          dni: client.dni,
          phones: parsePhonesJson(client.phones_json),
        }
      : null,
    addresses: addresses.map((address) => ({
      id: address.id,
      addressType: address.address_type,
      fullText: address.full_text,
      isPrimary: address.is_primary,
    })),
    products: products.map((product) => ({
      id: product.product_id,
      productName: product.product_name_snapshot,
      quantity: product.quantity,
    })),
    attempts: attempts.map((attempt) => ({
      id: attempt.id,
      outcome: attempt.outcome,
      notes: attempt.notes,
      nextAttemptAt: attempt.next_attempt_at,
      createdAt: attempt.created_at,
      reviewerName: attempt.reviewer_name,
    })),
  };
}
