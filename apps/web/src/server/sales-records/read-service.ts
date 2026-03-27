import { forbiddenError, notFoundError } from "~/lib/app-errors";
import { assertOwnedRecord } from "~/lib/auth/access/ownership";
import type { AppContext } from "~/server/shared/action-runtime";

import { computeClientCompletenessScore } from "./domain";
import { salesRecordRepos } from "./repos";
import type {
  SalesRecordBootstrap,
  SalesRecordFixContext,
  SalesRecordProductOption,
  SalesRecordQueueItem,
} from "./types";

function mapQueueItem(
  row: Awaited<
    ReturnType<typeof salesRecordRepos.salesRecords.listPendingWithClient>
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

export async function listProducts(): Promise<SalesRecordProductOption[]> {
  return salesRecordRepos.products.findActive();
}

export async function getBootstrap(
  ctx: AppContext,
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

  const assignment =
    await salesRecordRepos.leadAssignments.findActiveForContact(
      ctx.actor.userId,
      input.contactId,
    );
  if (!assignment) {
    throw forbiddenError(
      "You can only create sales from your active assigned leads",
    );
  }

  const contact = await salesRecordRepos.contacts.findById(input.contactId);
  if (!contact) throw notFoundError("Contact not found");

  const organization = await salesRecordRepos.organizations.findById(
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
): Promise<SalesRecordQueueItem[]> {
  const rows = await salesRecordRepos.salesRecords.listPendingWithClient(
    ctx.actor.role === "superuser"
      ? undefined
      : { branchId: ctx.actor.branchId },
  );
  return rows.map(mapQueueItem);
}

export async function listConfirmed(
  ctx: AppContext,
): Promise<SalesRecordQueueItem[]> {
  const scope =
    ctx.actor.role === "executive"
      ? { executiveUserId: ctx.actor.userId }
      : ctx.actor.role === "superuser"
        ? undefined
        : { branchId: ctx.actor.branchId };
  const rows =
    await salesRecordRepos.salesRecords.listConfirmedWithClient(scope);
  return rows.map(mapQueueItem);
}

export async function getFixContext(
  ctx: AppContext,
  input: { recordId: number },
): Promise<SalesRecordFixContext> {
  const record = assertOwnedRecord(
    await salesRecordRepos.salesRecords.findById(input.recordId),
    (r) => r.executive_user_id,
    ctx.actor,
    { resourceName: "Sales record" },
  );

  const [client, addresses, products, attempts] = await Promise.all([
    salesRecordRepos.salesRecords.findClientByRecord(input.recordId),
    salesRecordRepos.salesRecords.findAddressesByRecord(input.recordId),
    salesRecordRepos.salesRecords.findProductsByRecord(input.recordId),
    salesRecordRepos.salesRecords.listAttemptsByRecord(input.recordId),
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
