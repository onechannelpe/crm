"use server";

import { throwDomainError } from "~/actions/throw-domain-error";
import { forbiddenError, notFoundError } from "~/lib/app-errors";
import { assertOwnedRecord } from "~/lib/auth/access/ownership";
import type { Role } from "~/lib/auth/access/rbac";
import { requirePermission } from "~/lib/auth/access/session";
import type { ActionSuccess } from "~/lib/contracts/common";
import { runObservedAction } from "~/lib/observability/run-observed-action";
import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import { computeClientCompletenessScore } from "~/server/sales/completeness";
import { repos, salesRecordsService } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

import {
  parseCreateSalesRecordDraftInput,
  parseRejectSalesRecordInput,
  parseSalesContactId,
  parseSalesRecordAttemptInput,
  parseSalesRecordId,
  parseUpdateSalesRecordDraftInput,
} from "./input";
import type {
  CreateSalesRecordDraftInput,
  SalesRecordBootstrap,
  SalesRecordFixContext,
  SalesRecordProductOption,
  SalesRecordQueueItem,
} from "./types";

export type {
  CreateSalesRecordDraftInput,
  SalesRecordAddressInput,
  SalesRecordBootstrap,
  SalesRecordClientInput,
  SalesRecordFixContext,
  SalesRecordProductInput,
  SalesRecordProductOption,
  SalesRecordQueueItem,
  SalesRecordSource,
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

export async function createSalesRecordDraft(
  input: CreateSalesRecordDraftInput,
): Promise<{ id: number }> {
  const parsedInput = parseCreateSalesRecordDraftInput(input);

  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "sales_records.create_draft",
    actor,
    input: {
      source: parsedInput.source,
      addresses: parsedInput.addresses.length,
      products: parsedInput.products.length,
    },
    run: async () => {
      const session = await requirePermission("sales:create");
      actor.userId = session.userId;
      actor.role = session.role;
      await checkActionRateLimit(
        "sales_records.create_draft",
        session.userId,
        repos,
      );

      const result = await salesRecordsService.createDraft({
        source: parsedInput.source,
        executiveUserId: session.userId,
        branchId: session.branchId,
        leadAssignmentId: parsedInput.leadAssignmentId,
        client: {
          ...parsedInput.client,
          completenessScore: computeClientCompletenessScore(parsedInput.client),
        },
        addresses: parsedInput.addresses,
        products: parsedInput.products,
      });
      if (isErr(result)) throwDomainError(result.error);
      return { id: result.value };
    },
  });
}

export async function submitSalesRecord(
  recordId: number,
): Promise<ActionSuccess> {
  const safeRecordId = parseSalesRecordId(recordId);
  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "sales_records.submit",
    actor,
    input: { recordId: safeRecordId },
    run: async () => {
      const session = await requirePermission("sales:submit");
      actor.userId = session.userId;
      actor.role = session.role;
      await checkActionRateLimit("sales_records.submit", session.userId, repos);
      const result = await salesRecordsService.submit(
        safeRecordId,
        session.userId,
      );
      if (isErr(result)) throwDomainError(result.error);
      return { success: true };
    },
  });
}

export async function confirmSalesRecord(
  recordId: number,
): Promise<ActionSuccess> {
  const safeRecordId = parseSalesRecordId(recordId);
  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "sales_records.confirm",
    actor,
    input: { recordId: safeRecordId },
    run: async () => {
      const session = await requirePermission("sales:approve");
      actor.userId = session.userId;
      actor.role = session.role;
      const result = await salesRecordsService.confirm(
        safeRecordId,
        session.userId,
        session.branchId,
        session.role === "superuser",
      );
      if (isErr(result)) throwDomainError(result.error);
      return { success: true };
    },
  });
}

export async function rejectSalesRecord(
  recordId: number,
  reason: string,
): Promise<ActionSuccess> {
  const parsedInput = parseRejectSalesRecordInput(recordId, reason);
  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "sales_records.reject",
    actor,
    input: { recordId: parsedInput.recordId },
    run: async () => {
      const session = await requirePermission("sales:approve");
      actor.userId = session.userId;
      actor.role = session.role;
      const result = await salesRecordsService.reject(
        parsedInput.recordId,
        session.userId,
        session.branchId,
        session.role === "superuser",
        parsedInput.reason,
      );
      if (isErr(result)) throwDomainError(result.error);
      return { success: true };
    },
  });
}

export async function cancelSalesRecord(
  recordId: number,
): Promise<ActionSuccess> {
  const safeRecordId = parseSalesRecordId(recordId);
  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "sales_records.cancel",
    actor,
    input: { recordId: safeRecordId },
    run: async () => {
      const session = await requirePermission("sales:create");
      actor.userId = session.userId;
      actor.role = session.role;
      const result = await salesRecordsService.cancel(
        safeRecordId,
        session.userId,
      );
      if (isErr(result)) throwDomainError(result.error);
      return { success: true };
    },
  });
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

export async function updateSalesRecordDraft(
  recordId: number,
  input: Omit<CreateSalesRecordDraftInput, "source" | "leadAssignmentId">,
  correctionNotes: string | null = null,
): Promise<ActionSuccess> {
  const parsedInput = parseUpdateSalesRecordDraftInput(
    recordId,
    input,
    correctionNotes,
  );

  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "sales_records.update_draft",
    actor,
    input: {
      recordId: parsedInput.recordId,
      addresses: parsedInput.input.addresses.length,
      products: parsedInput.input.products.length,
      hasCorrectionNotes: parsedInput.correctionNotes !== null,
    },
    run: async () => {
      const session = await requirePermission("sales:create");
      actor.userId = session.userId;
      actor.role = session.role;

      const result = await salesRecordsService.updateDraft(
        parsedInput.recordId,
        session.userId,
        {
          ...parsedInput.input,
          client: {
            ...parsedInput.input.client,
            completenessScore: computeClientCompletenessScore(
              parsedInput.input.client,
            ),
          },
        },
        parsedInput.correctionNotes,
      );
      if (isErr(result)) throwDomainError(result.error);
      return { success: true };
    },
  });
}

export async function registerSalesRecordAttempt(
  recordId: number,
  outcome: string,
  notes: string | null = null,
  nextAttemptAt: number | null = null,
): Promise<ActionSuccess> {
  const parsedInput = parseSalesRecordAttemptInput(
    recordId,
    outcome,
    notes,
    nextAttemptAt,
  );
  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "sales_records.attempt",
    actor,
    input: { recordId: parsedInput.recordId, outcome: parsedInput.outcome },
    run: async () => {
      const session = await requirePermission("sales:approve");
      actor.userId = session.userId;
      actor.role = session.role;
      const result = await salesRecordsService.registerAttempt(
        parsedInput.recordId,
        session.userId,
        session.branchId,
        session.role === "superuser",
        parsedInput.outcome,
        parsedInput.notes,
        parsedInput.nextAttemptAt,
      );
      if (isErr(result)) throwDomainError(result.error);
      return { success: true };
    },
  });
}
