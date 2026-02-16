import { db } from "./db";
import { hashPassword } from "../auth/password/password";

export async function seedIfEmpty() {
  const userCount = await db
    .selectFrom("users")
    .select(db.fn.countAll().as("count"))
    .executeTakeFirst();

  if (userCount && Number(userCount.count) > 0) {
    console.log("Database already seeded, skipping...");
    return;
  }

  console.log("Seeding database with initial data...");
  const now = Date.now();

  // Use INSERT OR IGNORE for idempotent seeding
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
        email: "admin@crm.local",
        password_hash: passwordHash,
        full_name: "Admin User",
        role: "admin",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 1,
        email: "supervisor@crm.local",
        password_hash: passwordHash,
        full_name: "Supervisor User",
        role: "supervisor",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 1,
        email: "exec@crm.local",
        password_hash: passwordHash,
        full_name: "Executive User",
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 1,
        email: "backoffice@crm.local",
        password_hash: passwordHash,
        full_name: "Back-Office User",
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
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

  const today = new Date().toISOString().split("T")[0];
  await db
    .insertInto("quota_allocations")
    .values({
      user_id: 3,
      allocated_by_user_id: 2,
      date: today,
      quota_amount: 50,
      used_amount: 0,
      created_at: now,
    })
    .onConflict((oc) => oc.doNothing())
    .execute();

  // ── Organizations ──
  await db
    .insertInto("organizations")
    .values([
      {
        ruc: "20100047218",
        name: "Telefónica del Perú S.A.A.",
        created_at: now,
      },
      { ruc: "20505677853", name: "Grupo AJE S.A.", created_at: now },
      { ruc: "20100128056", name: "Alicorp S.A.A.", created_at: now },
      { ruc: "20100055237", name: "Credicorp Ltd.", created_at: now },
      {
        ruc: "20100130204",
        name: "Minera Buenaventura S.A.A.",
        created_at: now,
      },
      {
        ruc: "20384577831",
        name: "Constructora Sur del Perú S.A.C.",
        created_at: now,
      },
      { ruc: "20600188214", name: "Retail Andino S.R.L.", created_at: now },
      {
        ruc: "20566100911",
        name: "Servicios Financieros del Norte S.A.",
        created_at: now,
      },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

  // ── Contacts ──
  await db
    .insertInto("contacts")
    .values([
      {
        organization_id: 1,
        dni: "45821736",
        name: "Carlos Mendoza Ríos",
        phone_primary: "+51 987 654 321",
        created_at: now,
      },
      {
        organization_id: 1,
        dni: "71234567",
        name: "María Fernández López",
        phone_primary: "+51 912 345 678",
        created_at: now,
      },
      {
        organization_id: 2,
        dni: "43567890",
        name: "Jorge Castillo Vega",
        phone_primary: "+51 998 765 432",
        created_at: now,
      },
      {
        organization_id: 2,
        dni: "40123456",
        name: "Ana Lucía Torres",
        phone_primary: "+51 945 678 901",
        created_at: now,
      },
      {
        organization_id: 3,
        dni: "46789012",
        name: "Pedro Quispe Huamán",
        phone_primary: "+51 934 567 890",
        created_at: now,
      },
      {
        organization_id: 3,
        dni: "48901234",
        name: "Rosa Vilca Mamani",
        phone_primary: null,
        created_at: now,
      },
      {
        organization_id: 4,
        dni: "72345678",
        name: "Diego Salazar Paredes",
        phone_primary: "+51 976 543 210",
        created_at: now,
      },
      {
        organization_id: 4,
        dni: "44567891",
        name: "Lucía Ramírez García",
        phone_primary: "+51 923 456 789",
        created_at: now,
      },
      {
        organization_id: 5,
        dni: "47890123",
        name: "Fernando Huanca Condori",
        phone_primary: "+51 965 432 109",
        created_at: now,
      },
      {
        organization_id: 5,
        dni: "41234568",
        name: "Sofía Espinoza Cruz",
        phone_primary: "+51 954 321 098",
        created_at: now,
      },
      {
        organization_id: 1,
        dni: "73456789",
        name: "Miguel Ángel Rojas",
        phone_primary: "+51 943 210 987",
        created_at: now,
      },
      {
        organization_id: 3,
        dni: "42345679",
        name: "Carmen Flores Díaz",
        phone_primary: "+51 932 109 876",
        created_at: now,
      },
      {
        organization_id: 6,
        dni: "41900452",
        name: "Alberto Yauri Flores",
        phone_primary: "+51 988 000 111",
        created_at: now,
      },
      {
        organization_id: 6,
        dni: "42234009",
        name: "Diana Cáceres Lazo",
        phone_primary: "+51 988 000 112",
        created_at: now,
      },
      {
        organization_id: 7,
        dni: "70654312",
        name: "José Luis Huamán",
        phone_primary: "+51 988 000 113",
        created_at: now,
      },
      {
        organization_id: 8,
        dni: "49123407",
        name: "Luisa Acurio Pérez",
        phone_primary: "+51 988 000 114",
        created_at: now,
      },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

  // ── Additional Users & Teams ──
  await db
    .insertInto("users")
    .values([
      {
        branch_id: 1,
        team_id: 1,
        email: "exec2@crm.local",
        password_hash: passwordHash,
        full_name: "Patricia Navarro",
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 1,
        team_id: 1,
        email: "exec3@crm.local",
        password_hash: passwordHash,
        full_name: "Roberto Díaz Luna",
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 1,
        email: "logistics@crm.local",
        password_hash: passwordHash,
        full_name: "Sandra Morales",
        role: "logistics",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 2,
        email: "north-supervisor@crm.local",
        password_hash: passwordHash,
        full_name: "North Supervisor",
        role: "supervisor",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 2,
        email: "north-exec@crm.local",
        password_hash: passwordHash,
        full_name: "North Executive",
        role: "executive",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 2,
        email: "north-backoffice@crm.local",
        password_hash: passwordHash,
        full_name: "North Back-Office",
        role: "back_office",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 2,
        email: "north-logistics@crm.local",
        password_hash: passwordHash,
        full_name: "North Logistics",
        role: "logistics",
        is_active: 1,
        created_at: now,
      },
      {
        branch_id: 1,
        email: "manager@crm.local",
        password_hash: passwordHash,
        full_name: "Sales Manager Lima",
        role: "sales_manager",
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
      { branch_id: 2, name: "Team Norte B", supervisor_id: 8, created_at: now },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();
  await db
    .updateTable("users")
    .set({ team_id: 3 })
    .where("id", "=", 9)
    .execute();

  // ── Lead Assignments for executive user (id=3) ──
  const oneDay = 86400000;
  const sevenDays = oneDay * 7;
  await db
    .insertInto("lead_assignments")
    .values([
      {
        user_id: 3,
        contact_id: 1,
        assigned_at: now - oneDay * 2,
        expires_at: now + sevenDays,
        status: "active",
      },
      {
        user_id: 3,
        contact_id: 3,
        assigned_at: now - oneDay,
        expires_at: now + sevenDays,
        status: "active",
      },
      {
        user_id: 3,
        contact_id: 5,
        assigned_at: now,
        expires_at: now + sevenDays,
        status: "active",
      },
      {
        user_id: 3,
        contact_id: 7,
        assigned_at: now,
        expires_at: now + sevenDays,
        status: "active",
      },
      {
        user_id: 3,
        contact_id: 9,
        assigned_at: now - oneDay * 3,
        expires_at: now + sevenDays,
        status: "active",
      },
      {
        user_id: 5,
        contact_id: 2,
        assigned_at: now,
        expires_at: now + sevenDays,
        status: "active",
      },
      {
        user_id: 5,
        contact_id: 4,
        assigned_at: now - oneDay,
        expires_at: now + sevenDays,
        status: "active",
      },
      {
        user_id: 3,
        contact_id: 11,
        assigned_at: now - oneDay * 10,
        expires_at: now - oneDay,
        status: "completed",
      },
      {
        user_id: 9,
        contact_id: 13,
        assigned_at: now,
        expires_at: now + sevenDays,
        status: "active",
      },
      {
        user_id: 9,
        contact_id: 14,
        assigned_at: now - oneDay,
        expires_at: now + sevenDays,
        status: "active",
      },
      {
        user_id: 9,
        contact_id: 15,
        assigned_at: now - oneDay * 2,
        expires_at: now + sevenDays,
        status: "active",
      },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

  // ── Charge Notes (Sales) ──
  await db
    .insertInto("charge_notes")
    .values([
      {
        contact_id: 1,
        user_id: 3,
        status: "draft",
        created_at: now - oneDay * 2,
        updated_at: now - oneDay,
      },
      {
        contact_id: 3,
        user_id: 3,
        status: "pending_review",
        created_at: now - oneDay,
        updated_at: now - oneDay,
      },
      {
        contact_id: 11,
        user_id: 3,
        status: "approved",
        exec_code_real: "EX-2026-001",
        created_at: now - oneDay * 5,
        updated_at: now - oneDay * 3,
      },
      {
        contact_id: 2,
        user_id: 5,
        status: "pending_review",
        created_at: now - oneDay * 2,
        updated_at: now - oneDay * 2,
      },
      {
        contact_id: 13,
        user_id: 9,
        status: "draft",
        created_at: now - oneDay,
        updated_at: now - oneDay,
      },
      {
        contact_id: 14,
        user_id: 9,
        status: "rejected",
        created_at: now - oneDay * 4,
        updated_at: now - oneDay * 2,
      },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

  // ── Charge Note Items ──
  await db
    .insertInto("charge_note_items")
    .values([
      { charge_note_id: 1, product_id: 1, quantity: 1 },
      { charge_note_id: 2, product_id: 3, quantity: 1 },
      { charge_note_id: 3, product_id: 2, quantity: 1 },
      { charge_note_id: 3, product_id: 1, quantity: 2 },
      { charge_note_id: 4, product_id: 1, quantity: 1 },
      { charge_note_id: 5, product_id: 2, quantity: 1 },
      { charge_note_id: 6, product_id: 1, quantity: 1 },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

  // ── Inventory Items ──
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
    .insertInto("inventory_locks")
    .values([
      {
        inventory_item_id: 3,
        charge_note_id: 2,
        locked_at: now - oneDay,
        expires_at: now + oneDay,
      },
      {
        inventory_item_id: 11,
        charge_note_id: 6,
        locked_at: now - oneDay,
        expires_at: now + oneDay,
      },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

  await db
    .insertInto("document_attachments")
    .values([
      {
        charge_note_id: 2,
        filename: "dni-frente.pdf",
        filepath: "uploads/manual/2/dni-frente.pdf",
        mimetype: "application/pdf",
        size: 180_000,
        version: 1,
        created_at: now - oneDay,
      },
      {
        charge_note_id: 6,
        filename: "voucher.png",
        filepath: "uploads/manual/6/voucher.png",
        mimetype: "image/png",
        size: 120_000,
        version: 1,
        created_at: now - oneDay,
      },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

  // ── Interaction Logs ──
  await db
    .insertInto("interaction_logs")
    .values([
      {
        contact_id: 1,
        user_id: 3,
        outcome: "Interested in Duo plan",
        notes: "Client requested callback",
        duration_seconds: 180,
        created_at: now - oneDay * 2,
      },
      {
        contact_id: 3,
        user_id: 3,
        outcome: "No answer",
        notes: null,
        duration_seconds: null,
        created_at: now - oneDay,
      },
      {
        contact_id: 5,
        user_id: 3,
        outcome: "Scheduled meeting",
        notes: "Meeting at office next Monday 10am",
        duration_seconds: 240,
        created_at: now,
      },
      {
        contact_id: 13,
        user_id: 9,
        outcome: "Pending confirmation",
        notes: "Requested technical fact sheet",
        duration_seconds: 210,
        created_at: now - oneDay,
      },
      {
        contact_id: 14,
        user_id: 9,
        outcome: "Rejected by back office",
        notes: "Need clearer DNI image",
        duration_seconds: 180,
        created_at: now - oneDay * 2,
      },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

  // ── Lock some orgs to branch ──
  await db
    .updateTable("organizations")
    .set({ locked_branch_id: 1, locked_at: now, locked_by_user_id: 3 })
    .where("id", "in", [1, 2, 3])
    .execute();
  await db
    .updateTable("organizations")
    .set({ locked_branch_id: 2, locked_at: now, locked_by_user_id: 9 })
    .where("id", "in", [6, 8])
    .execute();

  await db
    .insertInto("quota_allocations")
    .values({
      user_id: 9,
      allocated_by_user_id: 8,
      date: today,
      quota_amount: 40,
      used_amount: 3,
      created_at: now,
    })
    .onConflict((oc) => oc.doNothing())
    .execute();

  console.log("Database seeding complete.");
}

async function seed() {
  try {
    await seedIfEmpty();
    process.exit(0);
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  }
}

if (import.meta.main) {
  void seed();
}
