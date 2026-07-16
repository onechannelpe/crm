import type { Kysely } from "kysely";

import { hashPassword } from "~/lib/auth/password/password";

import type { Database } from "../../../types";
import type { SeedContext } from "../../shared/context";
import { resolveInstallationPassword } from "../../shared/installation-password";
import { stableSeedId } from "../../shared/stable-id";
import {
  ANDRES,
  CAMILA,
  CLAUDIA,
  DEMO_BRANCH_1,
  DEMO_BRANCH_2,
  DEMO_BRANCH_3,
  DEMO_TEAM_ALPHA,
  DEMO_TEAM_BRAVO,
  DEMO_TEAM_NORTE,
  DEMO_TEAM_NORTE_B,
  DIEGO,
  ELENA,
  FERNANDA,
  GABRIEL,
  ISABELLA,
  JOSE,
  JOSEFINA,
  LUCIA,
  MANUEL,
  MARIANA,
  MARINA,
  MATIAS,
  NICOLAS,
  PABLO,
  ROBERTO,
  SOFIA,
  VALERIA,
} from "../demo-ids";

export async function persistDemoIdentities(
  db: Kysely<Database>,
  context: SeedContext,
): Promise<void> {
  const nowMs = context.anchorDate.getTime();
  const now = new Date(nowMs);
  const passwordHash = await hashPassword(resolveInstallationPassword());

  await db
    .insertInto("branches")
    .values([
      { id: DEMO_BRANCH_1, name: "Lima Centro", created_at: now },
      { id: DEMO_BRANCH_2, name: "Lima Norte", created_at: now },
      { id: DEMO_BRANCH_3, name: "Chiclayo", created_at: now },
    ])
    .execute();

  await db
    .insertInto("users")
    .values([
      {
        id: VALERIA,
        branch_id: DEMO_BRANCH_1,
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
        id: DIEGO,
        branch_id: DEMO_BRANCH_1,
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
        id: CAMILA,
        branch_id: DEMO_BRANCH_1,
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
        id: JOSEFINA,
        branch_id: DEMO_BRANCH_1,
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
        id: MATIAS,
        branch_id: DEMO_BRANCH_1,
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
        id: LUCIA,
        branch_id: DEMO_BRANCH_1,
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
        id: ANDRES,
        branch_id: DEMO_BRANCH_1,
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
        id: NICOLAS,
        branch_id: DEMO_BRANCH_2,
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
        id: SOFIA,
        branch_id: DEMO_BRANCH_2,
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
        id: GABRIEL,
        branch_id: DEMO_BRANCH_2,
        username: "gabriel.vargas",
        email: "gabriel.vargas@onechannel.pe",
        password_hash: passwordHash,
        names: "Gabriel",
        first_surname: "Vargas",
        second_surname: "Riva",
        onboarding_completed_at: now,
        role: "back_office",
        is_active: true,
        created_at: now,
      },
      {
        id: ELENA,
        branch_id: DEMO_BRANCH_2,
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
        id: ROBERTO,
        branch_id: DEMO_BRANCH_3,
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
        id: ISABELLA,
        branch_id: DEMO_BRANCH_3,
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
        id: MANUEL,
        branch_id: DEMO_BRANCH_3,
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
        id: FERNANDA,
        branch_id: DEMO_BRANCH_3,
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
        id: CLAUDIA,
        branch_id: DEMO_BRANCH_1,
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
        id: PABLO,
        branch_id: DEMO_BRANCH_1,
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
        id: MARINA,
        branch_id: DEMO_BRANCH_1,
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
        id: MARIANA,
        branch_id: DEMO_BRANCH_2,
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
        id: JOSE,
        branch_id: DEMO_BRANCH_2,
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
    .execute();

  await db
    .insertInto("teams")
    .values([
      {
        id: DEMO_TEAM_ALPHA,
        branch_id: DEMO_BRANCH_1,
        name: "Team Alpha",
        created_at: now,
      },
      {
        id: DEMO_TEAM_BRAVO,
        branch_id: DEMO_BRANCH_1,
        name: "Team Bravo",
        created_at: now,
      },
      {
        id: DEMO_TEAM_NORTE,
        branch_id: DEMO_BRANCH_2,
        name: "Team Norte",
        created_at: now,
      },
      {
        id: DEMO_TEAM_NORTE_B,
        branch_id: DEMO_BRANCH_2,
        name: "Team Norte B",
        created_at: now,
      },
    ])
    .execute();

  await db
    .insertInto("branch_supervisors")
    .values([
      { branch_id: DEMO_BRANCH_1, user_id: DIEGO, created_at: now },
      { branch_id: DEMO_BRANCH_2, user_id: NICOLAS, created_at: now },
      { branch_id: DEMO_BRANCH_2, user_id: MARIANA, created_at: now },
    ])
    .execute();

  await db
    .insertInto("back_office_assignments")
    .values([
      {
        back_office_user_id: JOSEFINA,
        team_id: DEMO_TEAM_ALPHA,
        assigned_at: now,
      },
      {
        back_office_user_id: JOSEFINA,
        team_id: DEMO_TEAM_BRAVO,
        assigned_at: now,
      },
      {
        back_office_user_id: GABRIEL,
        team_id: DEMO_TEAM_NORTE,
        assigned_at: now,
      },
      {
        back_office_user_id: GABRIEL,
        team_id: DEMO_TEAM_NORTE_B,
        assigned_at: now,
      },
    ])
    .execute();

  await db
    .updateTable("users")
    .set({ team_id: DEMO_TEAM_ALPHA })
    .where("id", "in", [CAMILA, MATIAS, LUCIA, ANDRES])
    .execute();
  await db
    .updateTable("users")
    .set({ team_id: DEMO_TEAM_BRAVO })
    .where("id", "in", [CLAUDIA, PABLO, MARINA])
    .execute();
  await db
    .updateTable("users")
    .set({ team_id: DEMO_TEAM_NORTE })
    .where("id", "in", [SOFIA, ELENA])
    .execute();
  await db
    .updateTable("users")
    .set({ team_id: DEMO_TEAM_NORTE_B })
    .where("id", "in", [JOSE])
    .execute();

  await db
    .insertInto("agent_status_logs")
    .values([
      {
        user_id: CAMILA,
        status: "available",
        latitude: -12.046374,
        longitude: -77.042793,
        started_at: new Date(nowMs - 3 * oneHour),
      },
      {
        user_id: MATIAS,
        status: "available",
        latitude: -12.046374,
        longitude: -77.042793,
        started_at: new Date(nowMs - 2 * oneHour),
      },
      {
        user_id: LUCIA,
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
        user_id: VALERIA,
        method: "password",
        stage: "login",
        outcome: "success",
        identifier_hash: "seed_identifier_hash",
        ip_hash: "seed_ip_hash",
        created_at: new Date(nowMs - oneDay),
      },
      {
        user_id: DIEGO,
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
        user_id: ROBERTO,
        secret_encrypted: "seed_dummy_secret",
        is_enabled: true,
        enabled_at: now,
        created_at: now,
        updated_at: now,
      },
    ])
    .execute();

  await db
    .insertInto("user_channel_addresses")
    .values([
      {
        id: stableSeedId("channel-address:valeria:email"),
        user_id: VALERIA,
        channel: "email",
        address: "valeria.paredes@onechannel.pe",
        is_verified: true,
        verified_at: new Date(nowMs - oneDay * 10),
        created_at: new Date(nowMs - oneDay * 10),
        updated_at: new Date(nowMs - oneDay),
      },
      {
        id: stableSeedId("channel-address:valeria:whatsapp"),
        user_id: VALERIA,
        channel: "whatsapp",
        address: "911000001",
        is_verified: true,
        verified_at: new Date(nowMs - oneDay * 10),
        created_at: new Date(nowMs - oneDay * 10),
        updated_at: new Date(nowMs - oneDay),
      },
      {
        id: stableSeedId("channel-address:roberto:email"),
        user_id: ROBERTO,
        channel: "email",
        address: "roberto.quispe@onechannel.pe",
        is_verified: true,
        verified_at: new Date(nowMs - oneDay * 8),
        created_at: new Date(nowMs - oneDay * 8),
        updated_at: new Date(nowMs - oneDay),
      },
      {
        id: stableSeedId("channel-address:roberto:whatsapp"),
        user_id: ROBERTO,
        channel: "whatsapp",
        address: "911000012",
        is_verified: true,
        verified_at: new Date(nowMs - oneDay * 8),
        created_at: new Date(nowMs - oneDay * 8),
        updated_at: new Date(nowMs - oneDay),
      },
    ])
    .execute();

  await db
    .insertInto("notification_opt_outs")
    .values([
      {
        id: stableSeedId("notification-opt-out:roberto:broadcasts:whatsapp"),
        user_id: ROBERTO,
        category: "broadcasts",
        channel: "whatsapp",
        created_at: new Date(nowMs - oneDay * 6),
      },
    ])
    .execute();

  await db
    .insertInto("whatsapp_sessions")
    .values([
      { user_id: VALERIA, expires_at: new Date(nowMs + oneDay) },
      { user_id: ROBERTO, expires_at: new Date(nowMs + oneDay) },
    ])
    .execute();
}

const oneMinute = 60 * 1000;
const oneHour = 60 * oneMinute;
const oneDay = 24 * oneHour;
