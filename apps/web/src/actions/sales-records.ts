"use server";

import type { Role } from "~/lib/auth/access/rbac";
import { requirePermission } from "~/lib/auth/access/session";
import type { ActionSuccess } from "~/lib/contracts/common";
import {
  assertNonEmptyString,
  assertPositiveInt,
} from "~/lib/contracts/guards";
import { runObservedAction } from "~/lib/observability/run-observed-action";
import { createSalesRecordsWorkflowService } from "~/server/sales/records-service";
import {
  repos,
  runInRepositoryTransaction,
  salesRecordsService,
} from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

type SalesRecordSource = "lead_assignment" | "manual";
type SalesRecordAttemptOutcome =
  | "no_answer"
  | "callback_scheduled"
  | "validated"
  | "invalid_data"
  | "rejected";

function isSalesRecordSource(value: string): value is SalesRecordSource {
  return value === "lead_assignment" || value === "manual";
}

function isSalesRecordAttemptOutcome(
  value: string,
): value is SalesRecordAttemptOutcome {
  return (
    value === "no_answer" ||
    value === "callback_scheduled" ||
    value === "validated" ||
    value === "invalid_data" ||
    value === "rejected"
  );
}

export interface SalesRecordClientInput {
  ruc: string | null;
  companyName: string | null;
  contactName: string | null;
  dni: string | null;
  phones: string[];
  engineMatchId: string | null;
  completenessScore: number;
}

export interface SalesRecordAddressInput {
  addressType: "installation" | "billing" | "reference";
  fullText: string;
  department: string | null;
  province: string | null;
  district: string | null;
  ubigeo: string | null;
  latitude: number | null;
  longitude: number | null;
  isPrimary: boolean;
}

export interface SalesRecordProductInput {
  productId: number;
  quantity: number;
}

export interface CreateSalesRecordDraftInput {
  source: SalesRecordSource;
  leadAssignmentId: number | null;
  client: SalesRecordClientInput;
  addresses: SalesRecordAddressInput[];
  products: SalesRecordProductInput[];
}

export interface SalesRecordQueueItem {
  id: number;
  status: string;
  companyName: string | null;
  contactName: string | null;
  contactDni: string | null;
  executiveName: string;
  createdAt: number;
  updatedAt: number;
}

export interface SalesRecordProductOption {
  id: number;
  name: string;
  category: string;
  subtype: string | null;
  price: number;
}

export interface SalesRecordBootstrap {
  source: SalesRecordSource;
  leadAssignmentId: number | null;
  client: SalesRecordClientInput;
}

export interface SalesRecordFixContext {
  id: number;
  status: string;
  client: {
    ruc: string | null;
    companyName: string | null;
    contactName: string | null;
    dni: string | null;
    phones: string[];
  } | null;
  addresses: Array<{
    id: number;
    addressType: string;
    fullText: string;
    isPrimary: number;
  }>;
  products: Array<{
    id: number;
    productName: string;
    quantity: number;
  }>;
  attempts: Array<{
    id: number;
    outcome: SalesRecordAttemptOutcome;
    notes: string | null;
    nextAttemptAt: number | null;
    createdAt: number;
    reviewerName: string;
  }>;
}

function mapQueueItem(
  row: Awaited<
    ReturnType<typeof repos.salesRecords.findPendingConfirmationWithClient>
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
        completenessScore: 0,
      },
    };
  }

  const safeContactId = assertPositiveInt(contactId, "contactId");
  const assignment = await repos.leadAssignments.findActiveForContact(
    session.userId,
    safeContactId,
  );
  if (!assignment) {
    throw new Error(
      "You can only create sales from your active assigned leads",
    );
  }

  const contact = await repos.contacts.findById(safeContactId);
  if (!contact) throw new Error("Contact not found");

  const organization = await repos.organizations.findById(
    contact.organization_id,
  );
  if (!organization) throw new Error("Organization not found");

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
      completenessScore: 60,
    },
  };
}

export async function createSalesRecordDraft(
  input: CreateSalesRecordDraftInput,
): Promise<{ id: number }> {
  if (!isSalesRecordSource(input.source)) {
    throw new Error("source is invalid");
  }
  if (input.source === "lead_assignment") {
    assertPositiveInt(input.leadAssignmentId ?? 0, "leadAssignmentId");
  }
  if (input.source === "manual" && input.leadAssignmentId !== null) {
    throw new Error("leadAssignmentId must be null for manual sales");
  }

  input.addresses.forEach((address, index) => {
    assertNonEmptyString(address.fullText, `addresses[${index}].fullText`);
  });
  input.products.forEach((product, index) => {
    assertPositiveInt(product.productId, `products[${index}].productId`);
    assertPositiveInt(product.quantity, `products[${index}].quantity`);
  });

  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "sales_records.create_draft",
    actor,
    input: {
      source: input.source,
      addresses: input.addresses.length,
      products: input.products.length,
    },
    run: async () => {
      const session = await requirePermission("sales:create");
      actor.userId = session.userId;
      actor.role = session.role;

      const result = await runInRepositoryTransaction(
        async (transactionRepos) =>
          createSalesRecordsWorkflowService(transactionRepos).createDraft({
            source: input.source,
            executiveUserId: session.userId,
            branchId: session.branchId,
            leadAssignmentId: input.leadAssignmentId,
            client: input.client,
            addresses: input.addresses,
            products: input.products,
          }),
      );
      if (isErr(result)) throw new Error(result.error);
      return { id: result.value };
    },
  });
}

