import type { Kysely } from "kysely";

import { hashPassword } from "../../auth/password/password";
import type { Database } from "../types";

export async function run(db: Kysely<Database>): Promise<void> {
  const now = Date.now();

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

  const passwordHash = await hashPassword("placeholder");
  const realPasswordHash = await hashPassword("infinitypay");

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

  // Demo users (IDs 1-20)
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
      {
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

  // Teams
  await db
    .insertInto("teams")
    .values([
      { branch_id: 1, name: "Team Alpha", created_at: now }, // id: 1
      { branch_id: 1, name: "Team Bravo", created_at: now }, // id: 2
      { branch_id: 2, name: "Team Norte", created_at: now }, // id: 3
      {
        branch_id: 2,
        name: "Team Norte B",
        created_at: now,
      }, // id: 4
      {
        branch_id: 4,
        name: "Infinity Lima",
        created_at: now,
      }, // id: 5
      {
        branch_id: 4,
        name: "Infinity Chiclayo",
        created_at: now,
      }, // id: 6
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
      { branch_id: 4, user_id: 23, created_at: now }, // Luis Betalleluz @ branch 4
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

  // Back Office Assignments
  await db
    .insertInto("back_office_assignments")
    .values([
      { back_office_user_id: 4, team_id: 1, assigned_at: now }, // Josefina Salazar @ team 1
      { back_office_user_id: 4, team_id: 2, assigned_at: now }, // Josefina Salazar @ team 2
      { back_office_user_id: 30, team_id: 5, assigned_at: now }, // Jose Mendoza @ team 5
      { back_office_user_id: 30, team_id: 6, assigned_at: now }, // Jose Mendoza @ team 6
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

  // Real team assignments
  // Lima executives (team 5)
  await db
    .updateTable("users")
    .set({ team_id: 5 })
    .where("id", "in", [21, 22, 24, 25, 26, 27, 28, 31, 37, 39])
    .execute();

  // Chiclayo executives (team 6)
  await db
    .updateTable("users")
    .set({ team_id: 6 })
    .where("id", "in", [32, 33, 34, 35, 36, 38])
    .execute();

  // Note: (23), (29), (30) remain with team_id: null (branch-scoped).

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
}

const oneMinute = 60 * 1000;
const oneHour = 60 * oneMinute;
const oneDay = 24 * oneHour;
