import type { Kysely } from "kysely";

import {
  ABONO_BANKS,
  ACCOUNT_TYPE_KINDS,
  CULQI_PRODUCT_KINDS,
  MODALIDAD_COBRO_KINDS,
  MONEDAS,
} from "~/workflow/contracts/lead-schema";

import type { Database } from "../../../types";
import type { CompiledBaseDataScenario } from "../compiler";

export async function persistBaseData(
  db: Kysely<Database>,
  compiled: CompiledBaseDataScenario,
): Promise<void> {
  const now = compiled.generatedAtMs;

  // Branches
  await db
    .insertInto("branches")
    .values([
      { name: "Lima Centro", created_at: now }, // id: 1
      { name: "Lima Norte", created_at: now }, // id: 2
      { name: "Arequipa", created_at: now }, // id: 3
      { name: "Infinity", created_at: now }, // id: 4
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

  // Policy defaults
  await db
    .insertInto("search_policy_defaults")
    .values([
      {
        scope_type: "branch",
        scope_id: 1,
        period_type: "month",
        search_limit: 250,
        created_at: now,
        updated_at: now,
      },
      {
        scope_type: "branch",
        scope_id: 2,
        period_type: "month",
        search_limit: 220,
        created_at: now,
        updated_at: now,
      },
      {
        scope_type: "branch",
        scope_id: 3,
        period_type: "month",
        search_limit: 200,
        created_at: now,
        updated_at: now,
      },
      {
        scope_type: "branch",
        scope_id: 4,
        period_type: "month",
        search_limit: 500,
        created_at: now,
        updated_at: now,
      },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

  await db
    .insertInto("lead_policy_defaults")
    .values([
      {
        scope_type: "branch",
        scope_id: 1,
        active_buffer_target: 10,
        daily_refill_limit: 25,
        created_at: now,
        updated_at: now,
      },
      {
        scope_type: "branch",
        scope_id: 2,
        active_buffer_target: 8,
        daily_refill_limit: 20,
        created_at: now,
        updated_at: now,
      },
      {
        scope_type: "branch",
        scope_id: 4,
        active_buffer_target: 20,
        daily_refill_limit: 50,
        created_at: now,
        updated_at: now,
      },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

  await db
    .insertInto("workflow_tipo_producto_kinds")
    .values(CULQI_PRODUCT_KINDS.map((value) => ({ value })))
    .onConflict((oc) => oc.doNothing())
    .execute();

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

  // Audit policies
  await db
    .insertInto("audit_action_policies")
    .values([
      {
        action: "all_sessions_revoked",
        risk_level: "high",
        is_active: 1,
        is_protected: 1,
        updated_by_user_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        action: "session_revoked_by_admin",
        risk_level: "high",
        is_active: 1,
        is_protected: 1,
        updated_by_user_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        action: "search_allowance_granted",
        risk_level: "high",
        is_active: 1,
        is_protected: 1,
        updated_by_user_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        action: "lead_refill_granted",
        risk_level: "high",
        is_active: 1,
        is_protected: 1,
        updated_by_user_id: null,
        created_at: now,
        updated_at: now,
      },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();
}
