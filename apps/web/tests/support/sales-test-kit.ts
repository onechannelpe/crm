import {
  asBranchId,
  asUserId,
  type BranchId,
  type UserId,
} from "../../src/server/shared/ids";
import { TEST_IDS } from "./identities/seeded-identities";
import type { TestDbContext } from "./test-db";

/**
 * Helper to manage sales-related data in tests.
 */
export function createSalesTestKit(ctx: TestDbContext) {
  return {
    /**
     * Directly inserts a confirmed sale record with client data.
     */
    async setupConfirmedSale(
      input: {
        id?: number;
        executiveUserId?: UserId;
        branchId?: BranchId;
        ruc?: string;
        companyName?: string;
        contactName?: string;
        dni?: string;
      } = {},
    ) {
      const now = Date.now();
      const executiveUserId =
        input.executiveUserId ??
        asUserId("00000000-0000-0000-0000-000000000001");
      const branchId = input.branchId ?? TEST_IDS.BRANCH_LIMA;
      const ruc = input.ruc ?? "20100000001";
      const companyName = input.companyName ?? "Org Test";

      const saleResult = await ctx.db
        .insertInto("sales_records")
        .values({
          id: input.id,
          source: "manual",
          status: "confirmed",
          executive_user_id: executiveUserId,
          lead_assignment_id: null,
          branch_id: branchId,
          submitted_at: now - 100,
          confirmed_at: now - 50,
          rejected_at: null,
          cancelled_at: null,
          created_at: now,
          updated_at: now,
        })
        .executeTakeFirstOrThrow();

      const salesRecordId = input.id ?? Number(saleResult.insertId);

      await ctx.db
        .insertInto("sales_record_client")
        .values({
          sales_record_id: salesRecordId,
          ruc,
          company_name: companyName,
          contact_name: input.contactName ?? "Contacto Test",
          dni: input.dni ?? "70000001",
          phones_json: "[]",
          engine_match_id: null,
          completeness_score: 80,
          created_at: now,
          updated_at: now,
        })
        .execute();

      return salesRecordId;
    },

    /**
     * Creates a report export job.
     */
    async createExportJob(input: {
      requestedByUserId: UserId;
      branchId: BranchId;
      status?: any;
    }) {
      const now = Date.now();
      return ctx.repos.reportExportJobs.createJob({
        requested_by_user_id: input.requestedByUserId,
        branch_id: input.branchId,
        format: "csv",
        filters_json: JSON.stringify({ status: "confirmed", scope: "branch" }),
        status: input.status ?? "running",
        rows_count: null,
        file_storage_key: null,
        file_sha256: null,
        error_message: null,
        requested_at: now,
        completed_at: null,
        expires_at: null,
        lease_owner: asUserId("test-worker"),
        lease_until: now + 1_000,
        attempt_count: 0,
        max_attempts: 5,
      });
    },
  };
}
