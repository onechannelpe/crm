import type { createContactAssignmentsRepo } from "~/server/contacts/repos-assignments";
import type { createContactsRepo } from "~/server/contacts/repos-contacts";
import type { createProductsRepo } from "~/server/inventory/repos-products";
import type { createSalesRecordsRepo } from "~/server/sales/repos-sales-records";
import { createAuditService } from "~/server/shared/audit";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import type { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";
import { Err, Ok, type Result } from "~/server/shared/result";

import type {
  SalesRecordAttemptOutcome,
  SalesRecordStatus,
} from "../domain/types";
import type {
  CreateSalesRecordDraftInput,
  SalesRecordAddressInput,
  SalesRecordProductInput,
  UpdateSalesRecordDraftInput,
} from "./commands/types/draft-input";

const STATUS_TRANSITIONS: Record<SalesRecordStatus, SalesRecordStatus[]> = {
  draft: ["submitted_for_confirmation", "cancelled"],
  submitted_for_confirmation: ["confirmed", "rejected"],
  rejected: ["submitted_for_confirmation", "cancelled"],
  confirmed: [],
  cancelled: [],
};

function canTransition(
  from: SalesRecordStatus,
  to: SalesRecordStatus,
): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

interface WorkflowCreateSalesRecordDraftInput extends CreateSalesRecordDraftInput {
  executiveUserId: number;
  branchId: number;
}

type SalesProductRow = NonNullable<
  Awaited<ReturnType<ReturnType<typeof createProductsRepo>["findById"]>>
>;

type SalesRecordsRepos = {
  auditLogs: ReturnType<typeof createAuditLogsRepo>;
  contactAssignments: ReturnType<typeof createContactAssignmentsRepo>;
  contacts: ReturnType<typeof createContactsRepo>;
  products: ReturnType<typeof createProductsRepo>;
  salesRecords: ReturnType<typeof createSalesRecordsRepo>;
};

export type RepositoryTransactionRunner = <T>(
  operation: (transactionRepos: SalesRecordsRepos) => Promise<T>,
) => Promise<T>;

export function createSalesRecordsWorkflowService(
  repos: SalesRecordsRepos,
  runInTransaction?: RepositoryTransactionRunner,
) {
  const withTransaction: RepositoryTransactionRunner =
    runInTransaction ?? (async (operation) => operation(repos));

  function fail(code: string, message: string): Result<never, DomainError> {
    switch (code) {
      case "not_found":
        return Err(domainError("not_found", code, message));
      case "forbidden":
        return Err(domainError("forbidden", code, message));
      case "invalid_data":
        return Err(domainError("validation", code, message));
      case "invalid_state":
        return Err(domainError("conflict", code, message));
      default:
        return Err(domainError("unexpected", "unexpected", message));
    }
  }

  async function runSafely<T>(
    operation: () => Promise<Result<T, DomainError>>,
  ): Promise<Result<T, DomainError>> {
    try {
      return await operation();
    } catch {
      return fail("unexpected", "Unexpected sales records workflow failure");
    }
  }

  function validateDraftPayload(input: {
    addresses: SalesRecordAddressInput[];
    products: SalesRecordProductInput[];
  }): Result<void, DomainError> {
    if (input.addresses.length > 0) {
      const primaryCount = input.addresses.filter((it) => it.isPrimary).length;
      if (primaryCount !== 1) {
        return fail("invalid_data", "Exactly one primary address is required");
      }
    }
    if (input.products.some((it) => it.quantity < 1)) {
      return fail("invalid_data", "All product quantities must be positive");
    }
    return Ok(undefined);
  }

  async function loadProducts(
    activeRepos: SalesRecordsRepos,
    lines: SalesRecordProductInput[],
  ): Promise<Result<SalesProductRow[], DomainError>> {
    const products = await Promise.all(
      lines.map((item) => activeRepos.products.findById(item.productId)),
    );
    const resolvedProducts: SalesProductRow[] = [];
    for (const product of products) {
      if (!product) {
        return fail("not_found", "One or more products do not exist");
      }
      resolvedProducts.push(product);
    }
    return Ok(resolvedProducts);
  }

  async function persistDraftState(params: {
    activeRepos: SalesRecordsRepos;
    recordId: number;
    input: UpdateSalesRecordDraftInput;
    products: SalesProductRow[];
    now: number;
  }): Promise<void> {
    await params.activeRepos.salesRecords.upsertClient({
      sales_record_id: params.recordId,
      ruc: params.input.client.ruc,
      company_name: params.input.client.companyName,
      contact_name: params.input.client.contactName,
      dni: params.input.client.dni,
      phones_json: JSON.stringify(params.input.client.phones),
      engine_match_id: params.input.client.engineMatchId,
      completeness_score: params.input.client.completenessScore,
      created_at: params.now,
      updated_at: params.now,
    });
    await params.activeRepos.salesRecords.replaceAddresses(
      params.recordId,
      params.input.addresses.map((address) => ({
        sales_record_id: params.recordId,
        address_type: address.addressType,
        full_text: address.fullText,
        department: address.department,
        province: address.province,
        district: address.district,
        ubigeo: address.ubigeo,
        latitude: address.latitude,
        longitude: address.longitude,
        is_primary: address.isPrimary ? 1 : 0,
        created_at: params.now,
        updated_at: params.now,
      })),
    );
    await params.activeRepos.salesRecords.replaceProducts(
      params.recordId,
      params.input.products.map((line, index) => ({
        sales_record_id: params.recordId,
        product_id: line.productId,
        product_name_snapshot: params.products[index].name,
        category_snapshot: params.products[index].category,
        subtype_snapshot: params.products[index].subtype,
        quantity: line.quantity,
        unit_price_snapshot: params.products[index].price,
        created_at: params.now,
      })),
    );
  }

  return {
    async createDraft(
      input: WorkflowCreateSalesRecordDraftInput,
    ): Promise<Result<number, DomainError>> {
      return runSafely(() =>
        withTransaction(async (activeRepos) => {
          const audit = createAuditService(activeRepos);

          const payloadValidation = validateDraftPayload({
            addresses: input.addresses,
            products: input.products,
          });
          if (!payloadValidation.ok) {
            return payloadValidation;
          }

          if (
            input.source === "lead_assignment" &&
            input.leadAssignmentId === null
          ) {
            return fail(
              "invalid_data",
              "leadAssignmentId is required for lead-assignment sales",
            );
          }
          if (input.source === "manual" && input.leadAssignmentId !== null) {
            return fail(
              "invalid_data",
              "leadAssignmentId must be null for manual sales",
            );
          }

          if (input.leadAssignmentId !== null) {
            const assignment =
              await activeRepos.contactAssignments.findActiveByIdForUser(
                input.leadAssignmentId,
                input.executiveUserId,
              );
            if (!assignment) {
              return fail(
                "forbidden",
                "Lead assignment is not active or does not belong to user",
              );
            }
          }

          const productsResult = await loadProducts(
            activeRepos,
            input.products,
          );
          if (!productsResult.ok) return productsResult;

          const now = Date.now();
          const recordId = await activeRepos.salesRecords.create({
            source: input.source,
            status: "draft",
            executive_user_id: input.executiveUserId,
            lead_assignment_id: input.leadAssignmentId,
            branch_id: input.branchId,
            submitted_at: null,
            confirmed_at: null,
            rejected_at: null,
            cancelled_at: null,
            created_at: now,
            updated_at: now,
          });

          await persistDraftState({
            activeRepos,
            recordId,
            input,
            products: productsResult.value,
            now,
          });

          await audit.log(
            input.executiveUserId,
            "sales_record_created",
            "sales_record",
            recordId,
            { source: input.source },
          );

          return Ok(recordId);
        }),
      );
    },

    async submit(
      recordId: number,
      executiveUserId: number,
    ): Promise<Result<void, DomainError>> {
      return runSafely(() =>
        withTransaction(async (activeRepos) => {
          const audit = createAuditService(activeRepos);
          const record = await activeRepos.salesRecords.findById(recordId);
          if (!record) return fail("not_found", "Sales record not found");
          if (record.executive_user_id !== executiveUserId) {
            return fail("forbidden", "Not your sales record");
          }
          if (!canTransition(record.status, "submitted_for_confirmation")) {
            return fail(
              "invalid_state",
              `Cannot submit from status: ${record.status}`,
            );
          }

          const [client, addresses, products] = await Promise.all([
            activeRepos.salesRecords.findClientByRecord(recordId),
            activeRepos.salesRecords.findAddressesByRecord(recordId),
            activeRepos.salesRecords.findProductsByRecord(recordId),
          ]);
          if (!client) {
            return fail(
              "invalid_state",
              "Client snapshot is required before submit",
            );
          }
          if (addresses.length < 1) {
            return fail(
              "invalid_data",
              "At least one address is required before submit",
            );
          }
          if (addresses.filter((it) => it.is_primary === 1).length !== 1) {
            return fail(
              "invalid_data",
              "Exactly one primary address is required before submit",
            );
          }
          if (products.length < 1) {
            return fail(
              "invalid_data",
              "At least one product is required before submit",
            );
          }

          const now = Date.now();
          await activeRepos.salesRecords.updateStatus(
            recordId,
            "submitted_for_confirmation",
            {
              submitted_at: now,
            },
          );
          await audit.log(
            executiveUserId,
            "sales_record_submitted",
            "sales_record",
            recordId,
            { from: record.status, to: "submitted_for_confirmation" },
          );
          return Ok(undefined);
        }),
      );
    },

    async updateDraft(
      recordId: number,
      executiveUserId: number,
      input: UpdateSalesRecordDraftInput,
      correctionNotes: string | null = null,
    ): Promise<Result<void, DomainError>> {
      return runSafely(() =>
        withTransaction(async (activeRepos) => {
          const audit = createAuditService(activeRepos);
          const record = await activeRepos.salesRecords.findById(recordId);
          if (!record) return fail("not_found", "Sales record not found");
          if (record.executive_user_id !== executiveUserId) {
            return fail("forbidden", "Not your sales record");
          }
          if (record.status !== "draft" && record.status !== "rejected") {
            return fail(
              "invalid_state",
              "Only draft or rejected records can be edited",
            );
          }

          const payloadValidation = validateDraftPayload({
            addresses: input.addresses,
            products: input.products,
          });
          if (!payloadValidation.ok) {
            return payloadValidation;
          }

          const productsResult = await loadProducts(
            activeRepos,
            input.products,
          );
          if (!productsResult.ok) return productsResult;

          const now = Date.now();
          await persistDraftState({
            activeRepos,
            recordId,
            input,
            products: productsResult.value,
            now,
          });
          await activeRepos.salesRecords.touch(recordId, now);
          await audit.log(
            executiveUserId,
            "sales_record_draft_updated",
            "sales_record",
            recordId,
            {
              status: record.status,
              correctionNotes,
            },
          );
          return Ok(undefined);
        }),
      );
    },

    async confirm(
      recordId: number,
      reviewerUserId: number,
      reviewerBranchId: number,
      bypassBranchScope: boolean,
    ): Promise<Result<void, DomainError>> {
      return runSafely(() =>
        withTransaction(async (activeRepos) => {
          const audit = createAuditService(activeRepos);
          const record = await activeRepos.salesRecords.findById(recordId);
          if (!record) return fail("not_found", "Sales record not found");
          if (!bypassBranchScope && record.branch_id !== reviewerBranchId) {
            return fail(
              "forbidden",
              "Cannot confirm a sales record from another branch",
            );
          }
          if (!canTransition(record.status, "confirmed")) {
            return fail(
              "invalid_state",
              `Cannot confirm from status: ${record.status}`,
            );
          }

          const now = Date.now();
          await activeRepos.salesRecords.updateStatus(recordId, "confirmed", {
            confirmed_at: now,
          });
          await audit.log(
            reviewerUserId,
            "sales_record_confirmed",
            "sales_record",
            recordId,
            { from: record.status, to: "confirmed" },
          );
          return Ok(undefined);
        }),
      );
    },

    async reject(
      recordId: number,
      reviewerUserId: number,
      reviewerBranchId: number,
      bypassBranchScope: boolean,
      reason: string,
    ): Promise<Result<void, DomainError>> {
      return runSafely(() =>
        withTransaction(async (activeRepos) => {
          const audit = createAuditService(activeRepos);
          const record = await activeRepos.salesRecords.findById(recordId);
          if (!record) return fail("not_found", "Sales record not found");
          if (!bypassBranchScope && record.branch_id !== reviewerBranchId) {
            return fail(
              "forbidden",
              "Cannot reject a sales record from another branch",
            );
          }
          if (!canTransition(record.status, "rejected")) {
            return fail(
              "invalid_state",
              `Cannot reject from status: ${record.status}`,
            );
          }
          if (reason.trim().length < 1) {
            return fail("invalid_data", "Rejection reason is required");
          }

          const now = Date.now();
          await activeRepos.salesRecords.updateStatus(recordId, "rejected", {
            rejected_at: now,
          });
          await audit.log(
            reviewerUserId,
            "sales_record_rejected",
            "sales_record",
            recordId,
            { from: record.status, to: "rejected", reason },
          );
          return Ok(undefined);
        }),
      );
    },

    async cancel(
      recordId: number,
      executiveUserId: number,
    ): Promise<Result<void, DomainError>> {
      return runSafely(() =>
        withTransaction(async (activeRepos) => {
          const audit = createAuditService(activeRepos);
          const record = await activeRepos.salesRecords.findById(recordId);
          if (!record) return fail("not_found", "Sales record not found");
          if (record.executive_user_id !== executiveUserId) {
            return fail("forbidden", "Not your sales record");
          }
          if (!canTransition(record.status, "cancelled")) {
            return fail(
              "invalid_state",
              `Cannot cancel from status: ${record.status}`,
            );
          }

          const now = Date.now();
          await activeRepos.salesRecords.updateStatus(recordId, "cancelled", {
            cancelled_at: now,
          });
          await audit.log(
            executiveUserId,
            "sales_record_cancelled",
            "sales_record",
            recordId,
            { from: record.status, to: "cancelled" },
          );
          return Ok(undefined);
        }),
      );
    },

    async registerAttempt(
      recordId: number,
      reviewerUserId: number,
      reviewerBranchId: number,
      bypassBranchScope: boolean,
      outcome: SalesRecordAttemptOutcome,
      notes: string | null,
      nextAttemptAt: number | null,
    ): Promise<Result<void, DomainError>> {
      return runSafely(() =>
        withTransaction(async (activeRepos) => {
          const audit = createAuditService(activeRepos);
          const record = await activeRepos.salesRecords.findById(recordId);
          if (!record) return fail("not_found", "Sales record not found");
          if (!bypassBranchScope && record.branch_id !== reviewerBranchId) {
            return fail(
              "forbidden",
              "Cannot update a sales record from another branch",
            );
          }
          if (record.status !== "submitted_for_confirmation") {
            return fail(
              "invalid_state",
              "Attempts are only allowed while pending confirmation",
            );
          }

          await activeRepos.salesRecords.createAttempt({
            sales_record_id: recordId,
            reviewer_user_id: reviewerUserId,
            outcome,
            notes,
            next_attempt_at: nextAttemptAt,
            created_at: Date.now(),
          });
          await audit.log(
            reviewerUserId,
            "sales_record_attempt_logged",
            "sales_record",
            recordId,
            { outcome, hasNotes: notes !== null, nextAttemptAt },
          );
          return Ok(undefined);
        }),
      );
    },
  };
}
