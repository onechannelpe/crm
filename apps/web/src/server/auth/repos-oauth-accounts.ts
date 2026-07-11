import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";
import type { UserId } from "~/server/shared/ids";

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
      user_id: UserId;
      provider: string;
      provider_user_id: string;
      email: string;
      created_at: Date;
    }) {
      return db
        .insertInto("user_oauth_accounts")
        .values(values)
        .executeTakeFirst();
    },
  };
}

export type OAuthAccountsRepo = ReturnType<typeof createOAuthAccountsRepo>;
