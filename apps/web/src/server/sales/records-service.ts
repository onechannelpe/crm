import { createAuditService } from "~/server/shared/audit";
import type { Repositories } from "~/server/shared/registry";
import { Err, Ok, type Result } from "~/server/shared/result";

type SalesRecordStatus =
  | "draft"
  | "submitted_for_confirmation"
  | "confirmed"
  | "rejected"
  | "cancelled";

type SalesRecordSource = "lead_assignment" | "manual";
type SalesRecordAttemptOutcome =
  | "no_answer"
  | "callback_scheduled"
  | "validated"
  | "invalid_data"
  | "rejected";

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

interface DraftClientInput {
  ruc: string | null;
  companyName: string | null;
  contactName: string | null;
  dni: string | null;
  phones: string[];
  engineMatchId: string | null;
  completenessScore: number;
}

interface DraftAddressInput {
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

interface DraftProductInput {
  productId: number;
  quantity: number;
}

interface CreateSalesRecordDraftInput {
  source: SalesRecordSource;
  executiveUserId: number;
  branchId: number;
  leadAssignmentId: number | null;
  client: DraftClientInput;
  addresses: DraftAddressInput[];
  products: DraftProductInput[];
}

interface UpdateSalesRecordDraftInput {
  client: DraftClientInput;
  addresses: DraftAddressInput[];
  products: DraftProductInput[];
}

export function createSalesRecordsWorkflowService(repos: Repositories) {
  const audit = createAuditService(repos);

  return {
    async createDraft(
      input: CreateSalesRecordDraftInput,
    ): Promise<Result<number, string>> {
      if (input.addresses.length < 1) {
        return Err("At least one address is required");
      }
      const primaryCount = input.addresses.filter((it) => it.isPrimary).length;
      if (primaryCount !== 1) {
        return Err("Exactly one primary address is required");
      }
      if (input.products.length < 1) {
        return Err("At least one product is required");
      }
      if (input.products.some((it) => it.quantity < 1)) {
        return Err("All product quantities must be positive");
      }

      if (
        input.source === "lead_assignment" &&
        input.leadAssignmentId === null
      ) {
        return Err("leadAssignmentId is required for lead-assignment sales");
      }
      if (input.source === "manual" && input.leadAssignmentId !== null) {
        return Err("leadAssignmentId must be null for manual sales");
      }

      if (input.leadAssignmentId !== null) {
        const assignment = await repos.leadAssignments.findActiveByIdForUser(
          input.leadAssignmentId,
          input.executiveUserId,
        );
        if (!assignment) {
          return Err(
            "Lead assignment is not active or does not belong to user",
          );
        }
      }

      const products = await Promise.all(
        input.products.map((item) => repos.products.findById(item.productId)),
      );
      if (products.some((product) => !product)) {
        return Err("One or more products do not exist");
      }

      const now = Date.now();
      const recordId = await repos.salesRecords.create({
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

      await repos.salesRecords.upsertClient({
        sales_record_id: recordId,
        ruc: input.client.ruc,
        company_name: input.client.companyName,
        contact_name: input.client.contactName,
        dni: input.client.dni,
        phones_json: JSON.stringify(input.client.phones),
        engine_match_id: input.client.engineMatchId,
        completeness_score: input.client.completenessScore,
        created_at: now,
        updated_at: now,
      });

      await repos.salesRecords.replaceAddresses(
        recordId,
        input.addresses.map((address) => ({
          sales_record_id: recordId,
          address_type: address.addressType,
          full_text: address.fullText,
          department: address.department,
          province: address.province,
          district: address.district,
          ubigeo: address.ubigeo,
          latitude: address.latitude,
          longitude: address.longitude,
          is_primary: address.isPrimary ? 1 : 0,
          created_at: now,
          updated_at: now,
        })),
      );

      await repos.salesRecords.replaceProducts(
        recordId,
        input.products.map((line, index) => ({
          sales_record_id: recordId,
          product_id: line.productId,
          product_name_snapshot: products[index]!.name,
          category_snapshot: products[index]!.category,
          subtype_snapshot: products[index]!.subtype,
          quantity: line.quantity,
          unit_price_snapshot: products[index]!.price,
          created_at: now,
        })),
      );

      await audit.log(
        input.executiveUserId,
        "sales_record_created",
        "sales_record",
        recordId,
        { source: input.source },
      );

      return Ok(recordId);
    },

    async submit(
      recordId: number,
      executiveUserId: number,
    ): Promise<Result<void, string>> {
      const record = await repos.salesRecords.findById(recordId);
      if (!record) return Err("Sales record not found");
      if (record.executive_user_id !== executiveUserId) {
        return Err("Not your sales record");
      }
      if (!canTransition(record.status, "submitted_for_confirmation")) {
        return Err(`Cannot submit from status: ${record.status}`);
      }

      const [client, addresses, products] = await Promise.all([
        repos.salesRecords.findClientByRecord(recordId),
        repos.salesRecords.findAddressesByRecord(recordId),
        repos.salesRecords.findProductsByRecord(recordId),
      ]);
      if (!client) return Err("Client snapshot is required before submit");
      if (addresses.length < 1) {
        return Err("At least one address is required before submit");
      }
      if (addresses.filter((it) => it.is_primary === 1).length !== 1) {
        return Err("Exactly one primary address is required before submit");
      }
      if (products.length < 1) {
        return Err("At least one product is required before submit");
      }

      const now = Date.now();
      await repos.salesRecords.updateStatus(
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
    },

    async updateDraft(
      recordId: number,
      executiveUserId: number,
      input: UpdateSalesRecordDraftInput,
    ): Promise<Result<void, string>> {
      const record = await repos.salesRecords.findById(recordId);
      if (!record) return Err("Sales record not found");
      if (record.executive_user_id !== executiveUserId) {
        return Err("Not your sales record");
      }
      if (record.status !== "draft" && record.status !== "rejected") {
        return Err("Only draft or rejected records can be edited");
      }

      if (input.addresses.length < 1) {
        return Err("At least one address is required");
      }
      const primaryCount = input.addresses.filter((it) => it.isPrimary).length;
      if (primaryCount !== 1) {
        return Err("Exactly one primary address is required");
      }
      if (input.products.length < 1) {
        return Err("At least one product is required");
      }
      if (input.products.some((it) => it.quantity < 1)) {
        return Err("All product quantities must be positive");
      }

      const products = await Promise.all(
        input.products.map((item) => repos.products.findById(item.productId)),
      );
      if (products.some((product) => !product)) {
        return Err("One or more products do not exist");
      }

      const now = Date.now();
      await repos.salesRecords.upsertClient({
        sales_record_id: recordId,
        ruc: input.client.ruc,
        company_name: input.client.companyName,
        contact_name: input.client.contactName,
        dni: input.client.dni,
        phones_json: JSON.stringify(input.client.phones),
        engine_match_id: input.client.engineMatchId,
        completeness_score: input.client.completenessScore,
        created_at: now,
        updated_at: now,
      });
      await repos.salesRecords.replaceAddresses(
        recordId,
        input.addresses.map((address) => ({
          sales_record_id: recordId,
          address_type: address.addressType,
          full_text: address.fullText,
          department: address.department,
          province: address.province,
          district: address.district,
          ubigeo: address.ubigeo,
          latitude: address.latitude,
          longitude: address.longitude,
          is_primary: address.isPrimary ? 1 : 0,
          created_at: now,
          updated_at: now,
        })),
      );
      await repos.salesRecords.replaceProducts(
        recordId,
        input.products.map((line, index) => ({
          sales_record_id: recordId,
          product_id: line.productId,
          product_name_snapshot: products[index]!.name,
          category_snapshot: products[index]!.category,
          subtype_snapshot: products[index]!.subtype,
          quantity: line.quantity,
          unit_price_snapshot: products[index]!.price,
          created_at: now,
        })),
      );
      await repos.salesRecords.touch(recordId, now);
      await audit.log(
        executiveUserId,
        "sales_record_draft_updated",
        "sales_record",
        recordId,
        { status: record.status },
      );
      return Ok(undefined);
    },

    async confirm(
      recordId: number,
      reviewerUserId: number,
      reviewerBranchId: number,
      bypassBranchScope: boolean,
    ): Promise<Result<void, string>> {
      const record = await repos.salesRecords.findById(recordId);
      if (!record) return Err("Sales record not found");
      if (!bypassBranchScope && record.branch_id !== reviewerBranchId) {
        return Err("Cannot confirm a sales record from another branch");
      }
      if (!canTransition(record.status, "confirmed")) {
        return Err(`Cannot confirm from status: ${record.status}`);
      }

      const now = Date.now();
      await repos.salesRecords.updateStatus(recordId, "confirmed", {
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
    },

    async reject(
      recordId: number,
      reviewerUserId: number,
      reviewerBranchId: number,
      bypassBranchScope: boolean,
      reason: string,
    ): Promise<Result<void, string>> {
      const record = await repos.salesRecords.findById(recordId);
      if (!record) return Err("Sales record not found");
      if (!bypassBranchScope && record.branch_id !== reviewerBranchId) {
        return Err("Cannot reject a sales record from another branch");
      }
      if (!canTransition(record.status, "rejected")) {
        return Err(`Cannot reject from status: ${record.status}`);
      }
      if (reason.trim().length < 1) {
        return Err("Rejection reason is required");
      }

      const now = Date.now();
      await repos.salesRecords.updateStatus(recordId, "rejected", {
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
    },

    async cancel(
      recordId: number,
      executiveUserId: number,
    ): Promise<Result<void, string>> {
      const record = await repos.salesRecords.findById(recordId);
      if (!record) return Err("Sales record not found");
      if (record.executive_user_id !== executiveUserId) {
        return Err("Not your sales record");
      }
      if (!canTransition(record.status, "cancelled")) {
        return Err(`Cannot cancel from status: ${record.status}`);
      }

      const now = Date.now();
      await repos.salesRecords.updateStatus(recordId, "cancelled", {
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
    },

    async registerAttempt(
      recordId: number,
      reviewerUserId: number,
      reviewerBranchId: number,
      bypassBranchScope: boolean,
      outcome: SalesRecordAttemptOutcome,
      notes: string | null,
      nextAttemptAt: number | null,
    ): Promise<Result<void, string>> {
      const record = await repos.salesRecords.findById(recordId);
      if (!record) return Err("Sales record not found");
      if (!bypassBranchScope && record.branch_id !== reviewerBranchId) {
        return Err("Cannot update a sales record from another branch");
      }
      if (record.status !== "submitted_for_confirmation") {
        return Err("Attempts are only allowed while pending confirmation");
      }

      await repos.salesRecords.createAttempt({
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
    },
  };
}
