import type { Kysely } from "kysely";

import { hashPassword } from "~/lib/auth/password/password";

import type { Database } from "../../../types";
import { resolveSeedPassword } from "../../shared/seed-password";

export async function persistDemoIdentities(
  db: Kysely<Database>,
  generatedAtMs: number,
): Promise<void> {
  const now = generatedAtMs;
  const passwordHash = await hashPassword(resolveSeedPassword());

  await db
    .insertInto("branches")
    .values([
      { id: 1, name: "Demo Branch 1", created_at: now },
      { id: 2, name: "Demo Branch 2", created_at: now },
      { id: 3, name: "Demo Branch 3", created_at: now },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

  // Demo users (IDs 1-20)
  await db
    .insertInto("users")
    .values([
      {
        id: 1,
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
        id: 2,
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
        id: 3,
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
        id: 4,
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
      {
        id: 5,
        branch_id: 1,
        username: "matias.castillo",
        email: "matias.castillo@onechannel.pe",
        password_hash: passwordHash,
        names: "Matias",
        first_surname: "Castillo",
        second_surname: "Perez",
        phone_e164: "+51911000005",
        onboarding_completed_at: now,
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        id: 6,
        branch_id: 1,
        username: "lucia.mendoza",
        email: "lucia.mendoza@onechannel.pe",
        password_hash: passwordHash,
        names: "Lucia",
        first_surname: "Mendoza",
        second_surname: "Soto",
        phone_e164: "+51911000006",
        onboarding_completed_at: now,
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        id: 7,
        branch_id: 1,
        username: "andres.huaman",
        email: "andres.huaman@onechannel.pe",
        password_hash: passwordHash,
        names: "Andres",
        first_surname: "Huaman",
        second_surname: "Diaz",
        phone_e164: "+51911000007",
        onboarding_completed_at: now,
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        id: 8,
        branch_id: 2,
        username: "nicolas.torres",
        email: "nicolas.torres@onechannel.pe",
        password_hash: passwordHash,
        names: "Nicolas",
        first_surname: "Torres",
        second_surname: "Luna",
        phone_e164: "+51911000008",
        onboarding_completed_at: now,
        role: "supervisor",
        is_active: 1,
        created_at: now,
      },
      {
        id: 9,
        branch_id: 2,
        username: "sofia.espinoza",
        email: "sofia.espinoza@onechannel.pe",
        password_hash: passwordHash,
        names: "Sofia",
        first_surname: "Espinoza",
        second_surname: "Blanco",
        phone_e164: "+51911000009",
        onboarding_completed_at: now,
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        id: 10,
        branch_id: 2,
        username: "gabriel.vargas",
        email: "gabriel.vargas@onechannel.pe",
        password_hash: passwordHash,
        names: "Gabriel",
        first_surname: "Vargas",
        second_surname: "Riva",
        phone_e164: "+51911000010",
        onboarding_completed_at: now,
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        id: 11,
        branch_id: 2,
        username: "elena.gomez",
        email: "elena.gomez@onechannel.pe",
        password_hash: passwordHash,
        names: "Elena",
        first_surname: "Gomez",
        second_surname: "Cantu",
        phone_e164: "+51911000011",
        onboarding_completed_at: now,
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        id: 12,
        branch_id: 3,
        username: "roberto.quispe",
        email: "roberto.quispe@onechannel.pe",
        password_hash: passwordHash,
        names: "Roberto",
        first_surname: "Quispe",
        second_surname: "Mani",
        phone_e164: "+51911000012",
        onboarding_completed_at: now,
        role: "admin",
        is_active: 1,
        created_at: now,
      },
      {
        id: 13,
        branch_id: 3,
        username: "isabella.silva",
        email: "isabella.silva@onechannel.pe",
        password_hash: passwordHash,
        names: "Isabella",
        first_surname: "Silva",
        second_surname: "Rios",
        phone_e164: "+51911000013",
        onboarding_completed_at: now,
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        id: 14,
        branch_id: 3,
        username: "manuel.suarez",
        email: "manuel.suarez@onechannel.pe",
        password_hash: passwordHash,
        names: "Manuel",
        first_surname: "Suarez",
        second_surname: "Leon",
        phone_e164: "+51911000014",
        onboarding_completed_at: now,
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        id: 15,
        branch_id: 3,
        username: "fernanda.ruiz",
        email: "fernanda.ruiz@onechannel.pe",
        password_hash: passwordHash,
        names: "Fernanda",
        first_surname: "Ruiz",
        second_surname: "Lara",
        phone_e164: "+51911000015",
        onboarding_completed_at: now,
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        id: 16,
        branch_id: 1,
        username: "claudia.vasquez",
        email: "claudia.vasquez@onechannel.pe",
        password_hash: passwordHash,
        names: "Claudia",
        first_surname: "Vasquez",
        second_surname: "Peña",
        phone_e164: "+51911000016",
        onboarding_completed_at: now,
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        id: 17,
        branch_id: 1,
        username: "pablo.flores",
        email: "pablo.flores@onechannel.pe",
        password_hash: passwordHash,
        names: "Pablo",
        first_surname: "Flores",
        second_surname: "Villa",
        phone_e164: "+51911000017",
        onboarding_completed_at: now,
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        id: 18,
        branch_id: 1,
        username: "marina.guillen",
        email: "marina.guillen@onechannel.pe",
        password_hash: passwordHash,
        names: "Marina",
        first_surname: "Guillen",
        second_surname: "Paz",
        phone_e164: "+51911000018",
        onboarding_completed_at: now,
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        id: 19,
        branch_id: 2,
        username: "mariana.velasquez",
        email: "mariana.velasquez@onechannel.pe",
        password_hash: passwordHash,
        names: "Mariana",
        first_surname: "Velasquez",
        second_surname: "Ortiz",
        phone_e164: "+51911000019",
        onboarding_completed_at: now,
        role: "supervisor",
        is_active: 1,
        created_at: now,
      },
      {
        id: 20,
        branch_id: 2,
        username: "jose.torres",
        email: "jose.torres@onechannel.pe",
        password_hash: passwordHash,
        names: "Jose",
        first_surname: "Torres",
        second_surname: "Cueva",
        phone_e164: "+51911000020",
        onboarding_completed_at: now,
        role: "executive",
        is_active: 1,
        created_at: now,
      },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

  // Teams
  await db
    .insertInto("teams")
    .values([
      { id: 1, branch_id: 1, name: "Team Alpha", created_at: now },
      { id: 2, branch_id: 1, name: "Team Bravo", created_at: now },
      { id: 3, branch_id: 2, name: "Team Norte", created_at: now },
      {
        id: 4,
        branch_id: 2,
        name: "Team Norte B",
        created_at: now,
      },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

  // Branch Supervisors
  await db
    .insertInto("branch_supervisors")
    .values([
      { branch_id: 1, user_id: 2, created_at: now }, // Diego Ramirez @ branch 1
      { branch_id: 2, user_id: 8, created_at: now }, // Nicolas Torres @ branch 2
      { branch_id: 2, user_id: 19, created_at: now }, // Mariana Velasquez @ branch 2
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

  // Back Office Assignments
  await db
    .insertInto("back_office_assignments")
    .values([
      { back_office_user_id: 4, team_id: 1, assigned_at: now }, // Josefina Salazar @ team 1
      { back_office_user_id: 4, team_id: 2, assigned_at: now }, // Josefina Salazar @ team 2
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

  // Demo team assignments
  await db
    .updateTable("users")
    .set({ team_id: 1 })
    .where("id", "in", [3, 5, 6, 7])
    .execute();
  await db
    .updateTable("users")
    .set({ team_id: 2 })
    .where("id", "in", [16, 17, 18])
    .execute();
  await db
    .updateTable("users")
    .set({ team_id: 3 })
    .where("id", "in", [9, 10, 11])
    .execute();
  await db
    .updateTable("users")
    .set({ team_id: 4 })
    .where("id", "in", [20])
    .execute();

  // Activity logs for demo users
  await db
    .insertInto("agent_status_logs")
    .values([
      {
        user_id: 3,
        status: "available",
        latitude: -12.046374,
        longitude: -77.042793,
        started_at: now - 3 * oneHour,
      },
      {
        user_id: 5,
        status: "available",
        latitude: -12.046374,
        longitude: -77.042793,
        started_at: now - 2 * oneHour,
      },
      {
        user_id: 6,
        status: "break",
        latitude: -12.046374,
        longitude: -77.042793,
        started_at: now - 30 * oneMinute,
      },
    ])
    .execute();

  await db
    .insertInto("auth_events")
    .values([
      {
        user_id: 1,
        method: "password",
        stage: "login",
        outcome: "success",
        identifier_hash: "seed_identifier_hash",
        ip_hash: "seed_ip_hash",
        created_at: now - oneDay,
      },
      {
        user_id: 2,
        method: "password",
        stage: "login",
        outcome: "success",
        identifier_hash: "seed_identifier_hash",
        ip_hash: "seed_ip_hash",
        created_at: now - oneHour,
      },
    ])
    .execute();

  await db
    .insertInto("user_totp_factors")
    .values([
      {
        user_id: 12,
        secret_encrypted: "seed_dummy_secret",
        is_enabled: 1,
        enabled_at: now,
        created_at: now,
        updated_at: now,
      },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

  // Notification system
  await db
    .insertInto("user_channel_addresses")
    .values([
      {
        id: 1,
        user_id: 1,
        channel: "email",
        address: "valeria.paredes@onechannel.pe",
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
        is_verified: 1,
        verified_at: now - oneDay * 10,
        created_at: now - oneDay * 10,
        updated_at: now - oneDay,
      },
      {
        id: 3,
        user_id: 12,
        channel: "email",
        address: "roberto.quispe@onechannel.pe",
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
}

const oneMinute = 60 * 1000;
const oneHour = 60 * oneMinute;
const oneDay = 24 * oneHour;
