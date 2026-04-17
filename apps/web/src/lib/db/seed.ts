import type { Kysely } from "kysely";

import { hashPassword } from "../auth/password/password";
import { createLogger } from "../observability/logger";
import { db as globalDb } from "./db";
import type { Database } from "./types";

const logger = createLogger("db-seed");

export async function seedIfEmpty(db: Kysely<Database>) {
  const userCount = await db
    .selectFrom("users")
    .select(db.fn.countAll().as("count"))
    .executeTakeFirst();

  if (userCount && Number(userCount.count) > 0) {
    logger.info("seed_skipped_already_initialized");
    return;
  }

  logger.info("seed_started");
  const now = Date.now();

  await db
    .insertInto("branches")
    .values([
      { name: "Lima Centro", created_at: now },
      { name: "Lima Norte", created_at: now },
      { name: "Arequipa", created_at: now },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

  const passwordHash = await hashPassword("placeholder");

  await db
    .insertInto("users")
    .values([
      {
        branch_id: 1,
        username: "valeria.paredes",
        email: "valeria.paredes@onechannel.pe",
        password_hash: passwordHash,
        names: "Valeria",
        first_surname: "Paredes",
        second_surname: "Quispe",
        phone_e164: "+51911000001",
        onboarding_completed_at: null,
        role: "admin",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 1,
        username: "diego.ramirez",
        email: "diego.ramirez@onechannel.pe",
        password_hash: passwordHash,
        names: "Diego",
        first_surname: "Ramirez",
        second_surname: "Flores",
        phone_e164: "+51911000002",
        onboarding_completed_at: now,
        role: "supervisor",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 1,
        username: "camila.rojas",
        email: "camila.rojas@onechannel.pe",
        password_hash: passwordHash,
        names: "Camila",
        first_surname: "Rojas",
        second_surname: "Torres",
        phone_e164: "+51911000003",
        onboarding_completed_at: now,
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 1,
        username: "josefina.salazar",
        email: "josefina.salazar@onechannel.pe",
        password_hash: passwordHash,
        names: "Josefina",
        first_surname: "Salazar",
        second_surname: "Vega",
        phone_e164: "+51911000004",
        onboarding_completed_at: now,
        role: "back_office",
        is_active: 1,
        created_at: now,
      },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

  await db
    .insertInto("teams")
    .values([
      { branch_id: 1, name: "Team Alpha", supervisor_id: 2, created_at: now },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

  await db
    .updateTable("users")
    .set({ team_id: 1 })
    .where("id", "=", 3)
    .execute();

  await db
    .insertInto("products")
    .values([
      {
        name: "Plan Movil 50GB",
        category: "mobile",
        subtype: "mono",
        price: 69.9,
        is_active: 1,
      },
      {
        name: "Fibra 200Mbps",
        category: "fiber",
        subtype: "mono",
        price: 89.9,
        is_active: 1,
      },
      {
        name: "Duo Fibra + Movil",
        category: "bundle",
        subtype: "duo",
        price: 129.9,
        is_active: 1,
      },
      {
        name: "Plan Movil 120GB",
        category: "mobile",
        subtype: "mono",
        price: 109.9,
        is_active: 1,
      },
      {
        name: "Trio Empresa Full",
        category: "bundle",
        subtype: "trio",
        price: 219.9,
        is_active: 1,
      },
      {
        name: "Plan Legacy 20GB",
        category: "mobile",
        subtype: "mono",
        price: 49.9,
        is_active: 0,
      },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

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
        scope_type: "team",
        scope_id: 1,
        period_type: "month",
        search_limit: 300,
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
        scope_type: "team",
        scope_id: 1,
        active_buffer_target: 12,
        daily_refill_limit: 30,
        created_at: now,
        updated_at: now,
      },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

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
        action: "product_updated",
        risk_level: "high",
        is_active: 1,
        is_protected: 1,
        updated_by_user_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        action: "sales_record_confirmed",
        risk_level: "high",
        is_active: 1,
        is_protected: 1,
        updated_by_user_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        action: "sales_record_rejected",
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

  // Additional users & teams
  await db
    .insertInto("users")
    .values([
      {
        branch_id: 1,
        team_id: 1,
        username: "patricia.navarro",
        email: "patricia.navarro@onechannel.pe",
        password_hash: passwordHash,
        names: "Patricia",
        first_surname: "Navarro",
        second_surname: "Hidalgo",
        phone_e164: "+51911000005",
        onboarding_completed_at: now,
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 1,
        team_id: 1,
        username: "roberto.diaz",
        email: "roberto.diaz@onechannel.pe",
        password_hash: passwordHash,
        names: "Roberto",
        first_surname: "Díaz",
        second_surname: "Luna",
        phone_e164: null,
        onboarding_completed_at: null,
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 1,
        username: "sandra.morales",
        email: "sandra.morales@onechannel.pe",
        password_hash: passwordHash,
        names: "Sandra",
        first_surname: "Morales",
        second_surname: "Paz",
        phone_e164: "+51911000007",
        onboarding_completed_at: now,
        role: "logistics",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 2,
        username: "nicolas.torres",
        email: "nicolas.torres@onechannel.pe",
        password_hash: passwordHash,
        names: "Nicolas",
        first_surname: "Torres",
        second_surname: "Herrera",
        phone_e164: "+51912000008",
        onboarding_completed_at: now,
        role: "supervisor",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 2,
        username: "andrea.quispe",
        email: "andrea.quispe@onechannel.pe",
        password_hash: passwordHash,
        names: "Andrea",
        first_surname: "Quispe",
        second_surname: "Condori",
        phone_e164: "+51912000009",
        onboarding_completed_at: now,
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 2,
        username: "lucia.cespedes",
        email: "lucia.cespedes@onechannel.pe",
        password_hash: passwordHash,
        names: "Lucia",
        first_surname: "Cespedes",
        second_surname: "Peralta",
        phone_e164: "+51912000010",
        onboarding_completed_at: now,
        role: "back_office",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 2,
        username: "franco.cabrera",
        email: "franco.cabrera@onechannel.pe",
        password_hash: passwordHash,
        names: "Franco",
        first_surname: "Cabrera",
        second_surname: "Salas",
        phone_e164: "+51912000011",
        onboarding_completed_at: now,
        role: "logistics",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 1,
        username: "mario.aguirre",
        email: "mario.aguirre@onechannel.pe",
        password_hash: passwordHash,
        names: "Mario",
        first_surname: "Aguirre",
        second_surname: "Castillo",
        phone_e164: "+51911000012",
        onboarding_completed_at: null,
        role: "sales_manager",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 1,
        username: "elena.chavez",
        email: "elena.chavez@onechannel.pe",
        password_hash: passwordHash,
        names: "Elena",
        first_surname: "Chavez",
        second_surname: "Ramos",
        phone_e164: "+51911000013",
        onboarding_completed_at: now,
        role: "hr",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 1,
        username: "sebastian.mejia",
        email: "sebastian.mejia@onechannel.pe",
        password_hash: passwordHash,
        names: "Sebastian",
        first_surname: "Mejia",
        second_surname: "Ortiz",
        phone_e164: "+51911000014",
        onboarding_completed_at: null,
        role: "superuser",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 1,
        username: "renato.guzman",
        email: "renato.guzman@onechannel.pe",
        password_hash: passwordHash,
        names: "Renato",
        first_surname: "Guzman",
        second_surname: "Zevallos",
        phone_e164: "+51911000015",
        onboarding_completed_at: now,
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 1,
        username: "daniela.mendoza",
        email: "daniela.mendoza@onechannel.pe",
        password_hash: passwordHash,
        names: "Daniela",
        first_surname: "Mendoza",
        second_surname: "Cruz",
        phone_e164: "+51911000016",
        onboarding_completed_at: now,
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 2,
        username: "gabriel.rios",
        email: "gabriel.rios@onechannel.pe",
        password_hash: passwordHash,
        names: "Gabriel",
        first_surname: "Rios",
        second_surname: "Solis",
        phone_e164: "+51912000017",
        onboarding_completed_at: now,
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 2,
        username: "paola.suarez",
        email: "paola.suarez@onechannel.pe",
        password_hash: passwordHash,
        names: "Paola",
        first_surname: "Suarez",
        second_surname: "Vargas",
        phone_e164: "+51912000018",
        onboarding_completed_at: now,
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 2,
        username: "mariana.velasquez",
        email: "mariana.velasquez@onechannel.pe",
        password_hash: passwordHash,
        names: "Mariana",
        first_surname: "Velasquez",
        second_surname: "Pinto",
        phone_e164: "+51912000019",
        onboarding_completed_at: now,
        role: "supervisor",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 1,
        username: "ivan.romero",
        email: "ivan.romero@onechannel.pe",
        password_hash: passwordHash,
        names: "Ivan",
        first_surname: "Romero",
        second_surname: "Ccopa",
        phone_e164: "+51911000020",
        onboarding_completed_at: now,
        role: "back_office",
        is_active: 1,
        created_at: now,
      },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

  await db
    .insertInto("teams")
    .values([
      { branch_id: 1, name: "Team Bravo", supervisor_id: 2, created_at: now },
      { branch_id: 2, name: "Team Norte", supervisor_id: 8, created_at: now },
      {
        branch_id: 2,
        name: "Team Norte B",
        supervisor_id: 19,
        created_at: now,
      },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();
  await db
    .updateTable("users")
    .set({ team_id: 3 })
    .where("id", "=", 9)
    .execute();
  await db
    .updateTable("users")
    .set({ team_id: 2 })
    .where("id", "in", [15, 16, 20])
    .execute();
  await db
    .updateTable("users")
    .set({ team_id: 4 })
    .where("id", "in", [17, 18])
    .execute();

  const oneDay = 86400000;
  // Inventory items
  await db
    .insertInto("inventory_items")
    .values([
      {
        product_id: 1,
        serial_number: "MOV-2026-0001",
        status: "available",
        created_at: now,
      },
      {
        product_id: 1,
        serial_number: "MOV-2026-0002",
        status: "available",
        created_at: now,
      },
      {
        product_id: 1,
        serial_number: "MOV-2026-0003",
        status: "reserved",
        created_at: now,
      },
      {
        product_id: 2,
        serial_number: "FIB-2026-0001",
        status: "available",
        created_at: now,
      },
      {
        product_id: 2,
        serial_number: "FIB-2026-0002",
        status: "sold",
        created_at: now,
      },
      {
        product_id: 3,
        serial_number: "DUO-2026-0001",
        status: "available",
        created_at: now,
      },
      {
        product_id: 3,
        serial_number: "DUO-2026-0002",
        status: "available",
        created_at: now,
      },
      {
        product_id: 3,
        serial_number: "DUO-2026-0003",
        status: "reserved",
        created_at: now,
      },
      {
        product_id: 1,
        serial_number: "MOV-2026-0101",
        status: "available",
        created_at: now,
      },
      {
        product_id: 2,
        serial_number: "FIB-2026-0101",
        status: "available",
        created_at: now,
      },
      {
        product_id: 2,
        serial_number: "FIB-2026-0102",
        status: "reserved",
        created_at: now,
      },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

  await db
    .insertInto("agent_status_logs")
    .values([
      {
        user_id: 3,
        status: "available",
        latitude: -12.0464,
        longitude: -77.0428,
        comment: "Inicio de turno",
        started_at: now - oneDay / 2,
        ended_at: now - oneDay / 3,
      },
      {
        user_id: 3,
        status: "break",
        latitude: -12.0461,
        longitude: -77.0431,
        comment: "Refrigerio",
        started_at: now - oneDay / 3,
        ended_at: now - oneDay / 4,
      },
      {
        user_id: 5,
        status: "feedback",
        latitude: -12.0459,
        longitude: -77.043,
        comment: "Sesión con supervisor",
        started_at: now - oneDay / 2,
        ended_at: now - oneDay / 3,
      },
      {
        user_id: 9,
        status: "training",
        latitude: -11.996,
        longitude: -77.058,
        comment: "Capacitación producto nuevo",
        started_at: now - oneDay / 2,
        ended_at: null,
      },
      {
        user_id: 9,
        status: "services",
        latitude: -11.995,
        longitude: -77.057,
        comment: "Gestión en plataforma externa",
        started_at: now - oneDay,
        ended_at: now - oneDay / 2,
      },
      {
        user_id: 6,
        status: "unavailable",
        latitude: -12.0444,
        longitude: -77.0455,
        comment: "Permiso médico",
        started_at: now - oneDay * 2,
        ended_at: now - oneDay,
      },
      {
        user_id: 15,
        status: "available",
        latitude: -12.0468,
        longitude: -77.0418,
        comment: "Backlog en curso",
        started_at: now - oneDay / 3,
        ended_at: null,
      },
      {
        user_id: 16,
        status: "services",
        latitude: -12.0472,
        longitude: -77.0402,
        comment: "Verificando datos del cliente",
        started_at: now - oneDay / 2,
        ended_at: null,
      },
      {
        user_id: 17,
        status: "feedback",
        latitude: -11.9971,
        longitude: -77.0562,
        comment: "Revisión de KPI semanal",
        started_at: now - oneDay / 4,
        ended_at: null,
      },
      {
        user_id: 18,
        status: "break",
        latitude: -11.9982,
        longitude: -77.0554,
        comment: "Pausa activa",
        started_at: now - oneDay / 6,
        ended_at: null,
      },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

  await db
    .insertInto("audit_logs")
    .values([
      {
        user_id: 12,
        action: "product_updated",
        entity_type: "product",
        entity_id: 1,
        changes: JSON.stringify({
          previous: { price: 69.9, is_active: 1 },
          next: { price: 72.9, is_active: 1 },
        }),
        created_at: now - oneDay * 2,
      },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

  await db
    .insertInto("auth_events")
    .values([
      {
        user_id: 1,
        method: "password",
        stage: "login",
        outcome: "success",
        reason: null,
        identifier_hash: "seed_admin_identifier_hash",
        ip_hash: "seed_ip_hash_1",
        created_at: now - oneDay,
      },
      {
        user_id: 1,
        method: "totp",
        stage: "verify",
        outcome: "success",
        reason: "totp_verified",
        identifier_hash: "seed_admin_identifier_hash",
        ip_hash: "seed_ip_hash_1",
        created_at: now - oneDay + 10_000,
      },
      {
        user_id: 12,
        method: "password",
        stage: "login",
        outcome: "failure",
        reason: "invalid_password",
        identifier_hash: "seed_manager_identifier_hash",
        ip_hash: "seed_ip_hash_2",
        created_at: now - oneDay / 2,
      },
      {
        user_id: 12,
        method: "password",
        stage: "login",
        outcome: "throttled",
        reason: "threshold_exceeded",
        identifier_hash: "seed_manager_identifier_hash",
        ip_hash: "seed_ip_hash_2",
        created_at: now - oneDay / 2 + 10_000,
      },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

  await db
    .insertInto("user_totp_factors")
    .values([
      {
        user_id: 1,
        secret_encrypted: "seed_totp_secret_admin",
        is_enabled: 0,
        created_at: now - oneDay * 10,
        updated_at: now - oneDay,
        enabled_at: null,
      },
      {
        user_id: 12,
        secret_encrypted: "seed_totp_secret_manager",
        is_enabled: 1,
        created_at: now - oneDay * 8,
        updated_at: now - oneDay * 2,
        enabled_at: now - oneDay * 7,
      },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

  await db
    .insertInto("user_totp_recovery_codes")
    .values([
      {
        user_id: 12,
        code_hash: "seed_code_hash_manager_1",
        used_at: null,
        created_at: now - oneDay * 7,
      },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

  await db
    .insertInto("notification_contacts")
    .values([
      {
        id: 1,
        user_id: 1,
        channel: "email",
        address: "valeria.paredes@onechannel.pe",
        is_primary: 1,
        is_verified: 1,
        verified_at: now - oneDay * 10,
        created_at: now - oneDay * 10,
        updated_at: now - oneDay,
      },
      {
        id: 2,
        user_id: 1,
        channel: "whatsapp",
        address: "+51911000001",
        is_primary: 1,
        is_verified: 1,
        verified_at: now - oneDay * 10,
        created_at: now - oneDay * 10,
        updated_at: now - oneDay,
      },
      {
        id: 3,
        user_id: 12,
        channel: "email",
        address: "mario.aguirre@onechannel.pe",
        is_primary: 1,
        is_verified: 1,
        verified_at: now - oneDay * 8,
        created_at: now - oneDay * 8,
        updated_at: now - oneDay,
      },
      {
        id: 4,
        user_id: 12,
        channel: "whatsapp",
        address: "+51911000012",
        is_primary: 1,
        is_verified: 1,
        verified_at: now - oneDay * 8,
        created_at: now - oneDay * 8,
        updated_at: now - oneDay,
      },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

  await db
    .insertInto("notification_preferences")
    .values([
      {
        id: 1,
        user_id: 1,
        event_type: "security.privileged_login",
        channel: "email",
        is_enabled: 1,
        created_at: now - oneDay * 8,
        updated_at: now - oneDay,
      },
      {
        id: 2,
        user_id: 1,
        event_type: "security.privileged_login",
        channel: "whatsapp",
        is_enabled: 1,
        created_at: now - oneDay * 8,
        updated_at: now - oneDay,
      },
      {
        id: 3,
        user_id: 12,
        event_type: "broadcast.general",
        channel: "email",
        is_enabled: 1,
        created_at: now - oneDay * 6,
        updated_at: now - oneDay,
      },
      {
        id: 4,
        user_id: 12,
        event_type: "broadcast.general",
        channel: "whatsapp",
        is_enabled: 0,
        created_at: now - oneDay * 6,
        updated_at: now - oneDay,
      },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

  await db
    .insertInto("notification_campaigns")
    .values([
      {
        id: 1,
        type: "security_event",
        event_type: "security.privileged_login",
        audience_type: "user",
        audience_ref: "1",
        title: "Security alert: privileged login (admin)",
        body_text: "Admin login from a new location was detected.",
        created_by_user_id: null,
        status: "completed",
        scheduled_at: null,
        created_at: now - oneDay,
        processed_at: now - oneDay + 15_000,
      },
      {
        id: 2,
        type: "broadcast",
        event_type: "broadcast.general",
        audience_type: "role",
        audience_ref: "supervisor",
        title: "Cambio en guion comercial",
        body_text: "Revisar guion actualizado para campaña fibra.",
        created_by_user_id: 12,
        status: "completed",
        scheduled_at: now - oneDay / 2,
        created_at: now - oneDay / 2,
        processed_at: now - oneDay / 2 + 20_000,
      },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

  await db
    .insertInto("notification_recipients")
    .values([
      {
        id: 1,
        campaign_id: 1,
        user_id: 1,
        channel: "email",
        address: "valeria.paredes@onechannel.pe",
        status: "sent",
        status_reason: null,
        created_at: now - oneDay,
        sent_at: now - oneDay + 30_000,
        failed_at: null,
      },
      {
        id: 2,
        campaign_id: 1,
        user_id: 1,
        channel: "whatsapp",
        address: "+51911000001",
        status: "sent",
        status_reason: null,
        created_at: now - oneDay,
        sent_at: now - oneDay + 35_000,
        failed_at: null,
      },
      {
        id: 3,
        campaign_id: 2,
        user_id: 2,
        channel: "email",
        address: "diego.ramirez@onechannel.pe",
        status: "sent",
        status_reason: null,
        created_at: now - oneDay / 2,
        sent_at: now - oneDay / 2 + 40_000,
        failed_at: null,
      },
      {
        id: 4,
        campaign_id: 2,
        user_id: 8,
        channel: "email",
        address: "nicolas.torres@onechannel.pe",
        status: "failed",
        status_reason: "mailbox_unreachable",
        created_at: now - oneDay / 2,
        sent_at: null,
        failed_at: now - oneDay / 2 + 50_000,
      },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

  await db
    .insertInto("notification_jobs")
    .values([
      {
        id: 1,
        recipient_id: 1,
        status: "sent",
        attempt_count: 1,
        max_attempts: 5,
        available_at: now - oneDay,
        lease_owner: null,
        lease_until: null,
        last_error: null,
        created_at: now - oneDay,
        updated_at: now - oneDay + 30_000,
      },
      {
        id: 2,
        recipient_id: 2,
        status: "sent",
        attempt_count: 1,
        max_attempts: 5,
        available_at: now - oneDay,
        lease_owner: null,
        lease_until: null,
        last_error: null,
        created_at: now - oneDay,
        updated_at: now - oneDay + 35_000,
      },
      {
        id: 3,
        recipient_id: 3,
        status: "sent",
        attempt_count: 1,
        max_attempts: 5,
        available_at: now - oneDay / 2,
        lease_owner: null,
        lease_until: null,
        last_error: null,
        created_at: now - oneDay / 2,
        updated_at: now - oneDay / 2 + 40_000,
      },
      {
        id: 4,
        recipient_id: 4,
        status: "failed",
        attempt_count: 5,
        max_attempts: 5,
        available_at: now - oneDay / 2,
        lease_owner: null,
        lease_until: null,
        last_error: "mailbox_unreachable",
        created_at: now - oneDay / 2,
        updated_at: now - oneDay / 2 + 50_000,
      },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

  await db
    .insertInto("notification_deliveries")
    .values([
      {
        id: 1,
        recipient_id: 1,
        provider: "resend",
        provider_message_id: "seed-msg-resend-1",
        status: "sent",
        error_code: null,
        error_message: null,
        latency_ms: 420,
        created_at: now - oneDay + 30_000,
      },
      {
        id: 2,
        recipient_id: 2,
        provider: "whatsapp_cloud",
        provider_message_id: "seed-msg-wa-1",
        status: "sent",
        error_code: null,
        error_message: null,
        latency_ms: 690,
        created_at: now - oneDay + 35_000,
      },
      {
        id: 3,
        recipient_id: 4,
        provider: "resend",
        provider_message_id: null,
        status: "failed",
        error_code: "mailbox_unreachable",
        error_message: "Mailbox does not exist",
        latency_ms: 510,
        created_at: now - oneDay / 2 + 50_000,
      },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

  logger.info("seed_completed");
}

async function seed() {
  try {
    await seedIfEmpty(globalDb);
    process.exit(0);
  } catch (err) {
    logger.error("seed_failed", { error: err });
    process.exit(1);
  }
}

if (import.meta.main) {
  void seed();
}
