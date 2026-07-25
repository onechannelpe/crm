import type { Kysely } from "kysely";

import {
  SETTLEMENT_BANKS,
  ACCOUNT_TYPE_KINDS,
  COLLECTION_MODES,
  CURRENCIES,
} from "~/contracts/workflow/vocabulary";

import type { Database } from "../../types";

export async function run(db: Kysely<Database>): Promise<void> {
  await db
    .insertInto("workflow_collection_mode_kinds")
    .values(COLLECTION_MODES.map((value) => ({ value })))
    .execute();

  await db
    .insertInto("workflow_currency_kinds")
    .values(CURRENCIES.map((value) => ({ value })))
    .execute();

  await db
    .insertInto("workflow_account_type_kinds")
    .values(ACCOUNT_TYPE_KINDS.map((value) => ({ value })))
    .execute();

  await db
    .insertInto("workflow_settlement_banks")
    .values(SETTLEMENT_BANKS.map((value) => ({ value })))
    .execute();
}