export async function submitSalesRecord(
  recordId: number,
): Promise<ActionSuccess> {
  const safeRecordId = assertPositiveInt(recordId, "recordId");
  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "sales_records.submit",
    actor,
    input: { recordId: safeRecordId },
    run: async () => {
      const session = await requirePermission("sales:submit");
      actor.userId = session.userId;
      actor.role = session.role;
      const result = await salesRecordsService.submit(
        safeRecordId,
        session.userId,
      );
      if (isErr(result)) throw new Error(result.error);
      return { success: true };
    },
  });
}

export async function confirmSalesRecord(
  recordId: number,
): Promise<ActionSuccess> {
  const safeRecordId = assertPositiveInt(recordId, "recordId");
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
      if (isErr(result)) throw new Error(result.error);
      return { success: true };
    },
  });
}

export async function rejectSalesRecord(
  recordId: number,
  reason: string,
): Promise<ActionSuccess> {
  const safeRecordId = assertPositiveInt(recordId, "recordId");
  const safeReason = assertNonEmptyString(reason, "reason");
  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "sales_records.reject",
    actor,
    input: { recordId: safeRecordId },
    run: async () => {
      const session = await requirePermission("sales:approve");
      actor.userId = session.userId;
      actor.role = session.role;
      const result = await salesRecordsService.reject(
        safeRecordId,
        session.userId,
        session.branchId,
        session.role === "superuser",
        safeReason,
      );
      if (isErr(result)) throw new Error(result.error);
      return { success: true };
    },
  });
}

export async function cancelSalesRecord(
  recordId: number,
): Promise<ActionSuccess> {
  const safeRecordId = assertPositiveInt(recordId, "recordId");
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
      if (isErr(result)) throw new Error(result.error);
      return { success: true };
    },
  });
}

export async function listPendingSalesRecords(): Promise<
  SalesRecordQueueItem[]
> {
  const session = await requirePermission("sales:review");
  const rows =
    session.role === "superuser"
      ? await repos.salesRecords.findPendingConfirmationWithClient()
      : await repos.salesRecords.findPendingConfirmationWithClientByBranch(
          session.branchId,
        );
  return rows.map(mapQueueItem);
}

export async function listConfirmedSalesRecords(): Promise<
  SalesRecordQueueItem[]
> {
  const session = await requirePermission("sales:review");
  if (session.role === "executive") {
    const rows = await repos.salesRecords.findConfirmedWithClientByExecutive(
      session.userId,
    );
    return rows.map(mapQueueItem);
  }

  const rows =
    session.role === "superuser"
      ? await repos.salesRecords.findConfirmedWithClient()
      : await repos.salesRecords.findConfirmedWithClientByBranch(
          session.branchId,
        );
  return rows.map(mapQueueItem);
}

export async function getSalesRecordFixContext(
  recordId: number,
): Promise<SalesRecordFixContext> {
  const safeRecordId = assertPositiveInt(recordId, "recordId");
  const session = await requirePermission("sales:create");
  const record = await repos.salesRecords.findById(safeRecordId);
  if (!record) throw new Error("Sales record not found");
  if (record.executive_user_id !== session.userId) {
    throw new Error("Not your sales record");
  }

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
): Promise<ActionSuccess> {
  const safeRecordId = assertPositiveInt(recordId, "recordId");
  input.addresses.forEach((address, index) => {
    assertNonEmptyString(address.fullText, `addresses[${index}].fullText`);
  });
  input.products.forEach((product, index) => {
    assertPositiveInt(product.productId, `products[${index}].productId`);
    assertPositiveInt(product.quantity, `products[${index}].quantity`);
  });

  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "sales_records.update_draft",
    actor,
    input: {
      recordId: safeRecordId,
      addresses: input.addresses.length,
      products: input.products.length,
    },
    run: async () => {
      const session = await requirePermission("sales:create");
      actor.userId = session.userId;
      actor.role = session.role;

      const result = await salesRecordsService.updateDraft(
        safeRecordId,
        session.userId,
        input,
      );
      if (isErr(result)) throw new Error(result.error);
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
  const safeRecordId = assertPositiveInt(recordId, "recordId");
  if (!isSalesRecordAttemptOutcome(outcome)) {
    throw new Error("outcome is invalid");
  }
  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "sales_records.attempt",
    actor,
    input: { recordId: safeRecordId, outcome },
    run: async () => {
      const session = await requirePermission("sales:approve");
      actor.userId = session.userId;
      actor.role = session.role;
      const result = await salesRecordsService.registerAttempt(
        safeRecordId,
        session.userId,
        session.branchId,
        session.role === "superuser",
        outcome,
        notes,
        nextAttemptAt,
      );
      if (isErr(result)) throw new Error(result.error);
      return { success: true };
    },
  });
}
