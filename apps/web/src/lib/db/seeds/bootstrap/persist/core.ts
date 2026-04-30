import type { Kysely } from "kysely";

import { hashPassword } from "~/lib/auth/password/password";
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
  const realPasswordHash = await hashPassword("infinitypay");

  // Branches
  await db
    .insertInto("branches")
    .values([{ id: 4, name: "Infinity", created_at: now }])
    .onConflict((oc) => oc.doNothing())
    .execute();

  // Policy defaults
  await db
    .insertInto("search_policy_defaults")
    .values([
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
        scope_id: 4,
        active_buffer_target: 20,
        daily_refill_limit: 50,
        created_at: now,
        updated_at: now,
      },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

  // Exp. users (IDs 21-39)
  await db
    .insertInto("users")
    .values([
      {
        branch_id: 4,
        username: "jorge.quezada",
        email: "jorge.quezada@infinitycorp.pe",
        password_hash: realPasswordHash,
        names: "JORGE ANDRES",
        first_surname: "QUEZADA",
        second_surname: "CORNEJO",
        phone_e164: null,
        onboarding_completed_at: null,
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 4,
        username: "karina.yalta",
        email: "karina.yalta@infinitycorp.pe",
        password_hash: realPasswordHash,
        names: "KARINA",
        first_surname: "YALTA",
        second_surname: "MENDOZA",
        phone_e164: null,
        onboarding_completed_at: null,
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 4,
        username: "luis.betalleluz",
        email: "luis.betalleluz@infinitycorp.pe",
        password_hash: realPasswordHash,
        names: "LUIS FERNANDO",
        first_surname: "BETALLELUZ",
        second_surname: "KALINOWSKI",
        phone_e164: null,
        onboarding_completed_at: null,
        role: "supervisor",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 4,
        username: "sebastian.salazar",
        email: "sebastian.salazar@infinitycorp.pe",
        password_hash: realPasswordHash,
        names: "SEBASTIAN ROMMEL",
        first_surname: "SALAZAR",
        second_surname: "MESTAS",
        phone_e164: null,
        onboarding_completed_at: null,
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 4,
        username: "giancarlo.aranguri",
        email: "giancarlo.aranguri@infinitycorp.pe",
        password_hash: realPasswordHash,
        names: "GIANCARLO ALEXANDER",
        first_surname: "ARANGURI",
        second_surname: "NUÑEZ",
        phone_e164: null,
        onboarding_completed_at: null,
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 4,
        username: "paola.lozano",
        email: "paola.lozano@infinitycorp.pe",
        password_hash: realPasswordHash,
        names: "LIZ PAOLA",
        first_surname: "LOZANO",
        second_surname: "RUIZ",
        phone_e164: null,
        onboarding_completed_at: null,
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 4,
        username: "veronica.banquez",
        email: "veronica.banquez@infinitycorp.pe",
        password_hash: realPasswordHash,
        names: "VERONICA VANESA",
        first_surname: "BANQUEZ",
        second_surname: "BARRETO",
        phone_e164: null,
        onboarding_completed_at: null,
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 4,
        username: "wendy.sarmiento",
        email: "wendy.sarmiento@infinitycorp.pe",
        password_hash: realPasswordHash,
        names: "WENDY CAROLINA",
        first_surname: "SARMIENTO",
        second_surname: "RODRIGUEZ",
        phone_e164: null,
        onboarding_completed_at: null,
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 4,
        username: "victor.franco",
        email: "victor.franco@infinitycorp.pe",
        password_hash: realPasswordHash,
        names: "VICTOR ROBERTO",
        first_surname: "FRANCO",
        second_surname: "SAAVEDRA",
        phone_e164: null,
        onboarding_completed_at: null,
        role: "sales_manager",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 4,
        username: "jose.mendoza",
        email: "jose.mendoza@infinitycorp.pe",
        password_hash: realPasswordHash,
        names: "JOSE GREGORIO",
        first_surname: "MENDOZA",
        second_surname: "PEREIRA",
        phone_e164: null,
        onboarding_completed_at: null,
        role: "back_office",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 4,
        username: "renato.santacruz",
        email: "renato.santacruz@infinitycorp.pe",
        password_hash: realPasswordHash,
        names: "RENATO",
        first_surname: "SANTA CRUZ",
        second_surname: "DURAND",
        phone_e164: null,
        onboarding_completed_at: null,
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 4,
        username: "francisco.suyon",
        email: "francisco.suyon@infinitycorp.pe",
        password_hash: realPasswordHash,
        names: "FRANCISCO ANDRES",
        first_surname: "SUYON",
        second_surname: "SANCHEZ",
        phone_e164: null,
        onboarding_completed_at: null,
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 4,
        username: "franco.fernandez",
        email: "franco.fernandez@infinitycorp.pe",
        password_hash: realPasswordHash,
        names: "ELVIS FRANCO",
        first_surname: "FERNANDEZ",
        second_surname: "FLORES",
        phone_e164: null,
        onboarding_completed_at: null,
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 4,
        username: "eber.montalvo",
        email: "eber.montalvo@infinitycorp.pe",
        password_hash: realPasswordHash,
        names: "EBER MOISES",
        first_surname: "MONTALVO",
        second_surname: "GUERRERO",
        phone_e164: null,
        onboarding_completed_at: null,
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 4,
        username: "pool.ortega",
        email: "pool.ortega@infinitycorp.pe",
        password_hash: realPasswordHash,
        names: "POOL ARIEL",
        first_surname: "ORTEGA",
        second_surname: "INGA",
        phone_e164: null,
        onboarding_completed_at: null,
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 4,
        username: "jesus.avalos",
        email: "jesus.avalos@infinitycorp.pe",
        password_hash: realPasswordHash,
        names: "JESUS MARTIN",
        first_surname: "AVALOS",
        second_surname: "ROJAS",
        phone_e164: null,
        onboarding_completed_at: null,
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 4,
        username: "joyce.llanos",
        email: "joyce.llanos@infinitycorp.pe",
        password_hash: realPasswordHash,
        names: "JOYCE LICETH",
        first_surname: "LLANOS",
        second_surname: "ESPINOZA",
        phone_e164: null,
        onboarding_completed_at: null,
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 4,
        username: "junior.cardozo",
        email: "junior.cardozo@infinitycorp.pe",
        password_hash: realPasswordHash,
        names: "JUNIOR EDINSON",
        first_surname: "CARDOZO",
        second_surname: "AGUILAR",
        phone_e164: null,
        onboarding_completed_at: null,
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 4,
        username: "ricardo.nurena",
        email: "ricardo.nurena@infinitycorp.pe",
        password_hash: realPasswordHash,
        names: "RICARDO ARTURO",
        first_surname: "NUREÑA",
        second_surname: "ORTEGA",
        phone_e164: null,
        onboarding_completed_at: null,
        role: "executive",
        is_active: 1,
        created_at: now,
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
