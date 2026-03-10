import { sql, type Kysely } from "kysely";

import type {
  Database,
  NewSalesRecordAttempt,
  NewSalesRecord,
  NewSalesRecordAddress,
  NewSalesRecordClient,
  NewSalesRecordProduct,
} from "~/lib/db/types";

export function createSalesRecordsRepo(db: Kysely<Database>) {
  return {
    async create(values: NewSalesRecord): Promise<number> {
      const result = await db
        .insertInto("sales_records")
        .values(values)
        .executeTakeFirstOrThrow();
      return Number(result.insertId);
    },

    findById(id: number) {
      return db
        .selectFrom("sales_records")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
    },

    listByExecutive(executiveUserId: number, limit: number) {
      return db
        .selectFrom("sales_records")
        .selectAll()
        .where("executive_user_id", "=", executiveUserId)
        .orderBy("updated_at", "desc")
        .limit(limit)
        .execute();
    },

    async countByExecutiveAndStatus(
      executiveUserId: number,
      status: NewSalesRecord["status"],
    ): Promise<number> {
      const row = await db
        .selectFrom("sales_records")
        .select((eb) => eb.fn.countAll<number>().as("count"))
        .where("executive_user_id", "=", executiveUserId)
        .where("status", "=", status)
        .executeTakeFirst();
      return Number(row?.count ?? 0);
    },

    listByBranch(branchId: number, limit: number) {
      return db
        .selectFrom("sales_records")
        .selectAll()
        .where("branch_id", "=", branchId)
        .orderBy("updated_at", "desc")
        .limit(limit)
        .execute();
    },

    findPendingConfirmationWithClient() {
      return db
        .selectFrom("sales_records")
        .innerJoin(
          "sales_record_client",
          "sales_record_client.sales_record_id",
          "sales_records.id",
        )
        .innerJoin("users", "users.id", "sales_records.executive_user_id")
        .select([
          "sales_records.id",
          "sales_records.status",
          "sales_records.created_at",
          "sales_records.updated_at",
          "sales_record_client.company_name",
          "sales_record_client.contact_name",
          "sales_record_client.dni",
          sql<string>`users.names || ' ' || users.first_surname`.as(
            "executive_name",
          ),
        ])
        .where("sales_records.status", "=", "submitted_for_confirmation")
        .orderBy("sales_records.created_at", "asc")
        .execute();
    },

    findPendingConfirmationWithClientByBranch(branchId: number) {
      return db
        .selectFrom("sales_records")
        .innerJoin(
          "sales_record_client",
          "sales_record_client.sales_record_id",
          "sales_records.id",
        )
        .innerJoin("users", "users.id", "sales_records.executive_user_id")
        .select([
          "sales_records.id",
          "sales_records.status",
          "sales_records.created_at",
          "sales_records.updated_at",
          "sales_record_client.company_name",
          "sales_record_client.contact_name",
          "sales_record_client.dni",
          sql<string>`users.names || ' ' || users.first_surname`.as(
            "executive_name",
          ),
        ])
        .where("sales_records.status", "=", "submitted_for_confirmation")
        .where("sales_records.branch_id", "=", branchId)
        .orderBy("sales_records.created_at", "asc")
        .execute();
    },

    findConfirmedWithClient() {
      return db
        .selectFrom("sales_records")
        .innerJoin(
          "sales_record_client",
          "sales_record_client.sales_record_id",
          "sales_records.id",
        )
        .innerJoin("users", "users.id", "sales_records.executive_user_id")
        .select([
          "sales_records.id",
          "sales_records.status",
          "sales_records.created_at",
          "sales_records.updated_at",
          "sales_records.confirmed_at",
          "sales_record_client.company_name",
          "sales_record_client.contact_name",
          "sales_record_client.dni",
          sql<string>`users.names || ' ' || users.first_surname`.as(
            "executive_name",
          ),
        ])
        .where("sales_records.status", "=", "confirmed")
        .where("sales_records.confirmed_at", "is not", null)
        .orderBy("sales_records.updated_at", "desc")
        .execute();
    },

    findConfirmedWithClientByBranch(branchId: number) {
      return db
        .selectFrom("sales_records")
        .innerJoin(
          "sales_record_client",
          "sales_record_client.sales_record_id",
          "sales_records.id",
        )
        .innerJoin("users", "users.id", "sales_records.executive_user_id")
        .select([
          "sales_records.id",
          "sales_records.status",
          "sales_records.created_at",
          "sales_records.updated_at",
          "sales_records.confirmed_at",
          "sales_record_client.company_name",
          "sales_record_client.contact_name",
          "sales_record_client.dni",
          sql<string>`users.names || ' ' || users.first_surname`.as(
            "executive_name",
          ),
        ])
        .where("sales_records.status", "=", "confirmed")
        .where("sales_records.confirmed_at", "is not", null)
        .where("sales_records.branch_id", "=", branchId)
        .orderBy("sales_records.updated_at", "desc")
        .execute();
    },

    findConfirmedWithClientByExecutive(executiveUserId: number) {
      return db
        .selectFrom("sales_records")
        .innerJoin(
          "sales_record_client",
          "sales_record_client.sales_record_id",
          "sales_records.id",
        )
        .innerJoin("users", "users.id", "sales_records.executive_user_id")
        .select([
          "sales_records.id",
          "sales_records.status",
          "sales_records.created_at",
          "sales_records.updated_at",
          "sales_records.confirmed_at",
          "sales_record_client.company_name",
          "sales_record_client.contact_name",
          "sales_record_client.dni",
          sql<string>`users.names || ' ' || users.first_surname`.as(
            "executive_name",
          ),
        ])
        .where("sales_records.status", "=", "confirmed")
        .where("sales_records.confirmed_at", "is not", null)
        .where("sales_records.executive_user_id", "=", executiveUserId)
        .orderBy("sales_records.updated_at", "desc")
        .execute();
    },

    updateStatus(
      id: number,
      status: NewSalesRecord["status"],
      patch: {
        submitted_at?: number | null;
        confirmed_at?: number | null;
        rejected_at?: number | null;
        cancelled_at?: number | null;
      },
    ) {
      return db
        .updateTable("sales_records")
        .set({
          status,
          submitted_at: patch.submitted_at,
          confirmed_at: patch.confirmed_at,
          rejected_at: patch.rejected_at,
          cancelled_at: patch.cancelled_at,
          updated_at: Date.now(),
        })
        .where("id", "=", id)
        .execute();
    },

    touch(id: number, updatedAt: number) {
      return db
        .updateTable("sales_records")
        .set({ updated_at: updatedAt })
        .where("id", "=", id)
        .execute();
    },

    upsertClient(values: NewSalesRecordClient) {
      return db
        .insertInto("sales_record_client")
        .values(values)
        .onConflict((oc) =>
          oc.column("sales_record_id").doUpdateSet({
            ruc: values.ruc,
            company_name: values.company_name,
            contact_name: values.contact_name,
            dni: values.dni,
            phones_json: values.phones_json,
            engine_match_id: values.engine_match_id,
            completeness_score: values.completeness_score,
            updated_at: values.updated_at,
          }),
        )
        .execute();
    },

    findClientByRecord(salesRecordId: number) {
      return db
        .selectFrom("sales_record_client")
        .selectAll()
        .where("sales_record_id", "=", salesRecordId)
        .executeTakeFirst();
    },

    async replaceAddresses(
      salesRecordId: number,
      addresses: NewSalesRecordAddress[],
    ): Promise<void> {
      await db
        .deleteFrom("sales_record_addresses")
        .where("sales_record_id", "=", salesRecordId)
        .execute();
      if (addresses.length < 1) return;
      await db.insertInto("sales_record_addresses").values(addresses).execute();
    },

    findAddressesByRecord(salesRecordId: number) {
      return db
        .selectFrom("sales_record_addresses")
        .selectAll()
        .where("sales_record_id", "=", salesRecordId)
        .orderBy("is_primary", "desc")
        .orderBy("id", "asc")
        .execute();
    },

    async replaceProducts(
      salesRecordId: number,
      products: NewSalesRecordProduct[],
    ): Promise<void> {
      await db
        .deleteFrom("sales_record_products")
        .where("sales_record_id", "=", salesRecordId)
        .execute();
      if (products.length < 1) return;
      await db.insertInto("sales_record_products").values(products).execute();
    },

    findProductsByRecord(salesRecordId: number) {
      return db
        .selectFrom("sales_record_products")
        .selectAll()
        .where("sales_record_id", "=", salesRecordId)
        .orderBy("id", "asc")
        .execute();
    },

    createAttempt(values: NewSalesRecordAttempt) {
      return db
        .insertInto("sales_record_attempts")
        .values(values)
        .executeTakeFirstOrThrow();
    },

    listAttemptsByRecord(salesRecordId: number) {
      return db
        .selectFrom("sales_record_attempts")
        .innerJoin(
          "users",
          "users.id",
          "sales_record_attempts.reviewer_user_id",
        )
        .select([
          "sales_record_attempts.id",
          "sales_record_attempts.sales_record_id",
          "sales_record_attempts.reviewer_user_id",
          "sales_record_attempts.outcome",
          "sales_record_attempts.notes",
          "sales_record_attempts.next_attempt_at",
          "sales_record_attempts.created_at",
          sql<string>`users.names || ' ' || users.first_surname`.as(
            "reviewer_name",
          ),
        ])
        .where("sales_record_attempts.sales_record_id", "=", salesRecordId)
        .orderBy("sales_record_attempts.created_at", "desc")
        .execute();
    },
  };
}
