import type { Kysely } from "kysely";

import { hashPassword } from "~/lib/auth/password/password";
import { asUserId } from "~/server/shared/ids";

import type { Database } from "../../../types";
import { resolveSeedPassword } from "../../shared/seed-password";

export async function persistDemoIdentities(
  db: Kysely<Database>,
  generatedAtMs: number,
): Promise<void> {
  const nowMs = generatedAtMs;
  const now = new Date(nowMs);
  const passwordHash = await hashPassword(resolveSeedPassword());

  await db
    .insertInto("branches")
    .values([
      { id: seedUuid(1), name: "Demo Branch 1", created_at: now },
      { id: seedUuid(2), name: "Demo Branch 2", created_at: now },
      { id: seedUuid(3), name: "Demo Branch 3", created_at: now },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

  // Demo users (IDs 1-20)
  await db
    .insertInto("users")
    .values([
      {
        id: seedUuid(1),
        branch_id: seedUuid(1),
        username: "valeria.paredes",
        email: "valeria.paredes@onechannel.pe",
        password_hash: passwordHash,
        names: "Valeria",
        first_surname: "Paredes",
        second_surname: "Quispe",
        onboarding_completed_at: null,
        role: "admin",
        is_active: true,
        created_at: now,
      },
      {
        id: seedUuid(2),
        branch_id: seedUuid(1),
        username: "diego.ramirez",
        email: "diego.ramirez@onechannel.pe",
        password_hash: passwordHash,
        names: "Diego",
        first_surname: "Ramirez",
        second_surname: "Flores",
        onboarding_completed_at: now,
        role: "supervisor",
        is_active: true,
        created_at: now,
      },
      {
        id: seedUuid(3),
        branch_id: seedUuid(1),
        username: "camila.rojas",
        email: "camila.rojas@onechannel.pe",
        password_hash: passwordHash,
        names: "Camila",
        first_surname: "Rojas",
        second_surname: "Torres",
        onboarding_completed_at: now,
        role: "executive",
        is_active: true,
        created_at: now,
      },
      {
        id: seedUuid(4),
        branch_id: seedUuid(1),
        username: "josefina.salazar",
        email: "josefina.salazar@onechannel.pe",
        password_hash: passwordHash,
        names: "Josefina",
        first_surname: "Salazar",
        second_surname: "Vega",
        onboarding_completed_at: now,
        role: "back_office",
        is_active: true,
        created_at: now,
      },
      {
        id: seedUuid(5),
        branch_id: seedUuid(1),
        username: "matias.castillo",
        email: "matias.castillo@onechannel.pe",
        password_hash: passwordHash,
        names: "Matias",
        first_surname: "Castillo",
        second_surname: "Perez",
        onboarding_completed_at: now,
        role: "executive",
        is_active: true,
        created_at: now,
      },
      {
        id: seedUuid(6),
        branch_id: seedUuid(1),
        username: "lucia.mendoza",
        email: "lucia.mendoza@onechannel.pe",
        password_hash: passwordHash,
        names: "Lucia",
        first_surname: "Mendoza",
        second_surname: "Soto",
        onboarding_completed_at: now,
        role: "executive",
        is_active: true,
        created_at: now,
      },
      {
        id: seedUuid(7),
        branch_id: seedUuid(1),
        username: "andres.huaman",
        email: "andres.huaman@onechannel.pe",
        password_hash: passwordHash,
        names: "Andres",
        first_surname: "Huaman",
        second_surname: "Diaz",
        onboarding_completed_at: now,
        role: "executive",
        is_active: true,
        created_at: now,
      },
      {
        id: seedUuid(8),
        branch_id: seedUuid(2),
        username: "nicolas.torres",
        email: "nicolas.torres@onechannel.pe",
        password_hash: passwordHash,
        names: "Nicolas",
        first_surname: "Torres",
        second_surname: "Luna",
        onboarding_completed_at: now,
        role: "supervisor",
        is_active: true,
        created_at: now,
      },
      {
        id: seedUuid(9),
        branch_id: seedUuid(2),
        username: "sofia.espinoza",
        email: "sofia.espinoza@onechannel.pe",
        password_hash: passwordHash,
        names: "Sofia",
        first_surname: "Espinoza",
        second_surname: "Blanco",
        onboarding_completed_at: now,
        role: "executive",
        is_active: true,
        created_at: now,
      },
      {
        id: seedUuid(10),
        branch_id: seedUuid(2),
        username: "gabriel.vargas",
        email: "gabriel.vargas@onechannel.pe",
        password_hash: passwordHash,
        names: "Gabriel",
        first_surname: "Vargas",
        second_surname: "Riva",
        onboarding_completed_at: now,
        role: "executive",
        is_active: true,
        created_at: now,
      },
      {
        id: seedUuid(11),
        branch_id: seedUuid(2),
        username: "elena.gomez",
        email: "elena.gomez@onechannel.pe",
        password_hash: passwordHash,
        names: "Elena",
        first_surname: "Gomez",
        second_surname: "Cantu",
        onboarding_completed_at: now,
        role: "executive",
        is_active: true,
        created_at: now,
      },
      {
        id: seedUuid(12),
        branch_id: seedUuid(3),
        username: "roberto.quispe",
        email: "roberto.quispe@onechannel.pe",
        password_hash: passwordHash,
        names: "Roberto",
        first_surname: "Quispe",
        second_surname: "Mani",
        onboarding_completed_at: now,
        role: "admin",
        is_active: true,
        created_at: now,
      },
      {
        id: seedUuid(13),
        branch_id: seedUuid(3),
        username: "isabella.silva",
        email: "isabella.silva@onechannel.pe",
        password_hash: passwordHash,
        names: "Isabella",
        first_surname: "Silva",
        second_surname: "Rios",
        onboarding_completed_at: now,
        role: "executive",
        is_active: true,
        created_at: now,
      },
      {
        id: seedUuid(14),
        branch_id: seedUuid(3),
        username: "manuel.suarez",
        email: "manuel.suarez@onechannel.pe",
        password_hash: passwordHash,
        names: "Manuel",
        first_surname: "Suarez",
        second_surname: "Leon",
        onboarding_completed_at: now,
        role: "executive",
        is_active: true,
        created_at: now,
      },
      {
        id: seedUuid(15),
        branch_id: seedUuid(3),
        username: "fernanda.ruiz",
        email: "fernanda.ruiz@onechannel.pe",
        password_hash: passwordHash,
        names: "Fernanda",
        first_surname: "Ruiz",
        second_surname: "Lara",
        onboarding_completed_at: now,
        role: "executive",
        is_active: true,
        created_at: now,
      },
      {
        id: seedUuid(16),
        branch_id: seedUuid(1),
        username: "claudia.vasquez",
        email: "claudia.vasquez@onechannel.pe",
        password_hash: passwordHash,
        names: "Claudia",
        first_surname: "Vasquez",
        second_surname: "Peña",
        onboarding_completed_at: now,
        role: "executive",
        is_active: true,
        created_at: now,
      },
      {
        id: seedUuid(17),
        branch_id: seedUuid(1),
        username: "pablo.flores",
        email: "pablo.flores@onechannel.pe",
        password_hash: passwordHash,
        names: "Pablo",
        first_surname: "Flores",
        second_surname: "Villa",
        onboarding_completed_at: now,
        role: "executive",
        is_active: true,
        created_at: now,
      },
      {
        id: seedUuid(18),
        branch_id: seedUuid(1),
        username: "marina.guillen",
        email: "marina.guillen@onechannel.pe",
        password_hash: passwordHash,
        names: "Marina",
        first_surname: "Guillen",
        second_surname: "Paz",
        onboarding_completed_at: now,
        role: "executive",
        is_active: true,
        created_at: now,
      },
      {
        id: seedUuid(19),
        branch_id: seedUuid(2),
        username: "mariana.velasquez",
        email: "mariana.velasquez@onechannel.pe",
        password_hash: passwordHash,
        names: "Mariana",
        first_surname: "Velasquez",
        second_surname: "Ortiz",
        onboarding_completed_at: now,
        role: "supervisor",
        is_active: true,
        created_at: now,
      },
      {
        id: seedUuid(20),
        branch_id: seedUuid(2),
        username: "jose.torres",
        email: "jose.torres@onechannel.pe",
        password_hash: passwordHash,
        names: "Jose",
        first_surname: "Torres",
        second_surname: "Cueva",
        onboarding_completed_at: now,
        role: "executive",
        is_active: true,
        created_at: now,
      },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

  // Teams
  await db
    .insertInto("teams")
    .values([
      {
        id: seedUuid(1),
        branch_id: seedUuid(1),
        name: "Team Alpha",
        created_at: now,
      },
      {
        id: seedUuid(2),
        branch_id: seedUuid(1),
        name: "Team Bravo",
        created_at: now,
      },
      {
        id: seedUuid(3),
        branch_id: seedUuid(2),
        name: "Team Norte",
        created_at: now,
      },
      {
        id: seedUuid(4),
        branch_id: seedUuid(2),
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
      { branch_id: seedUuid(1), user_id: seedUuid(2), created_at: now }, // Diego Ramirez @ branch 1
      { branch_id: seedUuid(2), user_id: seedUuid(8), created_at: now }, // Nicolas Torres @ branch 2
      { branch_id: seedUuid(2), user_id: seedUuid(19), created_at: now }, // Mariana Velasquez @ branch 2
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

  // Back Office Assignments
  await db
    .insertInto("back_office_assignments")
    .values([
      {
        back_office_user_id: seedUuid(4),
        team_id: seedUuid(1),
        assigned_at: now,
      }, // Josefina Salazar @ team 1
      {
        back_office_user_id: seedUuid(4),
        team_id: seedUuid(2),
        assigned_at: now,
      }, // Josefina Salazar @ team 2
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

  // Demo team assignments
  await db
    .updateTable("users")
    .set({ team_id: seedUuid(1) })
    .where("id", "in", [3, 5, 6, 7].map(seedUserId))
    .execute();
  await db
    .updateTable("users")
    .set({ team_id: seedUuid(2) })
    .where("id", "in", [16, 17, 18].map(seedUserId))
    .execute();
  await db
    .updateTable("users")
    .set({ team_id: seedUuid(3) })
    .where("id", "in", [9, 10, 11].map(seedUserId))
    .execute();
  await db
    .updateTable("users")
    .set({ team_id: seedUuid(4) })
    .where("id", "in", [20].map(seedUserId))
    .execute();

  // Activity logs for demo users
  await db
    .insertInto("agent_status_logs")
    .values([
      {
        user_id: seedUuid(3),
        status: "available",
        latitude: -12.046374,
        longitude: -77.042793,
        started_at: new Date(nowMs - 3 * oneHour),
      },
      {
        user_id: seedUuid(5),
        status: "available",
        latitude: -12.046374,
        longitude: -77.042793,
        started_at: new Date(nowMs - 2 * oneHour),
      },
      {
        user_id: seedUuid(6),
        status: "break",
        latitude: -12.046374,
        longitude: -77.042793,
        started_at: new Date(nowMs - 30 * oneMinute),
      },
    ])
    .execute();

  await db
    .insertInto("auth_events")
    .values([
      {
        user_id: seedUuid(1),
        method: "password",
        stage: "login",
        outcome: "success",
        identifier_hash: "seed_identifier_hash",
        ip_hash: "seed_ip_hash",
        created_at: new Date(nowMs - oneDay),
      },
      {
        user_id: seedUuid(2),
        method: "password",
        stage: "login",
        outcome: "success",
        identifier_hash: "seed_identifier_hash",
        ip_hash: "seed_ip_hash",
        created_at: new Date(nowMs - oneHour),
      },
    ])
    .execute();

  await db
    .insertInto("user_totp_factors")
    .values([
      {
        user_id: seedUuid(12),
        secret_encrypted: "seed_dummy_secret",
        is_enabled: true,
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
        id: seedUuid(1),
        user_id: seedUuid(1),
        channel: "email",
        address: "valeria.paredes@onechannel.pe",
        is_verified: true,
        verified_at: new Date(nowMs - oneDay * 10),
        created_at: new Date(nowMs - oneDay * 10),
        updated_at: new Date(nowMs - oneDay),
      },
      {
        id: seedUuid(2),
        user_id: seedUuid(1),
        channel: "whatsapp",
        address: "911000001",
        is_verified: true,
        verified_at: new Date(nowMs - oneDay * 10),
        created_at: new Date(nowMs - oneDay * 10),
        updated_at: new Date(nowMs - oneDay),
      },
      {
        id: seedUuid(3),
        user_id: seedUuid(12),
        channel: "email",
        address: "roberto.quispe@onechannel.pe",
        is_verified: true,
        verified_at: new Date(nowMs - oneDay * 8),
        created_at: new Date(nowMs - oneDay * 8),
        updated_at: new Date(nowMs - oneDay),
      },
      {
        id: seedUuid(4),
        user_id: seedUuid(12),
        channel: "whatsapp",
        address: "911000012",
        is_verified: true,
        verified_at: new Date(nowMs - oneDay * 8),
        created_at: new Date(nowMs - oneDay * 8),
        updated_at: new Date(nowMs - oneDay),
      },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

  await db
    .insertInto("notification_preferences")
    .values([
      {
        id: seedUuid(1),
        user_id: seedUuid(1),
        event_type: "security.privileged_login",
        channel: "email",
        is_enabled: true,
        created_at: new Date(nowMs - oneDay * 8),
        updated_at: new Date(nowMs - oneDay),
      },
      {
        id: seedUuid(2),
        user_id: seedUuid(1),
        event_type: "security.privileged_login",
        channel: "whatsapp",
        is_enabled: true,
        created_at: new Date(nowMs - oneDay * 8),
        updated_at: new Date(nowMs - oneDay),
      },
      {
        id: seedUuid(3),
        user_id: seedUuid(12),
        event_type: "broadcast.general",
        channel: "email",
        is_enabled: true,
        created_at: new Date(nowMs - oneDay * 6),
        updated_at: new Date(nowMs - oneDay),
      },
      {
        id: seedUuid(4),
        user_id: seedUuid(12),
        event_type: "broadcast.general",
        channel: "whatsapp",
        is_enabled: false,
        created_at: new Date(nowMs - oneDay * 6),
        updated_at: new Date(nowMs - oneDay),
      },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

  await db
    .insertInto("whatsapp_sessions")
    .values([
      { user_id: seedUuid(1), expires_at: new Date(nowMs + oneDay) },
      { user_id: seedUuid(12), expires_at: new Date(nowMs + oneDay) },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();
}

function seedUuid(value: number): string {
  return `00000000-0000-0000-0000-${String(value).padStart(12, "0")}`;
}

function seedUserId(value: number) {
  return asUserId(seedUuid(value));
}

const oneMinute = 60 * 1000;
const oneHour = 60 * oneMinute;
const oneDay = 24 * oneHour;
