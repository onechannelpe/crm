import type { Kysely } from "kysely";

import {
  ABONO_BANKS,
  ACCOUNT_TYPE_KINDS,
  MODALIDAD_COBRO_KINDS,
  MONEDAS,
} from "~/contracts/workflow";

import type { Database } from "../../../types";

export async function persistWorkflowKinds(
  db: Kysely<Database>,
): Promise<void> {
  await db
    .insertInto("workflow_modalidad_cobro_kinds")
    .values(MODALIDAD_COBRO_KINDS.map((value) => ({ value })))
    .onConflict((oc) => oc.doNothing())
    .execute();

  await db
    .insertInto("workflow_currency_kinds")
    .values(MONEDAS.map((value) => ({ value })))
    .onConflict((oc) => oc.doNothing())
    .execute();

  await db
    .insertInto("workflow_account_type_kinds")
    .values(ACCOUNT_TYPE_KINDS.map((value) => ({ value })))
    .onConflict((oc) => oc.doNothing())
    .execute();

  await db
    .insertInto("workflow_abono_banks")
    .values(ABONO_BANKS.map((value) => ({ value })))
    .onConflict((oc) => oc.doNothing())
    .execute();
}
