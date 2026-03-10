import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";

export function createOAuthAccountsRepo(db: Kysely<Database>) {
  return {
    findByProvider(provider: string, providerUserId: string) {
      return db
        .selectFrom("user_oauth_accounts")
        .selectAll()
        .where("provider", "=", provider)
        .where("provider_user_id", "=", providerUserId)
        .executeTakeFirst();
    },

    create(values: {
      user_id: number;
      provider: string;
      provider_user_id: string;
      email: string;
      created_at: number;
    }) {
      return db
        .insertInto("user_oauth_accounts")
        .values(values)
        .executeTakeFirst();
    },
  };
}
