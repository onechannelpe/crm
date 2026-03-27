"use server";

import { forbiddenError, notFoundError } from "~/lib/app-errors";
import { assertOwnedRecord } from "~/lib/auth/access/ownership";
import { requirePermission } from "~/lib/auth/access/session";
import { computeClientCompletenessScore } from "~/server/sales/completeness";
import { repos } from "~/server/shared/context";

import { parseSalesContactId, parseSalesRecordId } from "./input";
import type {
  SalesRecordBootstrap,
  SalesRecordFixContext,
  SalesRecordProductOption,
  SalesRecordQueueItem,
} from "./types";

function mapQueueItem(
  row: Awaited<
    ReturnType<typeof repos.salesRecords.listPendingWithClient>
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
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return [];
  }
}

export async function listSalesRecordProducts(): Promise<
  SalesRecordProductOption[]
> {
  await requirePermission("sales:create");
  return repos.products.findActive();
}

export async function getSalesRecordBootstrap(
  contactId: number | null,
): Promise<SalesRecordBootstrap> {
  const session = await requirePermission("sales:create");

  if (contactId === null) {
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

  const safeContactId = parseSalesContactId(contactId);
  const assignment = await repos.leadAssignments.findActiveForContact(
    session.userId,
    safeContactId,
  );
  if (!assignment) {
    throw forbiddenError(
      "You can only create sales from your active assigned leads",
    );
  }

  const contact = await repos.contacts.findById(safeContactId);
  if (!contact) throw notFoundError("Contact not found");

  const organization = await repos.organizations.findById(
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

export async function listPendingSalesRecords(): Promise<
  SalesRecordQueueItem[]
> {
  const session = await requirePermission("sales:review");
  const rows = await repos.salesRecords.listPendingWithClient(
    session.role === "superuser" ? undefined : { branchId: session.branchId },
  );
  return rows.map(mapQueueItem);
}

export async function listConfirmedSalesRecords(): Promise<
  SalesRecordQueueItem[]
> {
  const session = await requirePermission("sales:review");
  const scope =
    session.role === "executive"
      ? { executiveUserId: session.userId }
      : session.role === "superuser"
        ? undefined
        : { branchId: session.branchId };
  const rows = await repos.salesRecords.listConfirmedWithClient(scope);
  return rows.map(mapQueueItem);
}

export async function getSalesRecordFixContext(
  recordId: number,
): Promise<SalesRecordFixContext> {
  const safeRecordId = parseSalesRecordId(recordId);
  const session = await requirePermission("sales:create");
  const record = assertOwnedRecord(
    await repos.salesRecords.findById(safeRecordId),
    (r) => r.executive_user_id,
    session,
    { resourceName: "Sales record" },
  );

  const [client, addresses, products, attempts] = await Promise.all([
    repos.salesRecords.findClientByRecord(safeRecordId),
    repos.salesRecords.findAddressesByRecord(safeRecordId),
    repos.salesRecords.findProductsByRecord(safeRecordId),
    repos.salesRecords.listAttemptsByRecord(safeRecordId),
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
