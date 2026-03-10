import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";

interface CreateViewInput {
  user_id: number;
  name: string;
  search_type:
    | "dni"
    | "ruc"
    | "phone"
    | "person_name"
    | "company_name"
    | "phone_enriched";
  query_value: string;
  limit_value: number;
  is_default: number;
}

interface UpdateViewInput {
  name: string;
  search_type:
    | "dni"
    | "ruc"
    | "phone"
    | "person_name"
    | "company_name"
    | "phone_enriched";
  query_value: string;
  limit_value: number;
}

export function createClientSearchViewsRepo(db: Kysely<Database>) {
  return {
    listByUser(userId: number) {
      return db
        .selectFrom("client_search_views")
        .selectAll()
        .where("user_id", "=", userId)
        .orderBy("is_default", "desc")
        .orderBy("updated_at", "desc")
        .execute();
    },

    findByIdForUser(id: number, userId: number) {
      return db
        .selectFrom("client_search_views")
        .selectAll()
        .where("id", "=", id)
        .where("user_id", "=", userId)
        .executeTakeFirst();
    },

    async create(input: CreateViewInput) {
      const now = Date.now();
      return db
        .insertInto("client_search_views")
        .values({
          ...input,
          created_at: now,
          updated_at: now,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
    },

    async update(id: number, userId: number, input: UpdateViewInput) {
      return db
        .updateTable("client_search_views")
        .set({
          ...input,
          updated_at: Date.now(),
        })
        .where("id", "=", id)
        .where("user_id", "=", userId)
        .returningAll()
        .executeTakeFirst();
    },

    async delete(id: number, userId: number) {
      return db
        .deleteFrom("client_search_views")
        .where("id", "=", id)
        .where("user_id", "=", userId)
        .executeTakeFirst();
    },

    async clearDefaultForUser(userId: number) {
      return db
        .updateTable("client_search_views")
        .set({ is_default: 0, updated_at: Date.now() })
        .where("user_id", "=", userId)
        .where("is_default", "=", 1)
        .execute();
    },

    async setDefault(id: number, userId: number) {
      await db.transaction().execute(async (trx) => {
        await trx
          .updateTable("client_search_views")
          .set({ is_default: 0, updated_at: Date.now() })
          .where("user_id", "=", userId)
          .where("is_default", "=", 1)
          .execute();

        await trx
          .updateTable("client_search_views")
          .set({ is_default: 1, updated_at: Date.now() })
          .where("id", "=", id)
          .where("user_id", "=", userId)
          .execute();
      });
    },
  };
}
